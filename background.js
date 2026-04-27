const PERPLEXITY_API_URL = "https://api.perplexity.ai/v1/sonar";
const GEMINI_API_BASE   = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL      = "gemini-2.5-flash";
const OPENAI_API_URL    = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL      = "gpt-4o-mini";
const MAX_TEXT_LENGTH   = 48000;
const MAX_CHAT_CONTEXT  = 30000;

// ─── Side Panel: keep popup as default action (don't auto-open panel) ────────

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch(() => {});

// ─── Keyboard shortcut ────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-translator") {
    chrome.action.openPopup().catch(() => {
      // openPopup may fail if not triggered by user gesture; ignore
    });
  }
});

// ─── Regular messages (non-streaming) ────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("🔵 Background received message:", message.action, "provider:", message.provider);
  
  if (message.action === "translate" || message.action === "summarize" || message.action === "phishing" || message.action === "youtube") {
    handleRequest(message.action, message.text, message.targetLang, message.promptTemplate, message.provider)
      .then((result) => {
        console.log("✅ Request successful:", message.action);
        sendResponse({ success: true, result });
      })
      .catch((err) => {
        console.error("❌ Request failed:", message.action, err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (message.action === "chat") {
    handleChat(message.context, message.messages)
      .then((result) => {
        console.log("✅ Chat successful");
        sendResponse({ success: true, result });
      })
      .catch((err) => {
        console.error("❌ Chat failed:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (message.action === "getPdfText") {
    extractPdfText(message.url)
      .then((text) => sendResponse({ text }))
      .catch(() => sendResponse({ text: null }));
    return true;
  }
});

// ─── PDF text extraction ──────────────────────────────────────────────────────

async function extractPdfText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("PDF fetch failed");

  const buf   = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const raw   = new TextDecoder("latin1").decode(bytes);

  let text = "";

  // Extract text from parenthesis-encoded strings (Tj / TJ operators)
  const tjRe  = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
  const tjArr = /\[([^\]]+)\]\s*TJ/g;

  for (const m of raw.matchAll(tjRe)) {
    text += m[1].replace(/\\n/g, "\n").replace(/\\\(/g, "(").replace(/\\\)/g, ")") + " ";
  }
  for (const m of raw.matchAll(tjArr)) {
    const chunk = m[1].replace(/\(([^)]*)\)/g, "$1").replace(/[-\d.]+/g, " ");
    text += chunk + " ";
  }

  // Clean up and return (limit to MAX_TEXT_LENGTH)
  return text.replace(/\s{2,}/g, " ").trim().slice(0, 48000) || null;
}

// ─── Streaming via ports ──────────────────────────────────────────────────────

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ai-stream") return;

  port.onMessage.addListener(async (msg) => {
    // Use provider from message, fallback to storage
    const provider = msg.provider || (await chrome.storage.local.get(["provider"])).provider || "perplexity";
    const storage = await chrome.storage.local.get(["perplexityKey", "geminiKey", "openaiKey"]);
    
    console.log("🌊 Streaming request:", msg.action, "with provider:", provider);

    try {
      if (provider === "gemini") {
        await streamGemini(storage.geminiKey, msg, port);
      } else if (provider === "openai") {
        await streamOpenAI(storage.openaiKey, msg, port);
      } else {
        await streamPerplexity(storage.perplexityKey, msg, port);
      }
    } catch (err) {
      console.error("❌ Streaming error:", err);
      port.postMessage({ error: err.message });
    }
  });
});

// ─── Translate / Summarize (non-streaming) ────────────────────────────────────

async function handleRequest(action, text, targetLang = "he", promptTemplate = "default", provider = null) {
  const storage = await chrome.storage.local.get(["provider", "perplexityKey", "geminiKey", "openaiKey"]);
  // Use provided provider or fallback to storage
  const selectedProvider = provider || storage.provider || "perplexity";
  const truncatedText = text.slice(0, MAX_TEXT_LENGTH);

  console.log("🔧 handleRequest:", { action, provider: selectedProvider, targetLang, promptTemplate, textLength: truncatedText.length });
  console.log("🔑 API Keys status:", {
    perplexity: storage.perplexityKey ? "✓" : "✗",
    gemini: storage.geminiKey ? "✓" : "✗",
    openai: storage.openaiKey ? "✓" : "✗",
  });

  // Language names mapping
  const langNames = {
    he: "עברית (Hebrew)",
    en: "English",
    es: "Español (Spanish)",
    fr: "Français (French)",
    de: "Deutsch (German)",
    it: "Italiano (Italian)",
    pt: "Português (Portuguese)",
    ru: "Русский (Russian)",
    ar: "العربية (Arabic)",
    zh: "中文 (Chinese)",
    ja: "日本語 (Japanese)",
  };

  const targetLangName = langNames[targetLang] || langNames.he;

  // Professional role templates
  const rolePrompts = {
    cyber: "You are an expert cybersecurity researcher. Analyze content with a focus on security implications, vulnerabilities, threats, and technical details.",
    finance: "You are an experienced financial analyst and market researcher. Analyze content focusing on market trends, financial data, economic indicators, and investment insights.",
    realestate: "You are a professional real estate expert. Analyze content with focus on property details, market conditions, location analysis, and investment potential.",
    legal: "You are an experienced lawyer. Analyze content focusing on legal implications, regulations, compliance issues, and rights.",
    medical: "You are a medical doctor. Analyze content with medical perspective, focusing on health information, treatments, and clinical details.",
    tech: "You are a senior software engineer. Analyze content with technical depth, focusing on architecture, implementation, and best practices.",
    marketing: "You are a marketing expert. Analyze content focusing on market positioning, audience engagement, and business strategy.",
  };

  let systemPrompt;
  
  if (action === "phishing") {
    systemPrompt = `You are a professional security analyst. Perform a comprehensive phishing analysis of this webpage.

The text includes [SSL INFO] section with URL and HTTPS status.

Analyze these security indicators:
1. SSL/HTTPS - Connection security, certificate validity
2. Domain Analysis - Typosquatting, suspicious TLD, brand impersonation
3. Content Analysis - Urgency tactics, sensitive data requests, grammar errors
4. Visual/Brand - Logo accuracy, design quality, professional appearance

Output in Hebrew only, use this exact format:

🛡️ ניתוח אבטחה

🎯 מסקנה: [✅ בטוח / ⚠️ חשוד / 🚨 פישינג!]

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
[✅/⚠️/❌] [detailed status and findings]

🌐 דומיין:
[✅/⚠️/🚨] [domain analysis with specific concerns]

📄 תוכן:
[✅/⚠️/🚨] [content analysis findings]

🎨 מיתוג ועיצוב:
[✅/⚠️/🚨] [visual/branding assessment]

💡 המלצה והסבר:
[detailed recommendation and reasoning]

Example - Safe site:
🛡️ ניתוח אבטחה

🎯 מסקנה: ✅ בטוח

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
✅ תקין - חיבור HTTPS מאובטח עם תעודת SSL תקפה מרשות אמינה

🌐 דומיין:
✅ google.com - דומיין רשמי ומאומת, ללא סימני זיוף

📄 תוכן:
✅ לגיטימי - תוכן מקצועי ללא בקשות חשודות למידע רגיש

🎨 מיתוג ועיצוב:
✅ מקורי - לוגו ועיצוב רשמיים של גוגל

💡 המלצה והסבר:
המשך לגלוש בביטחון. זהו אתר לגיטימי עם כל האינדיקטורים הנכונים לאבטחה.

Now analyze thoroughly in Hebrew. Be detailed and specific.`;
  } else if (action === "youtube") {
    systemPrompt = `You are an expert video content analyzer. You will receive a YouTube video transcript with timestamps in the format [MM:SS] text.

Your task:
1. Summarize the video in ${targetLangName}
2. Extract key points with their timestamps
3. Identify main topics and themes
4. Provide a concise conclusion

Output in ${targetLangName} only, use this exact format:

🎬 סיכום סרטון YouTube

📌 נקודות עיקריות:
• [MM:SS] נקודה ראשונה...
• [MM:SS] נקודה שנייה...
• [MM:SS] נקודה שלישית...
(5-10 key points with timestamps)

🎯 נושאים מרכזיים:
• נושא 1
• נושא 2
• נושא 3

💡 מסקנה:
[Brief overall summary in 2-3 sentences]

Be concise and focus on the most important information.`;
  } else if (action === "translate") {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] 
      ? rolePrompts[promptTemplate] + "\n\n" 
      : "";
    systemPrompt = `${rolePrefix}You are a professional translator. Translate the following text to ${targetLangName}. Maintain the original meaning, style, and tone. Return only the translation without additional explanations.`;
  } else {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] 
      ? rolePrompts[promptTemplate] + "\n\n" 
      : "";
    systemPrompt = `${rolePrefix}You are an expert summarizer. Summarize the following text in ${targetLangName} in a concise, clear, and comprehensive manner. Highlight the main points. Start with the heading 'סיכום:' (Summary:) and organize the points with bullet points.`;
  }

  if (selectedProvider === "gemini") return callGemini(storage.geminiKey, systemPrompt, truncatedText, action);
  if (selectedProvider === "openai") return callOpenAI(storage.openaiKey, systemPrompt, truncatedText, action);
  return callPerplexity(storage.perplexityKey, systemPrompt, truncatedText, action);
}

// ─── Chat (non-streaming) ─────────────────────────────────────────────────────

async function handleChat(context, messages) {
  const storage = await chrome.storage.local.get(["provider", "perplexityKey", "geminiKey", "openaiKey"]);
  const provider = storage.provider || "perplexity";

  const systemPrompt =
    `אתה עוזר חכם שעונה על שאלות בעברית בלבד.\n` +
    `ענה על שאלות המשתמש בהתבסס על התוכן הבא:\n\n---\n` +
    `${context.slice(0, MAX_CHAT_CONTEXT)}\n---\n\n` +
    `אם השאלה אינה קשורה לתוכן, ציין זאת בנימוס וענה אם ביכולתך.`;

  if (provider === "gemini") return callGeminiChat(storage.geminiKey, systemPrompt, messages);
  if (provider === "openai") return callOpenAIChat(storage.openaiKey, systemPrompt, messages);
  return callPerplexityChat(storage.perplexityKey, systemPrompt, messages);
}

// ─── Perplexity – non-streaming ───────────────────────────────────────────────

async function callPerplexity(apiKey, systemPrompt, text, action) {
  if (!apiKey) throw new Error("מפתח Perplexity לא הוגדר.");

  const body = {
    model: "sonar",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
    language_preference: "he",
    disable_search: true,
    max_tokens: action === "youtube" ? 4096 : (action === "phishing" ? 9000 : (action === "translate" ? 8192 : 4096)),
    temperature: 0.3,
  };

  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת Perplexity ${res.status}`);
  }
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

async function callPerplexityChat(apiKey, systemPrompt, messages) {
  if (!apiKey) throw new Error("מפתח Perplexity לא הוגדר.");

  const body = {
    model: "sonar",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    language_preference: "he",
    disable_search: true,
    max_tokens: 8192,
    temperature: 0.5,
  };

  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת Perplexity ${res.status}`);
  }
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

// ─── Perplexity – streaming ───────────────────────────────────────────────────

async function streamPerplexity(apiKey, msg, port) {
  if (!apiKey) throw new Error("מפתח Perplexity לא הוגדר.");

  const { action, text, targetLang = "he", promptTemplate = "default" } = msg;
  
  const langNames = {
    he: "עברית (Hebrew)",
    en: "English",
    es: "Español (Spanish)",
    fr: "Français (French)",
    de: "Deutsch (German)",
    it: "Italiano (Italian)",
    pt: "Português (Portuguese)",
    ru: "Русский (Russian)",
    ar: "العربية (Arabic)",
    zh: "中文 (Chinese)",
    ja: "日本語 (Japanese)",
  };
  
  const targetLangName = langNames[targetLang] || langNames.he;
  
  const rolePrompts = {
    cyber: "You are an expert cybersecurity researcher. Analyze content with a security-first perspective.",
    finance: "You are an experienced financial analyst. Focus on market trends and financial insights.",
    realestate: "You are a professional real estate expert. Focus on property and market analysis.",
    legal: "You are an experienced lawyer. Focus on legal implications and regulations.",
    medical: "You are a medical doctor. Analyze with medical perspective.",
    tech: "You are a senior software engineer. Focus on technical details.",
    marketing: "You are a marketing expert. Focus on strategy and audience engagement.",
  };
  
  let systemPrompt;
  if (action === "phishing") {
    systemPrompt = `You are a professional security analyst. Perform a comprehensive phishing analysis of this webpage.

The text includes [SSL INFO] section with URL and HTTPS status.

Analyze these security indicators:
1. SSL/HTTPS - Connection security, certificate validity
2. Domain Analysis - Typosquatting, suspicious TLD, brand impersonation
3. Content Analysis - Urgency tactics, sensitive data requests, grammar errors
4. Visual/Brand - Logo accuracy, design quality, professional appearance

Output in Hebrew only, use this exact format:

🛡️ ניתוח אבטחה

🎯 מסקנה: [✅ בטוח / ⚠️ חשוד / 🚨 פישינג!]

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
[✅/⚠️/❌] [detailed status and findings]

🌐 דומיין:
[✅/⚠️/🚨] [domain analysis with specific concerns]

📄 תוכן:
[✅/⚠️/🚨] [content analysis findings]

🎨 מיתוג ועיצוב:
[✅/⚠️/🚨] [visual/branding assessment]

💡 המלצה והסבר:
[detailed recommendation and reasoning]

Example - Safe site:
🛡️ ניתוח אבטחה

🎯 מסקנה: ✅ בטוח

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
✅ תקין - חיבור HTTPS מאובטח עם תעודת SSL תקפה מרשות אמינה

🌐 דומיין:
✅ google.com - דומיין רשמי ומאומת, ללא סימני זיוף

📄 תוכן:
✅ לגיטימי - תוכן מקצועי ללא בקשות חשודות למידע רגיש

🎨 מיתוג ועיצוב:
✅ מקורי - לוגו ועיצוב רשמיים של גוגל

💡 המלצה והסבר:
המשך לגלוש בביטחון. זהו אתר לגיטימי עם כל האינדיקטורים הנכונים לאבטחה.

Now analyze thoroughly in Hebrew. Be detailed and specific.`;
  } else if (action === "youtube") {
    systemPrompt = `You are an expert video content analyzer. You will receive a YouTube video transcript with timestamps in the format [MM:SS] text.

Your task:
1. Summarize the video in ${targetLangName}
2. Extract key points with their timestamps
3. Identify main topics and themes
4. Provide a concise conclusion

Output in ${targetLangName} only, use this exact format:

🎬 סיכום סרטון YouTube

📌 נקודות עיקריות:
• [MM:SS] נקודה ראשונה...
• [MM:SS] נקודה שנייה...
• [MM:SS] נקודה שלישית...
(5-10 key points with timestamps)

🎯 נושאים מרכזיים:
• נושא 1
• נושא 2
• נושא 3

💡 מסקנה:
[Brief overall summary in 2-3 sentences]

Be concise and focus on the most important information.`;
  } else if (action === "translate") {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] ? rolePrompts[promptTemplate] + "\n\n" : "";
    systemPrompt = `${rolePrefix}You are a professional translator. Translate the following text to ${targetLangName}. Return only the translation.`;
  } else {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] ? rolePrompts[promptTemplate] + "\n\n" : "";
    systemPrompt = `${rolePrefix}You are an expert summarizer. Summarize the following text in ${targetLangName} with bullet points.`;
  }

  const body = {
    model: "sonar",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text.slice(0, MAX_TEXT_LENGTH) }],
    language_preference: "he",
    disable_search: true,
    max_tokens: action === "youtube" ? 4096 : (action === "phishing" ? 9000 : (action === "translate" ? 8192 : 4096)),
    temperature: 0.3,
    stream: true,
  };

  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת Perplexity ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") { port.postMessage({ done: true }); return; }
      try {
        const json = JSON.parse(data);
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) port.postMessage({ chunk });
      } catch (_) {}
    }
  }
  port.postMessage({ done: true });
}

// ─── Gemini – non-streaming ───────────────────────────────────────────────────

async function callGemini(apiKey, systemPrompt, text, action) {
  if (!apiKey) throw new Error("מפתח Gemini לא הוגדר.");

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      maxOutputTokens: action === "youtube" ? 4096 : (action === "phishing" ? 9000 : (action === "translate" ? 8192 : 4096)),
      temperature: 0.3
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת Gemini ${res.status}`);
  }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callGeminiChat(apiKey, systemPrompt, messages) {
  if (!apiKey) throw new Error("מפתח Gemini לא הוגדר.");

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 8192, temperature: 0.5 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת Gemini ${res.status}`);
  }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── OpenAI (ChatGPT) – non-streaming ────────────────────────────────────────

async function callOpenAI(apiKey, systemPrompt, text, action) {
  if (!apiKey) throw new Error("מפתח OpenAI לא הוגדר.");

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
      max_tokens: action === "youtube" ? 4096 : (action === "phishing" ? 9000 : (action === "translate" ? 8192 : 4096)),
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת OpenAI ${res.status}`);
  }
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

async function callOpenAIChat(apiKey, systemPrompt, messages) {
  if (!apiKey) throw new Error("מפתח OpenAI לא הוגדר.");

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 8192,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת OpenAI ${res.status}`);
  }
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

// ─── OpenAI – streaming ───────────────────────────────────────────────────────

async function streamOpenAI(apiKey, msg, port) {
  if (!apiKey) throw new Error("מפתח OpenAI לא הוגדר.");

  const { action, text, targetLang = "he", promptTemplate = "default" } = msg;
  
  const langNames = {
    he: "עברית (Hebrew)",
    en: "English",
    es: "Español (Spanish)",
    fr: "Français (French)",
    de: "Deutsch (German)",
    it: "Italiano (Italian)",
    pt: "Português (Portuguese)",
    ru: "Русский (Russian)",
    ar: "العربية (Arabic)",
    zh: "中文 (Chinese)",
    ja: "日本語 (Japanese)",
  };
  
  const targetLangName = langNames[targetLang] || langNames.he;
  
  const rolePrompts = {
    cyber: "You are an expert cybersecurity researcher. Analyze content with a security-first perspective.",
    finance: "You are an experienced financial analyst. Focus on market trends and financial insights.",
    realestate: "You are a professional real estate expert. Focus on property and market analysis.",
    legal: "You are an experienced lawyer. Focus on legal implications and regulations.",
    medical: "You are a medical doctor. Analyze with medical perspective.",
    tech: "You are a senior software engineer. Focus on technical details.",
    marketing: "You are a marketing expert. Focus on strategy and audience engagement.",
  };
  
  let systemPrompt;
  if (action === "phishing") {
    systemPrompt = `You are a professional security analyst. Perform a comprehensive phishing analysis of this webpage.

The text includes [SSL INFO] section with URL and HTTPS status.

Analyze these security indicators:
1. SSL/HTTPS - Connection security, certificate validity
2. Domain Analysis - Typosquatting, suspicious TLD, brand impersonation
3. Content Analysis - Urgency tactics, sensitive data requests, grammar errors
4. Visual/Brand - Logo accuracy, design quality, professional appearance

Output in Hebrew only, use this exact format:

🛡️ ניתוח אבטחה

🎯 מסקנה: [✅ בטוח / ⚠️ חשוד / 🚨 פישינג!]

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
[✅/⚠️/❌] [detailed status and findings]

🌐 דומיין:
[✅/⚠️/🚨] [domain analysis with specific concerns]

📄 תוכן:
[✅/⚠️/🚨] [content analysis findings]

🎨 מיתוג ועיצוב:
[✅/⚠️/🚨] [visual/branding assessment]

💡 המלצה והסבר:
[detailed recommendation and reasoning]

Example - Safe site:
🛡️ ניתוח אבטחה

🎯 מסקנה: ✅ בטוח

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
✅ תקין - חיבור HTTPS מאובטח עם תעודת SSL תקפה מרשות אמינה

🌐 דומיין:
✅ google.com - דומיין רשמי ומאומת, ללא סימני זיוף

📄 תוכן:
✅ לגיטימי - תוכן מקצועי ללא בקשות חשודות למידע רגיש

🎨 מיתוג ועיצוב:
✅ מקורי - לוגו ועיצוב רשמיים של גוגל

💡 המלצה והסבר:
המשך לגלוש בביטחון. זהו אתר לגיטימי עם כל האינדיקטורים הנכונים לאבטחה.

Now analyze thoroughly in Hebrew. Be detailed and specific.`;
  } else if (action === "youtube") {
    systemPrompt = `You are an expert video content analyzer. You will receive a YouTube video transcript with timestamps in the format [MM:SS] text.

Your task:
1. Summarize the video in ${targetLangName}
2. Extract key points with their timestamps
3. Identify main topics and themes
4. Provide a concise conclusion

Output in ${targetLangName} only, use this exact format:

🎬 סיכום סרטון YouTube

📌 נקודות עיקריות:
• [MM:SS] נקודה ראשונה...
• [MM:SS] נקודה שנייה...
• [MM:SS] נקודה שלישית...
(5-10 key points with timestamps)

🎯 נושאים מרכזיים:
• נושא 1
• נושא 2
• נושא 3

💡 מסקנה:
[Brief overall summary in 2-3 sentences]

Be concise and focus on the most important information.`;
  } else if (action === "translate") {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] ? rolePrompts[promptTemplate] + "\n\n" : "";
    systemPrompt = `${rolePrefix}You are a professional translator. Translate the following text to ${targetLangName}. Return only the translation.`;
  } else {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] ? rolePrompts[promptTemplate] + "\n\n" : "";
    systemPrompt = `${rolePrefix}You are an expert summarizer. Summarize the following text in ${targetLangName} with bullet points.`;
  }

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text.slice(0, MAX_TEXT_LENGTH) }],
      max_tokens: action === "youtube" ? 4096 : (action === "phishing" ? 9000 : (action === "translate" ? 8192 : 4096)),
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת OpenAI ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") { port.postMessage({ done: true }); return; }
      try {
        const json = JSON.parse(data);
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) port.postMessage({ chunk });
      } catch (_) {}
    }
  }
  port.postMessage({ done: true });
}

// ─── Gemini – streaming ───────────────────────────────────────────────────────

async function streamGemini(apiKey, msg, port) {
  if (!apiKey) throw new Error("מפתח Gemini לא הוגדר.");

  const { action, text, targetLang = "he", promptTemplate = "default" } = msg;
  
  const langNames = {
    he: "עברית (Hebrew)",
    en: "English",
    es: "Español (Spanish)",
    fr: "Français (French)",
    de: "Deutsch (German)",
    it: "Italiano (Italian)",
    pt: "Português (Portuguese)",
    ru: "Русский (Russian)",
    ar: "العربية (Arabic)",
    zh: "中文 (Chinese)",
    ja: "日本語 (Japanese)",
  };
  
  const targetLangName = langNames[targetLang] || langNames.he;
  
  const rolePrompts = {
    cyber: "You are an expert cybersecurity researcher. Analyze content with a security-first perspective.",
    finance: "You are an experienced financial analyst. Focus on market trends and financial insights.",
    realestate: "You are a professional real estate expert. Focus on property and market analysis.",
    legal: "You are an experienced lawyer. Focus on legal implications and regulations.",
    medical: "You are a medical doctor. Analyze with medical perspective.",
    tech: "You are a senior software engineer. Focus on technical details.",
    marketing: "You are a marketing expert. Focus on strategy and audience engagement.",
  };
  
  let systemPrompt;
  if (action === "phishing") {
    systemPrompt = `You are a professional security analyst. Perform a comprehensive phishing analysis of this webpage.

The text includes [SSL INFO] section with URL and HTTPS status.

Analyze these security indicators:
1. SSL/HTTPS - Connection security, certificate validity
2. Domain Analysis - Typosquatting, suspicious TLD, brand impersonation
3. Content Analysis - Urgency tactics, sensitive data requests, grammar errors
4. Visual/Brand - Logo accuracy, design quality, professional appearance

Output in Hebrew only, use this exact format:

🛡️ ניתוח אבטחה

🎯 מסקנה: [✅ בטוח / ⚠️ חשוד / 🚨 פישינג!]

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
[✅/⚠️/❌] [detailed status and findings]

🌐 דומיין:
[✅/⚠️/🚨] [domain analysis with specific concerns]

📄 תוכן:
[✅/⚠️/🚨] [content analysis findings]

🎨 מיתוג ועיצוב:
[✅/⚠️/🚨] [visual/branding assessment]

💡 המלצה והסבר:
[detailed recommendation and reasoning]

Example - Safe site:
🛡️ ניתוח אבטחה

🎯 מסקנה: ✅ בטוח

📊 ממצאים מפורטים:

🔒 SSL/HTTPS:
✅ תקין - חיבור HTTPS מאובטח עם תעודת SSL תקפה מרשות אמינה

🌐 דומיין:
✅ google.com - דומיין רשמי ומאומת, ללא סימני זיוף

📄 תוכן:
✅ לגיטימי - תוכן מקצועי ללא בקשות חשודות למידע רגיש

🎨 מיתוג ועיצוב:
✅ מקורי - לוגו ועיצוב רשמיים של גוגל

💡 המלצה והסבר:
המשך לגלוש בביטחון. זהו אתר לגיטימי עם כל האינדיקטורים הנכונים לאבטחה.

Now analyze thoroughly in Hebrew. Be detailed and specific.`;
  } else if (action === "youtube") {
    systemPrompt = `You are an expert video content analyzer. You will receive a YouTube video transcript with timestamps in the format [MM:SS] text.

Your task:
1. Summarize the video in ${targetLangName}
2. Extract key points with their timestamps
3. Identify main topics and themes
4. Provide a concise conclusion

Output in ${targetLangName} only, use this exact format:

🎬 סיכום סרטון YouTube

📌 נקודות עיקריות:
• [MM:SS] נקודה ראשונה...
• [MM:SS] נקודה שנייה...
• [MM:SS] נקודה שלישית...
(5-10 key points with timestamps)

🎯 נושאים מרכזיים:
• נושא 1
• נושא 2
• נושא 3

💡 מסקנה:
[Brief overall summary in 2-3 sentences]

Be concise and focus on the most important information.`;
  } else if (action === "translate") {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] ? rolePrompts[promptTemplate] + "\n\n" : "";
    systemPrompt = `${rolePrefix}You are a professional translator. Translate the following text to ${targetLangName}. Return only the translation.`;
  } else {
    const rolePrefix = promptTemplate !== "default" && rolePrompts[promptTemplate] ? rolePrompts[promptTemplate] + "\n\n" : "";
    systemPrompt = `${rolePrefix}You are an expert summarizer. Summarize the following text in ${targetLangName} with bullet points.`;
  }

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: text.slice(0, MAX_TEXT_LENGTH) }] }],
    generationConfig: {
      maxOutputTokens: action === "youtube" ? 4096 : (action === "phishing" ? 9000 : (action === "translate" ? 8192 : 4096)),
      temperature: 0.3
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `שגיאת Gemini ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const json = JSON.parse(data);
        const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (chunk) port.postMessage({ chunk });
      } catch (_) {}
    }
  }
  port.postMessage({ done: true });
}

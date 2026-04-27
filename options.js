const LEMON_SQUEEZY_CHECKOUT_URL = "https://pagepal.lemonsqueezy.com/checkout/buy/fd041aa5-17d0-40c1-9849-c69b4df43e4b";

document.addEventListener("DOMContentLoaded", async () => {

  const storage = await chrome.storage.sync.get([
    "licenseKey", "licenseValidated", "licenseValidatedAt",
  ]);
  
  const localStorage = await chrome.storage.local.get([
    "provider", "perplexityKey", "geminiKey", "openaiKey", "darkMode",
  ]);
  
  let activeProvider = localStorage.provider || "local";

  // ─── Lemon Squeezy License Management ────────────────────────────────────

  const licenseInput = document.getElementById("license-key-input");
  const licenseStatusBox = document.getElementById("subscription-status-box");
  const licenseStatusText = document.getElementById("subscription-status-text");
  const validateLicenseBtn = document.getElementById("validate-license-btn");
  const upgradeBtn = document.getElementById("options-upgrade-btn");
  const expiryDateBox = document.getElementById("expiry-date-box");
  const expiryDateText = document.getElementById("expiry-date-text");

  if (storage.licenseKey) licenseInput.value = storage.licenseKey;

  async function validateLicenseWithServer(licenseKey) {
    if (!licenseKey) return false;
    
    // Developer/Lifetime keys (bypass validation)
    // Note: If you're the developer, add your custom lifetime keys here
    const lifetimeKeys = [];
    
    if (lifetimeKeys.includes(licenseKey.toUpperCase())) {
      return { valid: true, isLifetime: true };
    }
    
    try {
      const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey }),
      });
      if (!res.ok) return { valid: false };
      const data = await res.json();
      
      // Debug logging - see what Lemon Squeezy returns
      console.log("🍋 Lemon Squeezy API Response:", JSON.stringify(data, null, 2));
      
      // Accept if valid and either active OR inactive in test mode
      if (!data.valid) return { valid: false };
      const status = data.license_key?.status;
      const testMode = data.license_key?.test_mode;
      
      const isValid = status === "active" || (testMode && status === "inactive");
      
      // Check for subscription info
      const subscription = data.meta?.subscription;
      const expiresAt = data.license_key?.expires_at || subscription?.ends_at || subscription?.renews_at;
      
      console.log("📅 Expiry date found:", expiresAt);
      console.log("🔍 Subscription data:", subscription);
      
      return {
        valid: isValid,
        expiresAt: expiresAt,
        orderId: data.meta?.order_id,
        variantName: data.meta?.variant_name,
        testMode: testMode
      };
    } catch (err) {
      console.error("❌ License validation error:", err);
      return { valid: false };
    }
  }

  async function refreshSubscriptionUI() {
    const syncData = await chrome.storage.sync.get(["licenseKey", "licenseValidated", "licenseValidatedAt", "licenseExpiry", "licenseVariant"]);
    const key = syncData.licenseKey;
    const validated = syncData.licenseValidated;
    const validatedAt = syncData.licenseValidatedAt || 0;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!key) {
      licenseStatusText.textContent = "Free: תרגום וסיכום ללא הגבלה, עד 5 הודעות צ'אט ביום, PDF ועוד ב-PRO.";
      licenseStatusBox.classList.add("is-free");
      licenseStatusBox.classList.remove("is-paid");
      expiryDateBox.style.display = "none";
      upgradeBtn.style.display = "inline-block";
      return;
    }

    if (validated && (now - validatedAt) < oneDay) {
      const variantText = syncData.licenseVariant ? ` (${syncData.licenseVariant})` : "";
      licenseStatusText.innerHTML = `מנוי PRO פעיל — צ'אט ו-PDF ללא הגבלה ✅${variantText}`;
      licenseStatusBox.classList.add("is-paid");
      licenseStatusBox.classList.remove("is-free");
      
      // Show expiry date
      updateExpiryDateDisplay(syncData.licenseExpiry, false, syncData.licenseVariant);
      
      // Hide upgrade button
      upgradeBtn.style.display = "none";
    } else {
      licenseStatusText.textContent = "בודק רישיון...";
      const result = await validateLicenseWithServer(key);
      if (result.valid) {
        const variantText = result.variantName || "";
        
        licenseStatusText.innerHTML = `מנוי PRO פעיל — צ'אט ו-PDF ללא הגבלה ✅${variantText ? ` (${variantText})` : ''}`;
        licenseStatusBox.classList.add("is-paid");
        licenseStatusBox.classList.remove("is-free");
        await chrome.storage.sync.set({
          licenseValidated: true,
          licenseValidatedAt: now,
          licenseExpiry: result.expiresAt || null,
          licenseVariant: variantText || null,
        });
        
        // Show expiry date
        updateExpiryDateDisplay(result.expiresAt, result.isLifetime, variantText);
        
        // Hide upgrade button
        upgradeBtn.style.display = "none";
      } else {
        licenseStatusText.textContent = "⚠️ License Key לא תקף או פג תוקף";
        licenseStatusBox.classList.add("is-free");
        licenseStatusBox.classList.remove("is-paid");
        expiryDateBox.style.display = "none";
        upgradeBtn.style.display = "inline-block";
        await chrome.storage.sync.set({
          licenseValidated: false,
          licenseValidatedAt: now,
        });
      }
    }
  }

  function updateExpiryDateDisplay(expiryDate, isLifetime, variantName) {
    if (isLifetime) {
      expiryDateText.textContent = "✨ מנוי לכל החיים";
      expiryDateBox.classList.remove("warning");
      expiryDateBox.style.display = "flex";
      return;
    }

    if (!expiryDate) {
      // No specific expiry date - subscription-based license
      // Show renewal info based on variant (monthly/yearly)
      if (variantName && variantName.toLowerCase().includes("yearly")) {
        expiryDateText.textContent = "מנוי שנתי פעיל - מתחדש אוטומטית";
      } else if (variantName && variantName.toLowerCase().includes("monthly")) {
        expiryDateText.textContent = "מנוי חודשי פעיל - מתחדש אוטומטית";
      } else {
        expiryDateText.textContent = "מנוי פעיל - מתחדש אוטומטית";
      }
      expiryDateBox.classList.remove("warning");
      expiryDateBox.style.display = "flex";
      return;
    }

    const date = new Date(expiryDate);
    if (isNaN(date.getTime())) {
      expiryDateBox.style.display = "none";
      return;
    }

    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      expiryDateText.textContent = "המנוי פג תוקף";
      expiryDateBox.classList.add("warning");
    } else if (diffDays === 0) {
      expiryDateText.textContent = "המנוי מסתיים היום";
      expiryDateBox.classList.add("warning");
    } else if (diffDays <= 7) {
      expiryDateText.textContent = `נשארו ${diffDays} ימים`;
      expiryDateBox.classList.add("warning");
    } else if (diffDays <= 30) {
      expiryDateText.textContent = `נשארו ${diffDays} ימים`;
      expiryDateBox.classList.remove("warning");
    } else {
      const hebrewDate = date.toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      expiryDateText.textContent = `מתחדש ב-${hebrewDate}`;
      expiryDateBox.classList.remove("warning");
    }
    
    expiryDateBox.style.display = "flex";
  }

  await refreshSubscriptionUI();

  validateLicenseBtn.addEventListener("click", async () => {
    const key = licenseInput.value.trim();
    
    // If empty, clear license (allows users to go back to Free tier)
    if (!key) {
      await chrome.storage.sync.set({
        licenseKey: "",
        licenseValidated: false,
        licenseValidatedAt: 0,
        licenseExpiry: null,
        licenseVariant: null,
      });
      
      licenseStatusText.textContent = "Free: תרגום וסיכום ללא הגבלה, עד 5 הודעות צ'אט ביום, PDF ועוד ב-PRO.";
      licenseStatusBox.classList.add("is-free");
      licenseStatusBox.classList.remove("is-paid");
      expiryDateBox.style.display = "none";
      upgradeBtn.style.display = "inline-block";
      
      // Notify popup to refresh
      try {
        chrome.runtime.sendMessage({ action: "licenseUpdated" });
      } catch (_) {}
      
      return;
    }

    validateLicenseBtn.disabled = true;
    validateLicenseBtn.textContent = "מאמת...";
    licenseStatusText.textContent = "בודק רישיון...";

    const result = await validateLicenseWithServer(key);
    const now = Date.now();

    if (result.valid) {
      const variantText = result.variantName || "";
      
      await chrome.storage.sync.set({
        licenseKey: key,
        licenseValidated: true,
        licenseValidatedAt: now,
        licenseExpiry: result.expiresAt || null,
        licenseVariant: variantText || null,
      });
      
      licenseStatusText.innerHTML = `מנוי PRO פעיל — צ'אט ו-PDF ללא הגבלה ✅${variantText ? ` (${variantText})` : ''}`;
      licenseStatusBox.classList.add("is-paid");
      licenseStatusBox.classList.remove("is-free");
      
      // Show expiry date
      updateExpiryDateDisplay(result.expiresAt, result.isLifetime, variantText);
      
      // Hide upgrade button
      upgradeBtn.style.display = "none";
      
      // Notify popup to refresh
      try {
        chrome.runtime.sendMessage({ action: "licenseUpdated" });
      } catch (_) {}
    } else {
      await chrome.storage.sync.set({
        licenseKey: key,
        licenseValidated: false,
        licenseValidatedAt: now,
      });
      licenseStatusText.textContent = "⚠️ License Key לא תקף. בדוק שהוא נכון ופעיל.";
      licenseStatusBox.classList.add("is-free");
      licenseStatusBox.classList.remove("is-paid");
      expiryDateBox.style.display = "none";
      upgradeBtn.style.display = "inline-block";
    }

    validateLicenseBtn.disabled = false;
    validateLicenseBtn.textContent = "אמת License Key";
  });

  upgradeBtn.addEventListener("click", () => {
    window.open(LEMON_SQUEEZY_CHECKOUT_URL, "_blank");
  });

  // ─── Dark Mode ────────────────────────────────────────────────────────────

  const darkModeToggle = document.getElementById("dark-mode-toggle");
  darkModeToggle.checked = !!storage.darkMode;
  document.documentElement.setAttribute("data-theme", storage.darkMode ? "dark" : "");

  darkModeToggle.addEventListener("change", async () => {
    const on = darkModeToggle.checked;
    document.documentElement.setAttribute("data-theme", on ? "dark" : "");
    await chrome.storage.local.set({ darkMode: on });
  });

  // ─── Provider Tabs ────────────────────────────────────────────────────────

  const tabs  = document.querySelectorAll(".provider-tab");
  const cards = document.querySelectorAll(".provider-card");

  function activateProvider(provider) {
    activeProvider = provider;
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.provider === provider));
    cards.forEach((c) => c.classList.toggle("active", c.id === `card-${provider}`));
    chrome.storage.local.set({ provider });
    if (provider === "local") runLocalAICheck();
    const det = document.getElementById("advanced-byok");
    if (det && ["gemini", "openai", "perplexity"].includes(provider)) det.open = true;
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => activateProvider(tab.dataset.provider)));
  activateProvider(activeProvider);

  // ─── Load saved keys ──────────────────────────────────────────────────────

  const perplexityInput = document.getElementById("perplexity-key-input");
  const geminiInput     = document.getElementById("gemini-key-input");
  const openaiInput     = document.getElementById("openai-key-input");

  if (storage.perplexityKey) perplexityInput.value = storage.perplexityKey;
  if (storage.geminiKey)     geminiInput.value     = storage.geminiKey;
  if (storage.openaiKey)     openaiInput.value     = storage.openaiKey;

  // ─── Toggle visibility ────────────────────────────────────────────────────

  document.querySelectorAll(".toggle-vis-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.textContent = isPassword ? "🙈" : "👁️";
    });
  });

  // ─── Chrome Local AI ──────────────────────────────────────────────────────

  async function runLocalAICheck() {
    const capBox  = document.getElementById("local-ai-capability-box");
    const capText = document.getElementById("local-ai-cap-text");
    if (!capText) return;
    capText.textContent = "בודק זמינות...";
    capBox.className = "capability-box checking";

    try {
      const aiApi = (typeof ai !== "undefined" && ai) || (typeof window.ai !== "undefined" && window.ai);
      if (!aiApi?.languageModel) throw new Error("no-api");

      const caps = await aiApi.languageModel.capabilities();
      if (caps.available === "readily") {
        capText.textContent = "✅ Chrome Local AI זמין ומוכן לשימוש";
        capBox.className = "capability-box ready";
      } else if (caps.available === "after-download") {
        capText.textContent = "⏬ זמין — המודל ידרש הורדה בשימוש הראשון";
        capBox.className = "capability-box download";
      } else {
        throw new Error("not-available");
      }
    } catch (_) {
      capText.innerHTML =
        `⚠️ Chrome Local AI אינו זמין בדפדפן זה.<br>` +
        `אפשר אותו ב-<code>chrome://flags/#prompt-api-for-gemini-nano</code> ואתחל את Chrome.<br>` +
        `<small style="color: #888;">לחץ "העתק Flags URL" למטה והדבק בשורת הכתובת</small>`;
      capBox.className = "capability-box unavailable";
    }
  }

  document.getElementById("check-local-btn")?.addEventListener("click", runLocalAICheck);

  // ─── Perplexity ───────────────────────────────────────────────────────────

  document.getElementById("save-perplexity-btn").addEventListener("click", async () => {
    const key = perplexityInput.value.trim();
    if (!key) return showStatus("perplexity", "אנא הזן מפתח API תקין.", "error");
    await chrome.storage.local.set({ perplexityKey: key });
    showStatus("perplexity", "✅ מפתח Perplexity נשמר בהצלחה!", "success");
  });

  document.getElementById("clear-perplexity-btn").addEventListener("click", async () => {
    await chrome.storage.local.remove("perplexityKey");
    perplexityInput.value = "";
    showStatus("perplexity", "🗑️ המפתח נמחק.", "info");
  });

  document.getElementById("test-perplexity-btn").addEventListener("click", async () => {
    const key = perplexityInput.value.trim();
    if (!key) return showStatus("perplexity", "הזן מפתח לפני הבדיקה.", "error");
    const btn = document.getElementById("test-perplexity-btn");
    btn.disabled = true; btn.textContent = "בודק...";
    try {
      const res = await fetch("https://api.perplexity.ai/v1/sonar", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: "ok" }], max_tokens: 5, disable_search: true }),
      });
      if (res.ok) showStatus("perplexity", "✅ החיבור תקין!", "success");
      else { const e = await res.json().catch(() => ({})); showStatus("perplexity", `❌ שגיאה: ${e?.error?.message ?? res.status}`, "error"); }
    } catch (e) { showStatus("perplexity", `❌ שגיאת רשת: ${e.message}`, "error"); }
    finally { btn.disabled = false; btn.textContent = "בדוק חיבור"; }
  });

  // ─── Gemini ───────────────────────────────────────────────────────────────

  document.getElementById("save-gemini-btn").addEventListener("click", async () => {
    const key = geminiInput.value.trim();
    if (!key) return showStatus("gemini", "אנא הזן מפתח API תקין.", "error");
    await chrome.storage.local.set({ geminiKey: key });
    showStatus("gemini", "✅ מפתח Gemini נשמר בהצלחה!", "success");
  });

  document.getElementById("clear-gemini-btn").addEventListener("click", async () => {
    await chrome.storage.local.remove("geminiKey");
    geminiInput.value = "";
    showStatus("gemini", "🗑️ המפתח נמחק.", "info");
  });

  document.getElementById("test-gemini-btn").addEventListener("click", async () => {
    const key = geminiInput.value.trim();
    if (!key) return showStatus("gemini", "הזן מפתח לפני הבדיקה.", "error");
    const btn = document.getElementById("test-gemini-btn");
    btn.disabled = true; btn.textContent = "בודק...";
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ok" }] }], generationConfig: { maxOutputTokens: 5 } }),
      });
      if (res.ok) showStatus("gemini", "✅ החיבור תקין!", "success");
      else { const e = await res.json().catch(() => ({})); showStatus("gemini", `❌ שגיאה: ${e?.error?.message ?? res.status}`, "error"); }
    } catch (e) { showStatus("gemini", `❌ שגיאת רשת: ${e.message}`, "error"); }
    finally { btn.disabled = false; btn.textContent = "בדוק חיבור"; }
  });

  // ─── OpenAI ───────────────────────────────────────────────────────────────

  document.getElementById("save-openai-btn").addEventListener("click", async () => {
    const key = openaiInput.value.trim();
    if (!key) return showStatus("openai", "אנא הזן מפתח API תקין.", "error");
    await chrome.storage.local.set({ openaiKey: key });
    showStatus("openai", "✅ מפתח OpenAI נשמר בהצלחה!", "success");
  });

  document.getElementById("clear-openai-btn").addEventListener("click", async () => {
    await chrome.storage.local.remove("openaiKey");
    openaiInput.value = "";
    showStatus("openai", "🗑️ המפתח נמחק.", "info");
  });

  document.getElementById("test-openai-btn").addEventListener("click", async () => {
    const key = openaiInput.value.trim();
    if (!key) return showStatus("openai", "הזן מפתח לפני הבדיקה.", "error");
    const btn = document.getElementById("test-openai-btn");
    btn.disabled = true; btn.textContent = "בודק...";
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "ok" }], max_tokens: 5 }),
      });
      if (res.ok) showStatus("openai", "✅ החיבור תקין!", "success");
      else { const e = await res.json().catch(() => ({})); showStatus("openai", `❌ שגיאה: ${e?.error?.message ?? res.status}`, "error"); }
    } catch (e) { showStatus("openai", `❌ שגיאת רשת: ${e.message}`, "error"); }
    finally { btn.disabled = false; btn.textContent = "בדוק חיבור"; }
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function showStatus(provider, message, type) {
    const el = document.getElementById(`status-${provider}`);
    if (!el) return;
    el.textContent = message;
    el.className = type;
    el.hidden = !message;
  }

  // ─── Debug Tools ──────────────────────────────────────────────────────────

  document.getElementById("reset-quotas-btn")?.addEventListener("click", async () => {
    const confirmed = confirm(
      "🔄 אפס מכסות?\n\n" +
      "זה יאפס:\n" +
      "• יוטיוב + פישינג: 3/3\n" +
      "• שאל על העמוד (צ'אט): 5/5\n\n" +
      "להמשיך?"
    );
    
    if (!confirmed) return;
    
    try {
      await chrome.storage.local.remove([
        'freemiumPremiumUsage',
        'freemiumChatDate', 
        'freemiumChatCount'
      ]);
      
      alert("✅ המכסות אופסו בהצלחה!\n\nעכשיו יש לך:\n• יוטיוב + פישינג: 3/3\n• צ'אט: 5/5");
    } catch (error) {
      alert("❌ שגיאה באיפוס המכסות: " + error.message);
    }
  });
});

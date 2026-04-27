const MAX_HISTORY    = 50;
const CACHE_TTL_MS   = 24 * 60 * 60 * 1000;
const MAX_TEXT_LOCAL = 6000;
const FREE_CHAT_DAILY = 5;
const FREE_PREMIUM_FEATURES_DAILY = 3; // YouTube + Phishing for free users
const LEMON_SQUEEZY_CHECKOUT_URL = "https://pagepal.lemonsqueezy.com/checkout/buy/fd041aa5-17d0-40c1-9849-c69b4df43e4b";

// Supported Languages
const LANGUAGES = [
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

// Header colours per action
const HEADER_COLORS = {
  translate: "#1567FE",
  summarize: "#059669",
  chat:      "#7c3aed",
  phishing:  "#dc2626",
  youtube:   "#FF0000",
};

document.addEventListener("DOMContentLoaded", async () => {

  // ─── Elements ──────────────────────────────────────────────────────────────

  const onboardingScreen  = document.getElementById("onboarding-screen");
  const homeScreen        = document.getElementById("home-screen");
  const resultScreen      = document.getElementById("result-screen");
  const historyScreen     = document.getElementById("history-screen");
  const chatScreen        = document.getElementById("chat-screen");
  const statsScreen       = document.getElementById("stats-screen");

  const translateBtn      = document.getElementById("translate-btn");
  const summarizeBtn      = document.getElementById("summarize-btn");
  const askPageBtn        = document.getElementById("ask-page-btn");
  const phishingCheckBtn  = document.getElementById("phishing-check-btn");
  const youtubeSummaryBtn = document.getElementById("youtube-summary-btn");
  const settingsBtn       = document.getElementById("settings-btn");
  const goSettingsBtn     = document.getElementById("go-settings-btn");
  const historyBtn        = document.getElementById("history-btn");
  const darkModeBtn       = document.getElementById("dark-mode-btn");
  const statsBtn          = document.getElementById("stats-btn");
  const noKeyWarning      = document.getElementById("no-key-warning");
  const mainActions       = document.getElementById("main-actions");
  const currentUrlEl      = document.getElementById("current-url");
  const providerBadge     = document.getElementById("provider-badge");
  const switchProviderBtn = document.getElementById("switch-provider-btn");
  const undoProviderBtn   = document.getElementById("undo-provider-btn");
  const pdfBadge          = document.getElementById("pdf-badge");
  const pdfLock           = document.getElementById("pdf-lock");
  const targetLangSelect  = document.getElementById("target-lang");
  const translateBtnText  = document.getElementById("translate-btn-text");
  const summarizeBtnText  = document.getElementById("summarize-btn-text");
  const promptTemplateSelect = document.getElementById("prompt-template");
  const promptTemplateSelector = document.getElementById("prompt-template-selector");
  const toggleTemplateBtn = document.getElementById("toggle-template-btn");
  const templateToggleIcon = document.getElementById("template-toggle-icon");

  const backBtn           = document.getElementById("back-btn");
  const copyBtn           = document.getElementById("copy-btn");
  const rescanBtn         = document.getElementById("rescan-btn");
  const askResultBtn      = document.getElementById("ask-result-btn");
  const resultTitle       = document.getElementById("result-title");
  const resultSkeleton    = document.getElementById("result-skeleton");
  const resultContent     = document.getElementById("result-content");
  const resultError       = document.getElementById("result-error");
  const resultHeader      = document.getElementById("result-header");

  const historyBackBtn    = document.getElementById("history-back-btn");
  const clearHistoryBtn   = document.getElementById("clear-history-btn");
  const historyList       = document.getElementById("history-list");
  const historyEmpty      = document.getElementById("history-empty");
  const historyNoResults  = document.getElementById("history-no-results");
  const historySearch     = document.getElementById("history-search");

  const chatBackBtn       = document.getElementById("chat-back-btn");
  const chatClearBtn      = document.getElementById("chat-clear-btn");
  const chatContextLabel  = document.getElementById("chat-context-label");
  const chatMessages      = document.getElementById("chat-messages");
  const chatInput         = document.getElementById("chat-input");
  const chatSendBtn       = document.getElementById("chat-send-btn");

  const statsBackBtn      = document.getElementById("stats-back-btn");
  const resetStatsBtn     = document.getElementById("reset-stats-btn");
  const pinBtn            = document.getElementById("pin-btn"); // only in popup, null in sidepanel

  const isSidePanel = document.body.classList.contains("is-sidepanel");

  // ─── State ─────────────────────────────────────────────────────────────────

  const storage = await chrome.storage.local.get([
    "provider", "perplexityKey", "geminiKey", "openaiKey", "darkMode", "onboardingDone", "stats", "targetLang",
  ]);
  
  const syncStorage = await chrome.storage.sync.get([
    "licenseKey", "licenseValidated", "licenseValidatedAt",
  ]);

  let userPaid = false;
  let targetLang = storage.targetLang || "he";
  let promptTemplate = storage.promptTemplate || "default";
  let promptTemplateEnabled = storage.promptTemplateEnabled !== false;
  let lastAction = null;  // Track last action for rescan
  let isYouTube = false;  // Track if current page is YouTube
  let youtubeVideoId = null;  // Store YouTube video ID

  // ─── Lemon Squeezy License Validation ──────────────────────────────────────

  async function validateLicenseWithServer(licenseKey) {
    if (!licenseKey) return { valid: false };
    
    // Developer/Lifetime keys (bypass validation)
    // Note: If you're the developer, add your custom lifetime keys here
    const lifetimeKeys = [];
    
    if (lifetimeKeys.includes(licenseKey.toUpperCase())) {
      return { valid: true, isLifetime: true };
    }
    
    try {
      // Lemon Squeezy License Validation API
      const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey }),
      });
      if (!res.ok) return { valid: false };
      const data = await res.json();
      
      // Accept if valid and either active OR inactive in test mode
      if (!data.valid) return { valid: false };
      const status = data.license_key?.status;
      const testMode = data.license_key?.test_mode;
      
      const isValid = status === "active" || (testMode && status === "inactive");
      
      return {
        valid: isValid,
        expiresAt: data.license_key?.expires_at,
        orderId: data.meta?.order_id,
        variantName: data.meta?.variant_name,
        testMode: testMode
      };
    } catch (_) {
      return { valid: false };
    }
  }

  async function refreshSubscriptionState() {
    console.log("🔄 refreshSubscriptionState() called");
    const syncData = await chrome.storage.sync.get(["licenseKey", "licenseValidated", "licenseValidatedAt"]);
    const key = syncData.licenseKey;
    const validated = syncData.licenseValidated;
    const validatedAt = syncData.licenseValidatedAt || 0;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    console.log("🔑 License check:", { 
      hasKey: !!key, 
      keyPreview: key ? "***" + key.slice(-4) : "NONE", 
      validated, 
      validatedAt: new Date(validatedAt).toISOString() 
    });

    // If we have a validated license that's less than 24h old, trust it
    if (validated && key && (now - validatedAt) < oneDay) {
      userPaid = true;
      console.log("✅ Valid cached license - userPaid = true");
      updateProBadge();
      updateHeaderUpgradeBtn();
      initPdfLockDisplay();
      return;
    }

    // Otherwise, validate with server
    if (key) {
      console.log("🌐 Validating license with server...");
      const result = await validateLicenseWithServer(key);
      if (result.valid) {
        userPaid = true;
        console.log("✅ Server validated license - userPaid = true");
        await chrome.storage.sync.set({
          licenseValidated: true,
          licenseValidatedAt: now,
          licenseExpiry: result.expiresAt || null,
          licenseVariant: result.variantName || null,
        });
      } else {
        userPaid = false;
        console.log("❌ Server rejected license - userPaid = false");
        await chrome.storage.sync.set({
          licenseValidated: false,
          licenseValidatedAt: now,
        });
      }
    } else {
      userPaid = false;
      console.log("❌ No license key found - userPaid = false");
    }

    updateProBadge();
    updateHeaderUpgradeBtn();
    initPdfLockDisplay();
  }

  function triggerUpgrade() {
    console.log("🔓 triggerUpgrade() called - opening checkout URL");
    
    // Always show message to user so they know what's happening
    const upgradeMessage = "🔓 הגעת למגבלת הפיצרים החינמיים!\n\n" +
      "📊 יוטיוב + פישינג: 3 שימושים ביום\n\n" +
      "💎 שדרג ל-PRO לשימוש בלתי מוגבל!\n\n" +
      "האם לפתוח דף רכישה?";
    
    if (!confirm(upgradeMessage)) {
      console.log("⏭️ User cancelled upgrade");
      return;
    }
    
    try {
      const opened = window.open(LEMON_SQUEEZY_CHECKOUT_URL, "_blank");
      if (!opened) {
        console.error("❌ Failed to open checkout window - popup blocked");
        alert("❌ חלון השדרוג נחסם!\n\n💡 אנא אפשר פופאפים לתוסף זה ונסה שוב.\n\nURL:\n" + LEMON_SQUEEZY_CHECKOUT_URL);
      } else {
        console.log("✅ Checkout window opened successfully");
      }
    } catch (e) {
      console.error("❌ Lemon Squeezy checkout error:", e);
      alert("❌ שגיאה בפתיחת דף השדרוג\n\nURL:\n" + LEMON_SQUEEZY_CHECKOUT_URL);
    }
  }

  function updateProBadge() {
    const el = document.getElementById("pro-badge");
    if (el) el.hidden = !userPaid;
  }

  function updateHeaderUpgradeBtn() {
    const el = document.getElementById("header-upgrade-btn");
    if (el) el.hidden = userPaid;
  }

  function initPdfLockDisplay() {
    const lock = document.getElementById("pdf-lock");
    if (lock) lock.hidden = userPaid;
  }

  // ─── Browser Fingerprinting ────────────────────────────────────────────────

  async function getBrowserFingerprint() {
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.platform,
        navigator.deviceMemory || 'unknown',
      ];
      
      // Create a simple hash from components
      const fingerprintString = components.join('|');
      const hash = await simpleHash(fingerprintString);
      return hash;
    } catch (error) {
      console.error("Error generating fingerprint:", error);
      return 'fallback-fingerprint';
    }
  }

  async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  // ─── Freemium Quota Management ─────────────────────────────────────────────

  async function getFreeChatCountForToday() {
    const today = new Date().toISOString().slice(0, 10);
    const { freemiumChatDate, freemiumChatCount = 0 } = await chrome.storage.local.get([
      "freemiumChatDate", "freemiumChatCount",
    ]);
    if (freemiumChatDate !== today) return 0;
    return freemiumChatCount;
  }

  async function getFreePremiumCountForToday() {
    const today = new Date().toISOString().slice(0, 10);
    const fingerprint = await getBrowserFingerprint();
    const data = await chrome.storage.local.get("freemiumPremiumUsage");
    
    if (!data.freemiumPremiumUsage) return 0;
    
    const { date, count, fp } = data.freemiumPremiumUsage;
    
    // Check if date is today
    if (date !== today) return 0;
    
    // Check fingerprint match (if exists)
    if (fp && fp !== fingerprint) {
      console.warn("⚠️ Fingerprint mismatch detected! Resetting quota.");
      await chrome.storage.local.remove("freemiumPremiumUsage");
      return 0;
    }
    
    return count || 0;
  }

  async function bumpFreePremiumCount() {
    const today = new Date().toISOString().slice(0, 10);
    const fingerprint = await getBrowserFingerprint();
    const data = await chrome.storage.local.get("freemiumPremiumUsage");
    const oldData = data.freemiumPremiumUsage || {};
    
    if (oldData.date !== today) {
      await chrome.storage.local.set({ 
        freemiumPremiumUsage: { 
          date: today, 
          count: 1,
          fp: fingerprint 
        } 
      });
      await updatePremiumFeaturesQuotaDisplay();
      return 1;
    }
    
    const newCount = (oldData.count || 0) + 1;
    await chrome.storage.local.set({ 
      freemiumPremiumUsage: { 
        date: today, 
        count: newCount,
        fp: fingerprint 
      } 
    });
    await updatePremiumFeaturesQuotaDisplay();
    return newCount;
  }

  async function updatePremiumFeaturesQuotaDisplay() {
    try {
      if (userPaid) {
        // Hide countdown for PRO users
        const timer = document.getElementById('quota-reset-timer');
        if (timer) timer.hidden = true;
        return;
      }
      
      const premiumCount = await getFreePremiumCountForToday();
      const premiumLeft = Math.max(0, FREE_PREMIUM_FEATURES_DAILY - premiumCount);
      const premiumQuotaText = `(${premiumLeft}/${FREE_PREMIUM_FEATURES_DAILY})`;
      
      const chatCount = await getFreeChatCountForToday();
      const chatLeft = Math.max(0, FREE_CHAT_DAILY - chatCount);
      const chatQuotaText = `(${chatLeft}/${FREE_CHAT_DAILY})`;
      
      // Show countdown if any quota is exhausted
      const anyQuotaExhausted = premiumLeft === 0 || chatLeft === 0;
      const timer = document.getElementById('quota-reset-timer');
      if (timer) {
        timer.hidden = !anyQuotaExhausted;
      }
      
      // Update Phishing button (only if not PDF and button exists)
      if (phishingCheckBtn && !isPdf) {
        const strong = phishingCheckBtn.querySelector('strong');
        if (strong && !strong.textContent.includes('PRO')) {
          if (premiumLeft === 0) {
            strong.textContent = `בדיקת פישינג ${premiumQuotaText} - הגעת למגבלה`;
            strong.style.color = '#ef4444';
          } else {
            strong.textContent = `בדיקת פישינג ${premiumQuotaText}`;
            strong.style.color = '';
          }
        }
      }
      
      // Update YouTube button (only if YouTube page and button exists)
      if (youtubeSummaryBtn && isYouTube) {
        const strong = youtubeSummaryBtn.querySelector('strong');
        if (strong) {
          if (premiumLeft === 0) {
            strong.textContent = `סכם סרטון YouTube ${premiumQuotaText} - הגעת למגבלה`;
            strong.style.color = '#ef4444';
          } else {
            strong.textContent = `סכם סרטון YouTube ${premiumQuotaText}`;
            strong.style.color = '';
          }
        }
      }
      
      // Update Ask Page button (uses chat quota)
      if (askPageBtn && !isPdf) {
        const strong = askPageBtn.querySelector('strong');
        if (strong && !strong.textContent.includes('PRO')) {
          if (chatLeft === 0) {
            strong.textContent = `שאל על העמוד ${chatQuotaText} - הגעת למגבלה`;
            strong.style.color = '#ef4444';
          } else {
            strong.textContent = `שאל על העמוד ${chatQuotaText}`;
            strong.style.color = '';
          }
        }
      }
    } catch (error) {
      console.error("Error updating premium quota display:", error);
      // Don't crash the popup if this fails
    }
  }

  // Countdown Timer
  function updateCountdownTimer() {
    const countdownText = document.getElementById('countdown-text');
    if (!countdownText) return;
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0); // Midnight tonight
    
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    countdownText.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Start countdown timer (updates every second)
  setInterval(updateCountdownTimer, 1000);
  updateCountdownTimer(); // Initial call

  async function updateChatQuotaBar() {
    const wrap = document.getElementById("chat-quota-wrap");
    const bar  = document.getElementById("chat-quota-bar");
    if (!wrap || !bar) return;
    if (userPaid) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const c   = await getFreeChatCountForToday();
    const left = Math.max(0, FREE_CHAT_DAILY - c);
    bar.textContent = `נשארו ${left} / ${FREE_CHAT_DAILY} שאלות חינמיות היום`;
  }

  async function updateChatInputLockState() {
    if (userPaid) {
      chatInput.disabled = false;
      chatSendBtn.disabled = false;
      chatInput.placeholder = "שאל שאלה על התוכן...";
      return;
    }
    const c = await getFreeChatCountForToday();
    if (c >= FREE_CHAT_DAILY) {
      chatInput.disabled = true;
      chatSendBtn.disabled = true;
      chatInput.placeholder = "הגעת למגבלה — שדרג ל-PRO";
    } else {
      chatInput.disabled = false;
      chatSendBtn.disabled = false;
      chatInput.placeholder = "שאל שאלה על התוכן...";
    }
  }

  async function incrementFreeChatOnSuccess() {
    if (userPaid) return;
    const today = new Date().toISOString().slice(0, 10);
    let { freemiumChatDate, freemiumChatCount = 0 } = await chrome.storage.local.get([
      "freemiumChatDate", "freemiumChatCount",
    ]);
    if (freemiumChatDate !== today) { freemiumChatDate = today; freemiumChatCount = 0; }
    freemiumChatCount += 1;
    await chrome.storage.local.set({ freemiumChatDate, freemiumChatCount });
    await updateChatQuotaBar();
    await updateChatInputLockState();
    await updatePremiumFeaturesQuotaDisplay(); // Update Ask Page button quota
  }

  await refreshSubscriptionState();
  console.log("💳 Subscription state after refresh - userPaid:", userPaid);
  // Don't update quota yet - buttons don't exist yet!

  // ─── Language Selector ─────────────────────────────────────────────────────
  
  // Populate language dropdown
  LANGUAGES.forEach(lang => {
    const option = document.createElement("option");
    option.value = lang.code;
    option.textContent = `${lang.flag} ${lang.name}`;
    if (lang.code === targetLang) option.selected = true;
    targetLangSelect.appendChild(option);
  });

  // Update button text based on selected language
  function updateTranslateBtnText() {
    const lang = LANGUAGES.find(l => l.code === targetLang);
    if (lang) {
      translateBtnText.textContent = `תרגם ל${lang.name}`;
      summarizeBtnText.textContent = `סכם ב${lang.name}`;
    }
  }
  updateTranslateBtnText();

  // Save language selection
  targetLangSelect.addEventListener("change", async () => {
    targetLang = targetLangSelect.value;
    await chrome.storage.local.set({ targetLang });
    updateTranslateBtnText();
    updatePdfButtonStates(); // Update button states when language changes
  });

  // ─── Prompt Template System ────────────────────────────────────────────────
  
  // Show template selector for PRO users only
  if (userPaid) {
    promptTemplateSelector.hidden = false;
  }

  // Populate prompt template dropdown
  promptTemplateSelect.value = promptTemplate;
  
  // Update UI state
  function updateTemplateUI() {
    if (promptTemplateEnabled && promptTemplate !== "default") {
      promptTemplateSelector.classList.add("active");
      toggleTemplateBtn.classList.add("active");
      templateToggleIcon.textContent = "✓";
    } else {
      promptTemplateSelector.classList.remove("active");
      toggleTemplateBtn.classList.remove("active");
      templateToggleIcon.textContent = "○";
    }
  }
  updateTemplateUI();

  // Template selection
  promptTemplateSelect.addEventListener("change", async () => {
    promptTemplate = promptTemplateSelect.value;
    await chrome.storage.local.set({ promptTemplate });
    updateTemplateUI();
  });

  // Toggle template on/off
  toggleTemplateBtn.addEventListener("click", async () => {
    promptTemplateEnabled = !promptTemplateEnabled;
    await chrome.storage.local.set({ promptTemplateEnabled });
    updateTemplateUI();
  });

  // Listen for license updates from options page
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action === "licenseUpdated") {
      console.log("📬 License updated message received - refreshing state");
      void refreshSubscriptionState()
        .then(() => { 
          console.log("🔄 After license refresh - userPaid:", userPaid);
          updatePdfButtonStates();
          void updateChatQuotaBar();
          void updatePremiumFeaturesQuotaDisplay(); 
          return updateChatInputLockState(); 
        });
    }
  });

  document.getElementById("header-upgrade-btn")?.addEventListener("click", triggerUpgrade);
  document.getElementById("chat-upgrade-btn")?.addEventListener("click", triggerUpgrade);

  let provider         = storage.provider || "local";
  let previousProvider = null;
  let undoTimeout      = null;
  let darkMode         = storage.darkMode || false;
  let chatContext      = "";
  let chatHistory      = [];
  let chatEntryId      = null;   // entryId for current chat (null = page chat)
  let chatTabMeta      = null;   // { url, hostname, pageTitle, context } for auto-saving new chats
  let lastPageText     = "";
  let chatReturnScreen = "home";
  let isPdf            = false;
  let localAiStatus    = "unknown"; // "ready" | "after-download" | "unavailable" | "unknown"

  // ─── Dark mode ─────────────────────────────────────────────────────────────

  function applyDarkMode(on) {
    document.documentElement.setAttribute("data-theme", on ? "dark" : "");
    darkModeBtn.textContent = on ? "☀️" : "🌙";
  }

  applyDarkMode(darkMode);

  darkModeBtn.addEventListener("click", async () => {
    darkMode = !darkMode;
    applyDarkMode(darkMode);
    await chrome.storage.local.set({ darkMode });
  });

  // ─── Onboarding ────────────────────────────────────────────────────────────

  if (!storage.onboardingDone) {
    showOnboarding();
  } else {
    initHome();
  }

  function showOnboarding() {
    onboardingScreen.hidden = false;
    homeScreen.hidden       = true;
    initOnboarding();
  }

  function initOnboarding() {
    let step = 1;
    let obProvider = "local";

    const steps    = document.querySelectorAll(".ob-step");
    const dots     = document.querySelectorAll(".ob-dot");
    const obNext   = document.getElementById("ob-next-btn");
    const obBack   = document.getElementById("ob-back-btn");
    const obInput  = document.getElementById("ob-key-input");
    const obHint   = document.getElementById("ob-key-hint");
    const obNoKey  = document.getElementById("ob-no-key-msg");
    const obLinkP  = document.getElementById("ob-key-link-perplexity");
    const obLinkG  = document.getElementById("ob-key-link-gemini");
    const obLinkO  = document.getElementById("ob-key-link-openai");
    const provBtns = document.querySelectorAll(".ob-provider-btn");

    function goStep(n) {
      step = n;
      steps.forEach((s, i) => s.classList.toggle("active", i + 1 === n));
      dots.forEach((d, i)  => d.classList.toggle("active", i + 1 === n));
      obBack.hidden = n === 1;
      obNext.textContent = n === 3 ? "התחל! 🚀" : "הבא →";
    }

    function updateStep3ForProvider(p) {
      const noKeyProviders = ["local"];
      const isNoKey = noKeyProviders.includes(p);
      if (obNoKey)  obNoKey.hidden  = !isNoKey;
      if (obInput)  obInput.hidden  = isNoKey;
      if (obLinkP)  obLinkP.hidden  = p !== "perplexity";
      if (obLinkG)  obLinkG.hidden  = p !== "gemini";
      if (obLinkO)  obLinkO.hidden  = p !== "openai";
      if (obHint) {
        if (isNoKey) {
          obHint.textContent = "";
        } else {
          const names = { gemini: "Gemini", openai: "OpenAI", perplexity: "Perplexity" };
          obHint.innerHTML = `הזן מפתח <strong>${names[p]}</strong> כדי להתחיל:`;
        }
        const placeholders = { gemini: "AIza...", openai: "sk-...", perplexity: "pplx-..." };
        if (obInput) obInput.placeholder = placeholders[p] || "";
      }
    }

    provBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        obProvider = btn.dataset.provider;
        provBtns.forEach((b) => b.classList.toggle("active", b === btn));
        updateStep3ForProvider(obProvider);
      });
    });

    obNext.addEventListener("click", async () => {
      if (step < 3) { goStep(step + 1); if (step === 3) updateStep3ForProvider(obProvider); return; }

      // Finish onboarding
      const key = obInput?.value.trim() ?? "";
      const saves = { provider: obProvider, onboardingDone: true };
      if (key) {
        if (obProvider === "gemini")     saves.geminiKey = key;
        else if (obProvider === "openai") saves.openaiKey = key;
        else if (obProvider === "perplexity") saves.perplexityKey = key;
      }
      await chrome.storage.local.set(saves);
      provider = obProvider;
      onboardingScreen.hidden = true;
      initHome();
    });

    obBack.addEventListener("click", () => { if (step > 1) goStep(step - 1); });
    goStep(1);
    // Initialize first button as active
    provBtns[0]?.classList.add("active");
  }

  // ─── Chrome Local AI detection ──────────────────────────────────────────────

  async function detectLocalAI() {
    try {
      const aiApi = (typeof ai !== "undefined" && ai) || (typeof window.ai !== "undefined" && window.ai);
      if (!aiApi?.languageModel) { localAiStatus = "unavailable"; return; }
      const caps = await aiApi.languageModel.capabilities();
      localAiStatus = caps.available === "readily" ? "ready"
                    : caps.available === "after-download" ? "after-download"
                    : "unavailable";
    } catch (_) {
      localAiStatus = "unavailable";
    }
  }

  async function updateHomeKeyWarning() {
    if (provider === "local") {
      await detectLocalAI();
      const infoEl = document.getElementById("local-ai-info");
      if (infoEl) {
        infoEl.hidden = false;
        const statusEl = document.getElementById("local-ai-status-text");
        if (statusEl) {
          statusEl.textContent =
            localAiStatus === "ready"          ? "✅ Chrome AI זמין ומוכן לשימוש" :
            localAiStatus === "after-download" ? "⏬ המודל ידרש הורדה בשימוש הראשון" :
                                                 "⚠️ Chrome AI לא זמין בדפדפן זה";
          statusEl.className = `local-ai-status-text ${localAiStatus}`;
        }
      }
      if (localAiStatus === "unavailable") {
        noKeyWarning.hidden = false;
        noKeyWarning.innerHTML =
          `<p>⚠️ Chrome Local AI אינו זמין.<br>` +
          `אפשר אותו ב-Settings → Chrome Local AI, או עבור לספק ענן.</p>` +
          `<button id="go-settings-btn">פתח הגדרות</button>`;
        document.getElementById("go-settings-btn")?.addEventListener("click", () => chrome.runtime.openOptionsPage());
        mainActions.hidden = true;
      } else {
        noKeyWarning.hidden = true;
        mainActions.hidden  = false;
      }
    } else {
      document.getElementById("local-ai-info")?.setAttribute("hidden", "");
      const activeKey =
        provider === "gemini"  ? storage.geminiKey  :
        provider === "openai"  ? storage.openaiKey  :
                                 storage.perplexityKey;
      if (!activeKey) { noKeyWarning.hidden = false; mainActions.hidden = true; }
      else            { noKeyWarning.hidden = true;  mainActions.hidden = false; }
    }
  }

  // ─── Main home init ─────────────────────────────────────────────────────────

  async function initHome() {
    // Re-read storage in case onboarding just saved keys
    const fresh = await chrome.storage.local.get(["provider", "perplexityKey", "geminiKey", "openaiKey"]);
    if (fresh.provider) provider = fresh.provider;
    Object.assign(storage, fresh);

    await updateHomeKeyWarning();
    renderProviderBadge(provider);
    homeScreen.hidden = false;

    // Detect tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      try {
        const url = new URL(tab.url);
        currentUrlEl.textContent = url.hostname + (url.pathname !== "/" ? url.pathname : "");
        
        // YouTube detection
        isYouTube = url.hostname.includes("youtube.com") && url.pathname.includes("/watch");
        if (isYouTube) {
          youtubeVideoId = url.searchParams.get("v");
        }
      } catch { currentUrlEl.textContent = tab.url; }

      // PDF detection
      isPdf = tab.url.toLowerCase().endsWith(".pdf") ||
              tab.url.includes("application/pdf") ||
              (tab.url.startsWith("chrome-extension://") && tab.url.includes(".pdf"));
      pdfBadge.hidden = !isPdf;
      
      // Update button states for PDF + free users
      updatePdfButtonStates();
    }

    // Restore last session state
    restoreSession(tab);

    // Bind tab to the rest of the logic
    bindTabLogic(tab);
  }

  // ─── Session persistence (sessionStorage) ──────────────────────────────────

  function updatePdfButtonStates() {
    // If PDF and free user, add lock icons and "upgrade" text
    if (isPdf && !userPaid) {
      // Show lock in PDF badge
      if (pdfLock) pdfLock.hidden = false;
      
      // Translate button
      if (translateBtn) {
        const icon = translateBtn.querySelector('.action-icon');
        const strong = translateBtn.querySelector('strong');
        const small = translateBtn.querySelector('small');
        if (icon) icon.textContent = '🔒';
        if (strong) strong.textContent = 'תרגום (PRO)';
        if (small) small.textContent = 'שדרג ל-PRO לפתיחת PDF';
      }
      
      // Summarize button
      if (summarizeBtn) {
        const icon = summarizeBtn.querySelector('.action-icon');
        const strong = summarizeBtn.querySelector('strong');
        const small = summarizeBtn.querySelector('small');
        if (icon) icon.textContent = '🔒';
        if (strong) strong.textContent = 'סיכום (PRO)';
        if (small) small.textContent = 'שדרג ל-PRO לפתיחת PDF';
      }
      
      // Ask Page button
      if (askPageBtn) {
        const icon = askPageBtn.querySelector('.action-icon');
        const strong = askPageBtn.querySelector('strong');
        const small = askPageBtn.querySelector('small');
        if (icon) icon.textContent = '🔒';
        if (strong) strong.textContent = 'שאל על העמוד (PRO)';
        if (small) small.textContent = 'שדרג ל-PRO לפתיחת PDF';
      }
      
      // Phishing Check button
      if (phishingCheckBtn) {
        const icon = phishingCheckBtn.querySelector('.action-icon');
        const strong = phishingCheckBtn.querySelector('strong');
        const small = phishingCheckBtn.querySelector('small');
        if (icon) icon.textContent = '🔒';
        if (strong) strong.textContent = 'בדיקת פישינג (PRO)';
        if (small) small.textContent = 'שדרג ל-PRO לפתיחת PDF';
      }
    } else {
      // Hide lock in PDF badge
      if (pdfLock) pdfLock.hidden = true;
      
      // Restore original button states
      if (translateBtn) {
        const icon = translateBtn.querySelector('.action-icon');
        const strong = translateBtn.querySelector('strong');
        const small = translateBtn.querySelector('small');
        if (icon) icon.textContent = '🌍';
        if (strong) {
          const lang = LANGUAGES.find(l => l.code === targetLang);
          strong.textContent = `תרגום ל${lang?.name || 'עברית'}`;
        }
        if (small) small.textContent = 'תרגום אוטומטי של כל העמוד';
      }
      
      if (summarizeBtn) {
        const icon = summarizeBtn.querySelector('.action-icon');
        const strong = summarizeBtn.querySelector('strong');
        const small = summarizeBtn.querySelector('small');
        if (icon) icon.textContent = '📝';
        if (strong) {
          const lang = LANGUAGES.find(l => l.code === targetLang);
          strong.textContent = `סיכום ב${lang?.name || 'עברית'}`;
        }
        if (small) small.textContent = 'סיכום חכם של התוכן העיקרי';
      }
      
      if (askPageBtn) {
        const icon = askPageBtn.querySelector('.action-icon');
        const strong = askPageBtn.querySelector('strong');
        const small = askPageBtn.querySelector('small');
        if (icon) icon.textContent = '💬';
        if (strong) strong.textContent = 'שאל על העמוד';
        if (small) small.textContent = 'שיחה חופשית עם ה-AI על התוכן';
      }
      
      if (phishingCheckBtn) {
        const icon = phishingCheckBtn.querySelector('.action-icon');
        const strong = phishingCheckBtn.querySelector('strong');
        const small = phishingCheckBtn.querySelector('small');
        if (icon) icon.textContent = '🛡️';
        if (strong) strong.textContent = 'בדיקת פישינג';
        if (small) small.textContent = 'סרוק את הדף לאיתור סימני פישינג';
      }
    }
    
    // YouTube button visibility (only show on YouTube, hide on PDF or other pages)
    if (youtubeSummaryBtn) {
      youtubeSummaryBtn.hidden = !isYouTube;
    }
  }

  function saveSession(screen, extra = {}) {
    try {
      sessionStorage.setItem("pxt_session", JSON.stringify({ screen, ...extra }));
    } catch (_) {}
  }

  function restoreSession(tab) {
    try {
      const raw = sessionStorage.getItem("pxt_session");
      if (!raw) return;
      const sess = JSON.parse(raw);
      // Only restore if same tab URL
      if (sess.tabUrl && tab?.url !== sess.tabUrl) return;
      if (sess.screen === "result" && sess.resultText) {
        const action = sess.action || "translate";
        setHeaderColor(action);
        resultTitle.textContent = action === "translate" ? "🇮🇱 תרגום לעברית" : "📝 סיכום בעברית";
        showResultScreen(false);
        resultSkeleton.hidden = true;
        displayResult(sess.resultText);
        askResultBtn.hidden = false;
        lastPageText = sess.pageText || "";
      }
    } catch (_) {}
  }

  // ─── Main tab-dependent logic (bound after tab is known) ───────────────────

  async function bindTabLogic(tab) {
    console.log("🔗 bindTabLogic called - tab:", tab?.id, "userPaid:", userPaid);
    console.log("🔍 Button elements check:", {
      translateBtn: !!translateBtn,
      summarizeBtn: !!summarizeBtn,
      phishingCheckBtn: !!phishingCheckBtn,
      youtubeSummaryBtn: !!youtubeSummaryBtn,
      askPageBtn: !!askPageBtn
    });
    
    // Log button states
    if (phishingCheckBtn) {
      console.log("🛡️ Phishing button state:", {
        disabled: phishingCheckBtn.disabled,
        hidden: phishingCheckBtn.hidden,
        style: phishingCheckBtn.style.cssText
      });
    }
    if (youtubeSummaryBtn) {
      console.log("🎬 YouTube button state:", {
        disabled: youtubeSummaryBtn.disabled,
        hidden: youtubeSummaryBtn.hidden,
        style: youtubeSummaryBtn.style.cssText
      });
    }


    // ── Nav ──
    backBtn.addEventListener("click", () => { saveSession("home"); showHome(); });
    historyBackBtn.addEventListener("click", () => { saveSession("home"); showHome(); });
    historyBtn.addEventListener("click", showHistoryScreen);
    statsBtn.addEventListener("click", showStatsScreen);
    statsBackBtn.addEventListener("click", showHome);

    resetStatsBtn.addEventListener("click", async () => {
      if (!confirm("לאפס את כל הסטטיסטיקות?")) return;
      await chrome.storage.local.set({ stats: { translates: 0, summarizes: 0, chats: 0, cacheHits: 0 } });
      renderStats();
    });

    // ── Side Panel pin button ──
    if (pinBtn) {
      pinBtn.addEventListener("click", async () => {
        try {
          await chrome.sidePanel.open({ tabId: tab.id });
          window.close();
        } catch (e) {
          console.error("Side panel open error:", e);
        }
      });
    }

    chatBackBtn.addEventListener("click", async () => {
      await saveChatHistory();
      if (chatReturnScreen === "result") {
        resultScreen.hidden = false;
        chatScreen.hidden   = true;
      } else if (chatReturnScreen === "history") {
        showHistoryScreen();
      } else {
        saveSession("home");
        showHome();
      }
    });

    chatClearBtn.addEventListener("click", async () => {
      chatHistory = [];
      chatMessages.innerHTML = "";
      if (chatEntryId) await chrome.storage.local.remove(`chat_${chatEntryId}`);
    });

    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(resultContent.innerText).then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => (copyBtn.textContent = "📋"), 2000);
      });
    });

    rescanBtn.addEventListener("click", async () => {
      const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      if (!tab?.id || !lastAction) return;
      
      // Remove cache
      const cacheKey = `cache_${safeHostname(tab.url ?? "")}_${lastAction}`;
      await chrome.storage.local.remove(cacheKey);
      
      // Remove cache badge if exists
      document.getElementById("cache-badge")?.remove();
      
      // Trigger action again
      await triggerAction(lastAction, tab);
    });

    askResultBtn.addEventListener("click", () => {
      const context  = lastPageText || resultContent.innerText;
      const label    = tab?.title ? tab.title.slice(0, 50) : safeHostname(tab?.url ?? "");
      const tabMeta  = { url: tab?.url ?? "", hostname: safeHostname(tab?.url ?? ""), pageTitle: label, context: context.slice(0, 10000) };
      setHeaderColor("chat");
      showChatScreen(context, label, "result", null, tabMeta);
    });

    askPageBtn.addEventListener("click", async () => {
      if (!tab?.id) return;
      if (isPdf && !userPaid) {
        triggerUpgrade();
        return;
      }
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      } catch (_) {}

      chrome.tabs.sendMessage(tab.id, { action: "getPageText" }, (res) => {
        if (chrome.runtime.lastError || !res?.text) {
          alert("לא ניתן לחלץ טקסט מהעמוד.");
          return;
        }
        const label   = tab.title ? tab.title.slice(0, 50) : safeHostname(tab.url ?? "");
        const tabMeta = { url: tab.url ?? "", hostname: safeHostname(tab.url ?? ""), pageTitle: label, context: res.text.slice(0, 10000) };
        setHeaderColor("chat");
        showChatScreen(res.text, label, "home", null, tabMeta);
      });
    });

    // ── Provider switch ──
    async function applyProvider(newProvider) {
      provider = newProvider;
      chrome.storage.local.set({ provider });
      renderProviderBadge(provider);
      await updateHomeKeyWarning();
    }

    const PROVIDER_CYCLE = ["local", "gemini", "openai", "perplexity"];
    switchProviderBtn.addEventListener("click", () => {
      previousProvider = provider;
      const idx = PROVIDER_CYCLE.indexOf(provider);
      const next = PROVIDER_CYCLE[(idx + 1) % PROVIDER_CYCLE.length];
      applyProvider(next);
      undoProviderBtn.hidden = false;
      if (undoTimeout) clearTimeout(undoTimeout);
      undoTimeout = setTimeout(() => {
        undoProviderBtn.hidden = true;
        previousProvider = null;
      }, 10000);
    });

    undoProviderBtn.addEventListener("click", () => {
      if (!previousProvider) return;
      applyProvider(previousProvider);
      previousProvider = null;
      undoProviderBtn.hidden = true;
      if (undoTimeout) { clearTimeout(undoTimeout); undoTimeout = null; }
    });

    settingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
    goSettingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());

    // ── Translate / Summarize ──
    translateBtn.addEventListener("click", () => {
      console.log("🌍 Translate button clicked!");
      triggerAction("translate", tab);
    });
    summarizeBtn.addEventListener("click", () => {
      console.log("📝 Summarize button clicked!");
      triggerAction("summarize", tab);
    });
    
    console.log("🔵 About to attach phishing listener - phishingCheckBtn exists:", !!phishingCheckBtn);
    
    // Phishing - DIRECT approach, no async wrapper
    if (phishingCheckBtn) {
      phishingCheckBtn.onclick = async function() {
        try {
          console.log("🛡️ [STEP 1] Button clicked!");
          console.log("🛡️ [STEP 2] userPaid:", userPaid, "isPdf:", isPdf);
          console.log("🛡️ [STEP 3] tab:", tab, "tab.id:", tab?.id);
          console.log("🛡️ [STEP 4] About to call triggerAction...");
          
          await triggerAction("phishing", tab);
          
          console.log("🛡️ [STEP 5] triggerAction completed!");
        } catch (error) {
          console.error("🛡️ [ERROR CAUGHT]:", error);
          console.error("🛡️ [ERROR STACK]:", error.stack);
          alert("ERROR: " + error.message);
        }
      };
      console.log("✅ Phishing DIRECT onclick attached");
    }
    
    console.log("🔵 About to attach YouTube listener - youtubeSummaryBtn exists:", !!youtubeSummaryBtn);
    
    // ── YouTube Summary ──
    try {
      if (youtubeSummaryBtn) {
          console.log("✅ YouTube event listener attached");
          youtubeSummaryBtn.addEventListener("click", async () => {
            console.log("🎬 YouTube button clicked! userPaid:", userPaid);
            console.log("🎬 Button element:", youtubeSummaryBtn, "disabled:", youtubeSummaryBtn.disabled, "hidden:", youtubeSummaryBtn.hidden);
          // Check quota for free users
          if (!userPaid) {
            const count = await getFreePremiumCountForToday();
            console.log("🎬 YouTube quota check - userPaid:", userPaid, "count:", count, "limit:", FREE_PREMIUM_FEATURES_DAILY);
            if (count >= FREE_PREMIUM_FEATURES_DAILY) {
              console.log("❌ YouTube quota exceeded, showing upgrade");
              triggerUpgrade();
              return;
            }
            console.log("✅ YouTube quota OK, proceeding");
          }
          
          // Show loading
          const originalHTML = youtubeSummaryBtn.innerHTML;
          youtubeSummaryBtn.innerHTML = `
            <span class="action-icon">⏳</span>
            <div class="action-text">
              <strong>מחלץ תמליל...</strong>
              <small>אנא המתן</small>
            </div>
          `;
          youtubeSummaryBtn.disabled = true;
          
          try {
            // Inject content script
            await chrome.scripting.executeScript({ 
              target: { tabId: tab.id }, 
              files: ["content.js"] 
            });
          } catch (e) {
            console.log("Content script already loaded");
          }

          // Request transcript
          chrome.tabs.sendMessage(
            tab.id, 
            { action: "getYouTubeTranscript", videoId: youtubeVideoId }, 
            async (res) => {
              if (chrome.runtime.lastError || !res?.transcript || res.transcript.length === 0) {
                youtubeSummaryBtn.innerHTML = originalHTML;
                youtubeSummaryBtn.disabled = false;
                alert("❌ לא ניתן לחלץ transcript מהסרטון. ודא שיש כתוביות זמינות.");
                return;
              }

              // Format transcript
              const transcriptText = res.transcript
                .map(t => `[${t.timestamp}] ${t.text}`)
                .join("\n");

              // Auto-open chat with transcript as context
              const videoTitle = tab.title || "YouTube Video";
              showChatScreen(transcriptText, videoTitle, "home");
              
              // Set the prompt
              chatInput.value = `סכם לי את סרטון YouTube הזה בעברית, עם נקודות עיקריות וtimestamps`;
              
              // Auto-send the message!
              setTimeout(async () => {
                sendChatMessage();
                youtubeSummaryBtn.innerHTML = originalHTML;
                youtubeSummaryBtn.disabled = false;
                
                // Bump premium feature usage for free users
                if (!userPaid) {
                  await bumpFreePremiumCount();
                }
              }, 300);
            }
          );
        });
      } else {
        console.error("❌ youtubeSummaryBtn is NULL - cannot attach listener!");
      }
    } catch (err) {
      console.error("❌ ERROR attaching YouTube listener:", err);
    }
    
    console.log("🎉 All event listeners attached successfully!");
    
    // Now update quota display (after buttons exist)
    await updatePremiumFeaturesQuotaDisplay();

    // ── Chat ──
    chatSendBtn.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });

    // ── Clear history ──
    clearHistoryBtn.addEventListener("click", async () => {
      if (!confirm("למחוק את כל ההיסטוריה?")) return;
      await chrome.storage.local.set({ history: [] });
      historySearch.value = "";
      renderHistoryList();
    });

    historySearch.addEventListener("input", () => renderHistoryList(historySearch.value));
  }

  // ─── Screen helpers ─────────────────────────────────────────────────────────

  function showHome() {
    onboardingScreen.hidden = true;
    homeScreen.hidden       = false;
    resultScreen.hidden     = true;
    historyScreen.hidden    = true;
    chatScreen.hidden       = true;
    statsScreen.hidden      = true;
  }

  function showResultScreen(showSkeleton = true) {
    homeScreen.hidden    = true;
    resultScreen.hidden  = false;
    historyScreen.hidden = true;
    chatScreen.hidden    = true;
    statsScreen.hidden   = true;
    resultSkeleton.hidden = !showSkeleton;
    resultContent.hidden = true;
    resultError.hidden   = true;
    askResultBtn.hidden  = true;
    resultContent.innerHTML = "";
    document.getElementById("cache-badge")?.remove();
  }

  function showHistoryScreen() {
    homeScreen.hidden    = true;
    resultScreen.hidden  = true;
    historyScreen.hidden = false;
    chatScreen.hidden    = true;
    statsScreen.hidden   = true;
    historySearch.value  = "";
    renderHistoryList();
  }

  function showChatScreen(context, label, returnTo = "home", entryId = null, tabMeta = null) {
    chatContext      = context;
    chatHistory      = [];
    chatEntryId      = entryId;
    chatTabMeta      = tabMeta;
    chatReturnScreen = returnTo;
    chatContextLabel.textContent = `📄 ${label}`;
    chatMessages.innerHTML = "";
    homeScreen.hidden    = true;
    resultScreen.hidden  = true;
    historyScreen.hidden = true;
    chatScreen.hidden    = false;
    statsScreen.hidden   = true;
    chatInput.focus();
    void updateChatQuotaBar();
    void updateChatInputLockState();
  }

  function showStatsScreen() {
    homeScreen.hidden    = true;
    resultScreen.hidden  = true;
    historyScreen.hidden = true;
    chatScreen.hidden    = true;
    statsScreen.hidden   = false;
    renderStats();
  }

  function setHeaderColor(action) {
    const color = HEADER_COLORS[action] || HEADER_COLORS.translate;
    document.documentElement.style.setProperty("--header-color", color);
    
    // Show/hide rescan button based on action
    if (rescanBtn) {
      rescanBtn.hidden = action !== "phishing";
    }
  }

  // ─── YouTube Summary ────────────────────────────────────────────────────────

  async function triggerYouTubeSummary(tab) {
    if (!tab?.id || !youtubeVideoId) {
      console.error("❌ Missing tab ID or video ID");
      return;
    }

    lastAction = "youtube";
    setHeaderColor("youtube");
    resultTitle.textContent = "🎬 סיכום סרטון YouTube";
    showResultScreen(true);

    resultSkeleton.hidden = false;
    resultContent.hidden = true;
    resultError.hidden = true;

    console.log("🎬 Extracting YouTube transcript for video:", youtubeVideoId);

    // Inject content script
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    } catch (e) {
      console.log("⚠️ Content script already loaded:", e.message);
    }

    // Request transcript
    const res = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: "getYouTubeTranscript", videoId: youtubeVideoId }, (r) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Message error:", chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(r);
        }
      });
    });

    if (!res?.transcript || res.transcript.length === 0) {
      console.error("❌ No transcript received");
      showError("לא נמצאו כתוביות לסרטון זה.\n\n💡 פתרון: לחץ על כפתור 'Show transcript' מתחת לסרטון, ואז לחץ שוב על כפתור התוסף.");
      return;
    }

    console.log("✅ Got transcript with", res.transcript.length, "entries");
    const transcript = res.transcript;
    
    // Format transcript for AI
    const transcriptText = transcript.map(t => `[${t.timestamp}] ${t.text}`).join("\n");
    
    console.log("📡 Sending to AI via sendMessage (non-streaming)...");
    
    // Send to AI using simple sendMessage (NO STREAMING - more reliable!)
    chrome.runtime.sendMessage({ 
      action: "youtube", 
      text: transcriptText, 
      targetLang, 
      promptTemplate: promptTemplateEnabled ? promptTemplate : "default",
      provider
    }, async (apiRes) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Runtime error:", chrome.runtime.lastError.message);
        showError("שגיאת תקשורת: " + chrome.runtime.lastError.message);
        return;
      }
      
      if (!apiRes?.success) {
        console.error("❌ API error:", apiRes?.error);
        showError(apiRes?.error ?? "שגיאה בעיבוד הסרטון.");
        return;
      }
      
      // Success! Display result
      resultSkeleton.hidden = true;
      resultContent.hidden = false;
      displayResult(apiRes.result);
      askResultBtn.hidden = false;
      
      // Save to cache and history
      const cacheKey = `cache_youtube_${youtubeVideoId}`;
      await saveAndCache("youtube", apiRes.result, cacheKey, tab);
      saveSession("result", { action: "youtube", resultText: apiRes.result, pageText: transcriptText, tabUrl: tab.url });
      
      console.log("✅ YouTube summary complete!");
    });
  }

  // ─── Translate / Summarize (streaming) ─────────────────────────────────────

  async function triggerAction(action, tab) {
    console.log(`🎯 [START] triggerAction called - action: ${action}, isPdf: ${isPdf}, userPaid: ${userPaid}`);
    console.log(`🎯 [TAB] tab object:`, tab, "tab.id:", tab?.id);
    
    if (!tab?.id) {
      console.error("❌ [ABORT] triggerAction ABORTED - tab or tab.id is null/undefined!");
      return;
    }
    
    console.log(`🎯 [CHECK 1] Checking PDF + userPaid...`);
    if (isPdf && !userPaid) {
      console.log("❌ [ABORT] PDF + Free user → triggering upgrade");
      triggerUpgrade();
      return;
    }

    console.log(`🎯 [CHECK 2] Checking phishing quota...`);
    // Check quota for premium features (phishing) for free users
    if (!userPaid && action === "phishing") {
      console.log(`🎯 [QUOTA] Getting premium count...`);
      const count = await getFreePremiumCountForToday();
      console.log("🛡️ [QUOTA] Phishing quota check - userPaid:", userPaid, "count:", count, "limit:", FREE_PREMIUM_FEATURES_DAILY);
      if (count >= FREE_PREMIUM_FEATURES_DAILY) {
        console.log("❌ [ABORT] Phishing quota exceeded, showing upgrade");
        triggerUpgrade();
        return;
      }
      console.log("✅ [QUOTA] Phishing quota OK, proceeding");
    }

    console.log(`🎯 [CONTINUE] Quota check passed, continuing...`);
    lastAction = action;  // Track for rescan

    console.log("🎬 [ACTION] triggerAction:", action, "provider:", provider);

    setHeaderColor(action);
    
    // Set appropriate title based on action
    if (action === "phishing") {
      resultTitle.textContent = "🛡️ בדיקת פישינג";
    } else {
      const lang = LANGUAGES.find(l => l.code === targetLang);
      const langName = lang?.name || "עברית";
      resultTitle.textContent = action === "translate" ? `🌍 תרגום ל${langName}` : `📝 סיכום ב${langName}`;
    }
    
    showResultScreen(true);

    // ── Get page text (PDF or regular) ──
    let pageText = null;

    if (isPdf) {
      // Ask background to fetch + extract PDF text
      const pdfRes = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getPdfText", url: tab.url }, (res) => {
          resolve(chrome.runtime.lastError ? null : res);
        });
      });
      pageText = pdfRes?.text || null;
    } else {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      } catch (_) {}
      const res = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: "getPageText" }, (r) => {
          resolve(chrome.runtime.lastError ? null : r);
        });
      });
      pageText = res?.text || null;
    }

    if (!pageText) {
      showError("לא ניתן לחלץ טקסט מהעמוד.");
      return;
    }

    lastPageText = pageText;

    // ── SSL/HTTPS Check (for phishing detection) ──
    let sslInfo = "";
    if (action === "phishing" && tab.url) {
      try {
        const isHttps = tab.url.startsWith("https://");
        const domain = new URL(tab.url).hostname;
        sslInfo = `\n\n[SSL INFO]\nURL: ${tab.url}\nHTTPS: ${isHttps ? "Yes" : "No"}\nDomain: ${domain}`;
      } catch (e) {
        sslInfo = `\n\n[SSL INFO]\nURL: ${tab.url}\nHTTPS: Unknown\nDomain: Unable to parse`;
      }
    }

    // ── Local AI branch (runs entirely in popup, no background needed) ──
    if (provider === "local") {
      await triggerLocalAIAction(action, tab, pageText, sslInfo);
      return;
    }

    // ── Smart cache check ──
    const cacheKey = `cache_${safeHostname(tab.url ?? "")}_${action}`;
    const cached   = await getCachedResult(cacheKey);
    if (cached) {
      resultSkeleton.hidden = true;
      showCachedBadge();
      displayResult(cached.result);
      askResultBtn.hidden = false;
      await bumpStat("cacheHits");
      saveSession("result", { action, resultText: cached.result, pageText, tabUrl: tab.url });
      return;
    }

    // ── Stream ──
    let fullText  = "";
    let streaming = false;
    let port;

    try {
      port = chrome.runtime.connect({ name: "ai-stream" });
    } catch (_) {
      chrome.runtime.sendMessage({ 
        action, 
        text: pageText + sslInfo, 
        targetLang, 
        promptTemplate: promptTemplateEnabled ? promptTemplate : "default",
        provider  // ← ADD THIS!
      }, async (apiRes) => {
        if (chrome.runtime.lastError || !apiRes?.success) {
          showError(apiRes?.error ?? "שגיאה.");
          return;
        }
        displayResult(apiRes.result);
        askResultBtn.hidden = false;
        await saveAndCache(action, apiRes.result, cacheKey, tab);
        saveSession("result", { action, resultText: apiRes.result, pageText, tabUrl: tab.url });
        
        // Bump premium feature usage for phishing (free users)
        if (!userPaid && action === "phishing") {
          await bumpFreePremiumCount();
        }
      });
      return;
    }

    port.onMessage.addListener(async (msg) => {
      if (msg.error) { port.disconnect(); showError(msg.error); return; }

      if (msg.chunk) {
        if (!streaming) {
          streaming = true;
          resultSkeleton.hidden = true;
          resultContent.hidden  = false;
        }
        fullText += msg.chunk;
        resultContent.innerHTML = formatText(fullText);
        resultContent.scrollTop = resultContent.scrollHeight;
      }

      if (msg.done) {
        port.disconnect();
        if (!streaming) { showError("לא התקבלה תשובה מה-AI."); return; }
        askResultBtn.hidden = false;
        await saveAndCache(action, fullText, cacheKey, tab);
        saveSession("result", { action, resultText: fullText, pageText, tabUrl: tab.url });
        
        // Bump premium feature usage for phishing (free users)
        if (!userPaid && action === "phishing") {
          await bumpFreePremiumCount();
        }
      }
    });

    port.onDisconnect.addListener(() => {
      if (!streaming) showError("החיבור לסקריפט הרקע נותק.");
    });

    port.postMessage({ 
      action, 
      text: pageText + sslInfo, 
      targetLang, 
      promptTemplate: promptTemplateEnabled ? promptTemplate : "default",
      provider  // ← ADD THIS!
    });
  }

  async function saveAndCache(action, result, cacheKey, tab) {
    await saveToHistory({
      url: tab.url, hostname: safeHostname(tab.url),
      pageTitle: tab.title || safeHostname(tab.url),
      action, provider, result,
    });
    await chrome.storage.local.set({ [cacheKey]: { result, timestamp: Date.now() } });
    await bumpStat(action === "translate" ? "translates" : "summarizes");
  }

  // ─── Chrome Local AI (runs in popup context) ─────────────────────────────────

  async function triggerLocalAIAction(action, tab, pageText, sslInfo = "") {
    const cacheKey = `cache_${safeHostname(tab.url ?? "")}_${action}_local`;
    const cached   = await getCachedResult(cacheKey);
    if (cached) {
      resultSkeleton.hidden = true;
      showCachedBadge();
      displayResult(cached.result);
      askResultBtn.hidden = false;
      await bumpStat("cacheHits");
      saveSession("result", { action, resultText: cached.result, pageText, tabUrl: tab.url });
      return;
    }

    const aiApi = (typeof ai !== "undefined" && ai) || window.ai;
    if (!aiApi?.languageModel) { showError("Chrome Local AI אינו זמין. אפשר אותו ב-chrome://flags"); return; }

    const text = (pageText + sslInfo).slice(0, MAX_TEXT_LOCAL);
    if ((pageText + sslInfo).length > MAX_TEXT_LOCAL) {
      const warn = document.createElement("div");
      warn.id = "local-truncate-warn";
      warn.textContent = `⚠️ הטקסט נחתך ל-${MAX_TEXT_LOCAL} תווים בגלל מגבלת Chrome Local AI`;
      resultSkeleton.before(warn);
    }

    const systemPrompt = 
      action === "phishing"
        ? `You are a professional security analyst. Perform a comprehensive phishing analysis of this webpage.

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

Now analyze thoroughly in Hebrew. Be detailed and specific.`
        : action === "translate"
        ? "אתה מתרגם מקצועי. תרגם את הטקסט שיינתן לך לעברית. החזר רק את התרגום."
        : "אתה מסכם מקצועי. סכם את הטקסט שיינתן לך בעברית עם bullet points. פתח ב'סיכום:'.";

    let session;
    try {
      session = await aiApi.languageModel.create({
        systemPrompt,
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            if (resultSkeleton && !resultSkeleton.hidden) {
              const pct = e.total ? Math.round((e.loaded / e.total) * 100) : "...";
              const firstLine = resultSkeleton.querySelector(".skel-line");
              if (firstLine) firstLine.dataset.progress = `מוריד מודל: ${pct}%`;
            }
          });
        },
      });
    } catch (err) {
      showError(`שגיאת Chrome Local AI: ${err.message}`);
      return;
    }

    let fullText = "";
    try {
      resultSkeleton.hidden = true;
      resultContent.hidden  = false;

      const stream = session.promptStreaming(text);
      for await (const chunk of stream) {
        fullText = chunk; // Chrome AI returns cumulative text
        resultContent.innerHTML = formatText(fullText);
        resultContent.scrollTop = resultContent.scrollHeight;
      }
    } catch (err) {
      const isQuota = err.name === "QuotaExceededError" || err.message?.includes("quota") || err.message?.includes("token");
      if (isQuota) {
        showError("הטקסט ארוך מדי עבור Chrome Local AI. עבור לספק ענן (Gemini / Perplexity / OpenAI) בהגדרות.");
      } else {
        showError(`שגיאת Local AI: ${err.message}`);
      }
      session.destroy();
      return;
    }

    session.destroy();
    if (!fullText) { showError("לא התקבלה תשובה מה-Local AI."); return; }

    askResultBtn.hidden = false;
    await saveAndCache(action, fullText, cacheKey, tab);
    saveSession("result", { action, resultText: fullText, pageText, tabUrl: tab.url });
  }

  async function sendLocalAIChatMessage(question) {
    const thinkingEl = appendThinking();
    chatSendBtn.disabled = true;

    const aiApi = (typeof ai !== "undefined" && ai) || window.ai;
    if (!aiApi?.languageModel) {
      thinkingEl.remove();
      chatSendBtn.disabled = false;
      appendBubble("assistant", "⚠️ Chrome Local AI אינו זמין. אפשר אותו ב-chrome://flags או עבור לספק ענן.");
      chatHistory.pop();
      return;
    }

    const recentHistory = chatHistory.slice(-6); // last 3 turns for context
    const historyText = recentHistory.slice(0, -1) // exclude the current user message
      .map(m => `${m.role === "user" ? "משתמש" : "עוזר"}: ${m.content}`)
      .join("\n");

    const systemPrompt =
      `אתה עוזר AI שעונה בעברית בלבד. ענה על שאלות המשתמש בהתבסס על התוכן הבא:\n` +
      `---\n${(chatContext || '').slice(0, MAX_TEXT_LOCAL)}\n---`;

    const prompt = historyText ? `${historyText}\nמשתמש: ${question}` : question;

    let session;
    try {
      session = await aiApi.languageModel.create({ systemPrompt });
    } catch (err) {
      thinkingEl.remove();
      chatSendBtn.disabled = false;
      appendBubble("assistant", `⚠️ שגיאת Chrome Local AI: ${err.message}`);
      chatHistory.pop();
      return;
    }

    let fullText = "";
    try {
      const stream = session.promptStreaming(prompt);
      let first = true;
      for await (const chunk of stream) {
        fullText = chunk;
        if (first) { thinkingEl.remove(); first = false; }

        const existing = chatMessages.querySelector(".chat-bubble.assistant.streaming");
        if (existing) {
          existing.innerHTML = formatText(fullText);
        } else {
          const bubble = document.createElement("div");
          bubble.className = "chat-bubble assistant streaming";
          bubble.innerHTML = formatText(fullText);
          chatMessages.appendChild(bubble);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      chatMessages.querySelector(".chat-bubble.assistant.streaming")?.classList.remove("streaming");
    } catch (err) {
      thinkingEl.remove();
      const isQuota = err.name === "QuotaExceededError" || err.message?.includes("quota");
      appendBubble("assistant",
        isQuota
          ? "⚠️ הטקסט ארוך מדי עבור Chrome Local AI. נסה שאלה קצרה יותר, או עבור לספק ענן בהגדרות."
          : `⚠️ שגיאת Local AI: ${err.message}`
      );
      chatHistory.pop();
      session.destroy();
      chatSendBtn.disabled = false;
      return;
    }

    session.destroy();
    chatHistory.push({ role: "assistant", content: fullText });
    chatInput.focus();
    chatSendBtn.disabled = false;

    if (!chatEntryId && chatTabMeta && chatHistory.length === 2) {
      const newId = await saveToHistory({
        url: chatTabMeta.url, hostname: chatTabMeta.hostname,
        pageTitle: chatTabMeta.pageTitle, action: "chat",
        provider: "local", result: fullText, context: chatTabMeta.context,
      });
      chatEntryId = newId;
    }
    await saveChatHistory();
    await bumpStat("chats");
    await incrementFreeChatOnSuccess();
  }

  async function getCachedResult(key) {
    const data = await chrome.storage.local.get(key);
    const entry = data[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) { await chrome.storage.local.remove(key); return null; }
    return entry;
  }

  function showCachedBadge() {
    const badge = document.createElement("div");
    badge.id = "cache-badge";
    badge.innerHTML = `
      <span>⚡ מהמטמון – תוצאה שמורה</span>
      <button id="rescan-btn" title="סרוק מחדש">🔄</button>
    `;
    resultContent.before(badge);
    
    // Add click handler for rescan
    document.getElementById("rescan-btn")?.addEventListener("click", async () => {
      // Clear cache and re-trigger action
      const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      if (!tab?.id) return;
      
      // Remove cache
      const cacheKey = `cache_${safeHostname(tab.url ?? "")}_${lastAction}`;
      await chrome.storage.local.remove(cacheKey);
      
      // Remove badge and re-trigger
      document.getElementById("cache-badge")?.remove();
      await triggerAction(lastAction, tab);
    });
  }

  // ─── Chat ───────────────────────────────────────────────────────────────────

  async function sendChatMessage() {
    const question = chatInput.value.trim();
    if (!question || chatSendBtn.disabled) return;

    if (!userPaid) {
      const c = await getFreeChatCountForToday();
      if (c >= FREE_CHAT_DAILY) {
        triggerUpgrade();
        return;
      }
    }

    chatInput.value = "";
    appendBubble("user", question);
    chatHistory.push({ role: "user", content: question });

    // Local AI is handled entirely in popup (no background needed)
    if (provider === "local") {
      await sendLocalAIChatMessage(question);
      return;
    }

    chatSendBtn.disabled = true;
    const thinkingEl = appendThinking();

    chrome.runtime.sendMessage(
      { action: "chat", context: chatContext, messages: chatHistory },
      async (res) => {
        thinkingEl.remove();
        chatSendBtn.disabled = false;

        if (chrome.runtime.lastError || !res?.success) {
          const errMsg = res?.error ?? chrome.runtime.lastError?.message ?? "שגיאה לא ידועה.";
          appendBubble("assistant", `⚠️ שגיאה: ${errMsg}`);
          chatHistory.pop();
          return;
        }

        chatHistory.push({ role: "assistant", content: res.result });
        appendBubble("assistant", res.result);
        chatInput.focus();

        // Auto-create history entry for brand-new chats (first exchange)
        if (!chatEntryId && chatTabMeta && chatHistory.length === 2) {
          const newId = await saveToHistory({
            url:       chatTabMeta.url,
            hostname:  chatTabMeta.hostname,
            pageTitle: chatTabMeta.pageTitle,
            action:    "chat",
            provider,
            result:    res.result,
            context:   chatTabMeta.context,
          });
          chatEntryId = newId;
        }

        await saveChatHistory();
        await bumpStat("chats");
        await incrementFreeChatOnSuccess();
      }
    );
  }

  async function saveChatHistory() {
    if (!chatEntryId || chatHistory.length === 0) return;
    await chrome.storage.local.set({
      [`chat_${chatEntryId}`]: { messages: chatHistory, timestamp: Date.now() },
    });
  }

  async function loadChatHistory(entryId) {
    if (!entryId) return [];
    const data = await chrome.storage.local.get(`chat_${entryId}`);
    return data[`chat_${entryId}`]?.messages || [];
  }

  function appendBubble(role, text) {
    const div = document.createElement("div");
    div.className = `chat-bubble ${role}`;
    div.innerHTML = role === "assistant" ? formatText(text) : escapeHtml(text);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  function appendThinking() {
    const div = document.createElement("div");
    div.className = "chat-bubble thinking";
    div.innerHTML = `<span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  // ─── History ────────────────────────────────────────────────────────────────

  async function saveToHistory(entry) {
    const { history = [] } = await chrome.storage.local.get("history");
    const newEntry = { id: Date.now().toString(), timestamp: Date.now(), ...entry };
    await chrome.storage.local.set({ history: [newEntry, ...history].slice(0, MAX_HISTORY) });
    return newEntry.id;
  }

  async function renderHistoryList(filterQuery = "") {
    const { history = [] } = await chrome.storage.local.get("history");
    historyList.innerHTML  = "";
    historyNoResults.hidden = true;

    if (history.length === 0) { historyEmpty.hidden = false; return; }
    historyEmpty.hidden = true;

    const q = filterQuery.trim().toLowerCase();
    const filtered = q
      ? history.filter((e) =>
          e.pageTitle.toLowerCase().includes(q) || e.hostname.toLowerCase().includes(q))
      : history;

    if (filtered.length === 0) { historyNoResults.hidden = false; return; }

    // Load all chat keys at once for badge display
    const chatKeys = filtered.map((e) => `chat_${e.id}`);
    const chatData = await chrome.storage.local.get(chatKeys);

    filtered.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const icon     = entry.action === "translate" ? "🇮🇱" : entry.action === "chat" ? "💬" : "📝";
      const timeStr  = formatTimestamp(entry.timestamp);
      const pLabel   =
        entry.provider === "gemini"     ? "Gemini"  :
        entry.provider === "openai"     ? "OpenAI"  :
        entry.provider === "local"      ? "Local AI" :
        "Perplexity";
      const chatSaved = chatData[`chat_${entry.id}`];
      const chatCount = chatSaved?.messages?.length ? Math.ceil(chatSaved.messages.length / 2) : 0;

      const preview = entry.result?.replace(/<[^>]*>/g, "").slice(0, 130).trim() + "...";

      li.innerHTML = `
        <div class="history-preview">${escapeHtml(preview)}</div>
        <span class="history-item-icon">${icon}</span>
        <div class="history-item-body">
          <div class="history-item-title">${escapeHtml(entry.pageTitle)}</div>
          <div class="history-item-url">${escapeHtml(entry.hostname)}</div>
          <div class="history-item-meta">
            <span>${timeStr}</span>
            <span class="provider-dot ${entry.provider}"></span>
            <span>${pLabel}</span>
          </div>
        </div>
        ${chatCount > 0 ? `<span class="history-chat-count" title="${chatCount} הודעות שמורות">💬 ${chatCount}</span>` : ""}
        <button class="history-chat-btn" title="שאל שאלה">💬</button>
        <button class="history-download-btn" title="הורד כ-Markdown">📥</button>
        <button class="history-delete-btn" title="מחק">✕</button>
      `;

      li.querySelector(".history-item-body").addEventListener("click",  () => openHistoryEntry(entry));
      li.querySelector(".history-item-icon").addEventListener("click",  () => openHistoryEntry(entry));
      li.querySelector(".history-chat-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        await openHistoryChat(entry);
      });
      li.querySelector(".history-download-btn").addEventListener("click", (e) => {
        e.stopPropagation(); downloadHistoryEntry(entry);
      });
      li.querySelector(".history-delete-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        await chrome.storage.local.remove([`chat_${entry.id}`]);
        await deleteHistoryEntry(entry.id);
        renderHistoryList(historySearch.value);
      });

      historyList.appendChild(li);
    });
  }

  function openHistoryEntry(entry) {
    if (entry.action === "chat") {
      // Chat entries open directly into the chat screen
      openHistoryChat(entry);
      return;
    }
    setHeaderColor(entry.action);
    resultTitle.textContent = entry.action === "translate" ? "🇮🇱 תרגום לעברית" : "📝 סיכום בעברית";
    showResultScreen(false);
    resultSkeleton.hidden = true;
    displayResult(entry.result);
    lastPageText = entry.result;
    askResultBtn.hidden = false;
  }

  async function openHistoryChat(entry) {
    let actionLabel;
    if (entry.action === "translate")   actionLabel = "תרגום";
    else if (entry.action === "chat")   actionLabel = "שיחה";
    else                                actionLabel = "סיכום";
    const label   = `${actionLabel} – ${entry.hostname}`;
    // For chat entries, use the saved context if available; otherwise use result text
    const context = entry.context || entry.result;
    setHeaderColor("chat");
    showChatScreen(context, label, "history", entry.id);

    // Restore saved chat messages
    const saved = await loadChatHistory(entry.id);
    if (saved.length > 0) {
      chatHistory = saved;
      saved.forEach((msg) => appendBubble(msg.role, msg.content));
    }
  }

  async function deleteHistoryEntry(id) {
    const { history = [] } = await chrome.storage.local.get("history");
    await chrome.storage.local.set({ history: history.filter((e) => e.id !== id) });
  }

  function downloadHistoryEntry(entry) {
    const actionLabel = entry.action === "translate" ? "תרגום" : entry.action === "chat" ? "שיחה" : "סיכום";
    const date        = new Date(entry.timestamp).toLocaleString("he-IL");
    const prov        = entry.provider === "gemini" ? "Google Gemini" : "Perplexity Sonar";
    const safeTitle   = entry.pageTitle.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 50);

    const content = [
      `# ${actionLabel} – ${entry.pageTitle}`,
      "",
      `- **אתר:** ${entry.hostname}`,
      `- **תאריך:** ${date}`,
      `- **ספק:** ${prov}`,
      "",
      "---",
      "",
      entry.result,
    ].join("\n");

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${safeTitle}-${entry.action}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async function bumpStat(key) {
    const { stats = {} } = await chrome.storage.local.get("stats");
    stats[key] = (stats[key] || 0) + 1;
    await chrome.storage.local.set({ stats });
  }

  async function renderStats() {
    const { stats = {} } = await chrome.storage.local.get("stats");
    const t = stats.translates  || 0;
    const s = stats.summarizes  || 0;
    const c = stats.chats       || 0;
    const h = stats.cacheHits   || 0;
    document.getElementById("stat-translates").textContent = t;
    document.getElementById("stat-summarizes").textContent = s;
    document.getElementById("stat-chats").textContent      = c;
    document.getElementById("stat-cache").textContent      = h;
    document.getElementById("stat-total").textContent      = t + s + c;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function displayResult(text) {
    resultSkeleton.hidden = true;
    resultError.hidden    = true;
    resultContent.hidden  = false;
    resultContent.innerHTML = formatText(text);
  }

  function showError(msg) {
    resultSkeleton.hidden = true;
    resultContent.hidden  = true;
    resultError.hidden    = false;
    resultError.innerHTML = `<span>⚠️</span><p>${escapeHtml(msg)}</p>`;
  }

  function formatText(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^#{1,3}\s(.+)$/gm, "<h3>$1</h3>")
      .replace(/^[-•]\s(.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      .replace(/\n\n+/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function safeHostname(url) {
    try { return new URL(url).hostname; } catch { return url; }
  }

  function formatTimestamp(ts) {
    const diff = Date.now() - ts;
    const min  = Math.floor(diff / 60000);
    const hr   = Math.floor(diff / 3600000);
    const day  = Math.floor(diff / 86400000);
    if (min < 1)   return "עכשיו";
    if (min < 60)  return `לפני ${min} דקות`;
    if (hr < 24)   return `לפני ${hr} שעות`;
    if (day === 1) return "אתמול";
    return `לפני ${day} ימים`;
  }

  function renderProviderBadge(p) {
    const map = {
      local:       { text: "🖥️ Chrome Local AI", cls: "local"       },
      gemini:      { text: "✨ Gemini 2.5 Flash", cls: "gemini"      },
      openai:      { text: "🤖 ChatGPT (gpt-4o-mini)", cls: "openai" },
      perplexity:  { text: "🔵 Perplexity Sonar", cls: "perplexity" },
    };
    const { text, cls } = map[p] || map.perplexity;
    providerBadge.textContent = text;
    providerBadge.className   = `badge ${cls}`;
  }
});

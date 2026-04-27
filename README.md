# 🌐 PagePal - AI-Powered Smart Browsing Assistant

**Version 3.2.0** | A Chrome extension for translation, summarization, chat, phishing detection, and YouTube video summarization.

---

## 🎯 What is PagePal?

PagePal transforms how you consume content on the web. With AI-powered features, you can translate entire webpages, get instant summaries, chat with page content, detect phishing attempts, and summarize YouTube videos - all with a single click.

### ✨ Key Features

- **🌍 Translation** - Translate any webpage to Hebrew or 11 other languages (unlimited)
- **📝 Smart Summarization** - Get concise bullet-point summaries of long content (unlimited)
- **💬 Chat with Pages** - Ask questions about page content (5 per day free)
- **🛡️ Phishing Detection** - AI-powered security scanning (3 per day free)
- **🎬 YouTube Summarization** - Auto-extract and summarize video transcripts with timestamps (3 per day free)
- **📄 PDF Support** - Works with PDF files (PRO only)

---

## 🚀 Quick Start

### Installation

#### Step 1: Download the Extension

**Option A: Download ZIP**
1. Click the green **"Code"** button at the top of this page
2. Select **"Download ZIP"**
3. Extract the ZIP file to a folder on your computer

**Option B: Clone with Git**
```bash
git clone https://github.com/YOUR_USERNAME/pagepal.git
cd pagepal
```

#### Step 2: Install in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the folder containing the extracted/cloned files
6. ✅ PagePal is now installed!

You should see the PagePal icon in your Chrome toolbar.

---

## ⚙️ Setup & Configuration

### Choose Your AI Provider

PagePal supports 4 AI providers. Choose one that fits your needs:

#### Option 1: Chrome Local AI (Recommended - 100% Free!)

**Best for: Privacy, offline use, zero cost**

1. **Requirements**: Chrome 127+ (Canary/Dev/Beta channel)
2. Enable the flag: Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
3. Set to **"Enabled"**
4. Restart Chrome
5. First use will download the AI model (~1.7GB)

**Advantages:**
- ✅ Completely free
- ✅ Works offline
- ✅ 100% private (no data sent anywhere)
- ✅ No API key required

**Limitations:**
- ⚠️ Requires Chrome 127+
- ⚠️ Smaller context window (6,000 chars vs 48,000)

---

#### Option 2: Google Gemini (Free Tier - Recommended!)

**Best for: Fast, free cloud AI with generous limits**

1. Visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Choose an existing project or create a new one
5. Copy the API key (starts with `AIza...`)
6. Open PagePal → Click ⚙️ Settings
7. Select **"Google Gemini"** as provider
8. Paste your API key
9. Click **"Save"**

**Free Tier Includes:**
- ✅ 15 requests per minute
- ✅ 1,500 requests per day
- ✅ 1 million tokens per month
- ✅ No credit card required

**Model Used:** `gemini-2.5-flash` - Fast, smart, and free for regular use!

---

#### Option 3: OpenAI ChatGPT

**Best for: High quality responses, affordable pricing**

1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the API key (starts with `sk-proj-...`)
5. Open PagePal → Settings → Select **"ChatGPT"**
6. Paste your API key → Save

**Pricing:** ~$0.15 per 1M tokens (very cheap)  
**Model Used:** `gpt-4o-mini`

---

#### Option 4: Perplexity Sonar

**Best for: Advanced AI responses**

1. Visit [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Generate API key
3. Open PagePal → Settings → Select **"Perplexity"**
4. Paste your API key → Save

**Pricing:** Requires paid plan after free tier  
**Model Used:** `sonar`

---

## 📖 How to Use

### Translate a Webpage

1. Navigate to any webpage
2. Click the PagePal icon in your toolbar
3. Click **"🇮🇱 תרגם"** (Translate)
4. The page content will be translated instantly

**Supports 12 languages:**
English, Hebrew, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic

---

### Summarize a Webpage

1. Navigate to any webpage with content
2. Click the PagePal icon
3. Click **"📝 סכם"** (Summarize)
4. Get a concise bullet-point summary (5-7 key points)

**Perfect for:**
- Long articles
- Research papers
- Documentation
- News articles
- Blog posts

---

### Chat with a Page

1. Navigate to any webpage
2. Click the PagePal icon
3. Click **"💬 שאל שאלה"** (Ask a Question)
4. Type your question about the page content
5. Get AI-powered answers based on the page

**Example Questions:**
- "What is the main argument of this article?"
- "Explain the section about cloud architecture"
- "Summarize the pricing information"

**Free Tier:** 5 questions per day  
**PRO:** Unlimited questions

---

### Phishing Detection

1. Navigate to a suspicious webpage
2. Click the PagePal icon
3. Click **"🛡️ בדיקת פישינג"** (Phishing Check)
4. Get a detailed security report within seconds

**AI Analyzes:**
- Suspicious URLs
- Credit card requests
- Threatening language
- Grammar/spelling errors
- Fake urgency tactics
- Domain authenticity

**Free Tier:** 3 checks per day  
**PRO:** Unlimited checks

---

### YouTube Video Summarization

1. Open any YouTube video (with captions)
2. Click the PagePal icon
3. Click **"🎬 סכם YouTube"** (Summarize YouTube)
4. Get an automatic summary with timestamps

**Output Format:**
```
Summary:
- Main point 1 (at 05:30)
- Main point 2 (at 12:45)
- Main point 3 (at 18:20)
...
```

**Perfect for:**
- Long lectures
- Tutorial videos
- Conference talks
- Podcasts
- Educational content

**Free Tier:** 3 summaries per day  
**PRO:** Unlimited summaries

---

### PDF Support (PRO Only)

1. Open any PDF file in Chrome
2. Click the PagePal icon
3. Use translate, summarize, or chat features
4. Works with both online PDFs and local files

**Requires:** PRO subscription

---

## 💎 Freemium Model

### ✅ Free Tier

- **Translation:** Unlimited ✨
- **Summarization:** Unlimited ✨
- **Chat (Ask Page):** 5 per day
- **YouTube Summarization:** 3 per day
- **Phishing Detection:** 3 per day
- **Quota Reset:** Daily at midnight 🕛

### 🚀 PRO Tier

Everything in Free Tier, plus:
- **Unlimited chat messages**
- **Unlimited YouTube summaries**
- **Unlimited phishing checks**
- **Full PDF support** (translate, summarize, chat)
- **Priority support**
- **All future updates**

[**Upgrade to PRO →**](https://lemonsqueezy.com)

---

## 🔒 Privacy & Security

### 🛡️ Security Rating: A

PagePal has undergone comprehensive security audits and follows industry best practices.

### What We DO:
- ✅ Store API keys **locally only** (never sent to our servers)
- ✅ Send page content **only** to your chosen AI provider
- ✅ Implement XSS protection (`escapeHtml()` sanitization)
- ✅ Use minimal Chrome permissions
- ✅ Implement browser fingerprinting to prevent quota bypass
- ✅ Open-source code (review it yourself!)

### What We DON'T:
- ❌ Collect personal data
- ❌ Track browsing history
- ❌ Store page content
- ❌ Share data with third parties
- ❌ Use invasive permissions

### Chrome Permissions Explained:

- `activeTab` - Access current tab when you click the extension
- `storage` - Save your settings and API keys locally
- `scripting` - Extract page text for translation/summarization
- `commands` - Keyboard shortcuts (Cmd+Shift+Y)
- `sidePanel` - Optional side panel view

### API Keys Security:
Your API keys are stored in `chrome.storage.local` and **never leave your device**. They are sent directly from your browser to the AI provider you chose (Google, OpenAI, Perplexity).

---

## ⚙️ Advanced Settings

### Keyboard Shortcuts

- **Open PagePal:** `Cmd+Shift+Y` (Mac) / `Ctrl+Shift+Y` (Windows/Linux)

### Side Panel

Pin PagePal to Chrome's side panel for persistent access:
1. Click PagePal icon
2. Right-click → **"Pin to Side Panel"**
3. Access PagePal without opening popup

---

## 🐛 Troubleshooting

### Extension Not Working?

1. Ensure Chrome is up-to-date (version 127+ for Local AI)
2. Check that you've entered a valid API key (if not using Local AI)
3. Try refreshing the webpage
4. Check Chrome DevTools console for errors

### Chrome Local AI Not Working?

1. **Verify Chrome Version:** Must be 127+ (Canary/Dev/Beta)
2. **Enable Flag:** `chrome://flags/#prompt-api-for-gemini-nano` must be "Enabled"
3. **Restart Chrome:** Completely quit and reopen
4. **First Use:** Model download (~1.7GB) happens on first use - be patient
5. **Check Status:** Open DevTools → Console → Run `await ai.languageModel.capabilities()`

### Quota Limit Reached?

- Free quotas reset daily at midnight
- See countdown timer in the extension popup
- Upgrade to PRO for unlimited access

### API Key Errors?

- **Google Gemini:** Verify key starts with `AIza` (not `AIzS`)
- **OpenAI:** Verify key starts with `sk-proj-`
- **Perplexity:** Verify key starts with `pplx-`
- Regenerate key if needed

### YouTube Summarization Not Working?

- Video must have captions/subtitles enabled
- Auto-generated captions work too
- Videos without any captions won't work

---

## 🏗️ Technical Details

### Tech Stack

- **Frontend:** Vanilla JavaScript (no frameworks for optimal performance)
- **Chrome APIs:** Storage, Identity, Scripting, Commands, Side Panel
- **AI Providers:** Chrome AI API, Google Gemini API, OpenAI API, Perplexity API
- **Payment:** Lemon Squeezy (Merchant of Record)
- **License Validation:** Server-side API with 24h cache

### File Structure

```
pagepal/
├── manifest.json          # Extension configuration (Manifest v3)
├── background.js          # Service worker (AI request handling)
├── popup.js/html/css      # Main popup interface
├── options.js/html/css    # Settings page
├── content.js             # Content script (page text extraction)
├── sidepanel.html         # Side panel view
├── modal.css              # Modal styling
├── icons/                 # Extension icons (16, 32, 48, 128)
└── README.md              # This file
```

### Architecture Highlights

- **Manifest v3:** Latest Chrome extension standard
- **Service Worker:** Background processing for AI requests
- **Content Scripts:** Extract page text without impacting performance
- **Chrome Storage API:** Local and sync storage for settings
- **Browser Fingerprinting:** SHA-256 hash for quota enforcement

---

## 📊 Usage Statistics

Track your usage in Settings:
- Total translations
- Total summaries
- Total chat messages
- Today's quota usage
- Time until quota reset

---

## 🔮 Roadmap

Planned features for future releases:

- [ ] Chrome Web Store publication
- [ ] Browser history chat (chat across multiple pages)
- [ ] Custom AI prompts
- [ ] Team licenses (for organizations)
- [ ] Export chat history as PDF/Markdown
- [ ] Firefox & Edge support
- [ ] Real-time collaboration features
- [ ] Voice input for questions
- [ ] OCR support for image-heavy PDFs

---

## 🤝 Contributing

This is a proprietary project, but we welcome:
- **Bug Reports:** Open an issue on GitHub
- **Feature Requests:** Let us know what you'd like to see
- **Translations:** Help translate the UI to more languages

---

## 📞 Support

### For Users

- **Bug Reports:** [GitHub Issues](https://github.com/YOUR_USERNAME/pagepal/issues)
- **Feature Requests:** [GitHub Discussions](https://github.com/YOUR_USERNAME/pagepal/discussions)
- **Email Support:** gabaygabaymaor123@gmail.com

### For Developers

Want to fork this project? Contact us for licensing inquiries.

---

## 📄 License

**Proprietary License**  
All rights reserved.

This software is provided for personal use only. You may install and use PagePal, but you may not:
- Redistribute the code
- Create derivative works
- Use for commercial purposes without permission

For licensing inquiries: gabaygabaymaor123@gmail.com

---

## 🙏 Acknowledgments

- **Google Gemini** - Free AI API with generous limits
- **Chrome Team** - Built-in AI APIs and excellent extension platform
- **OpenAI** - High-quality AI models
- **Perplexity** - Advanced AI capabilities
- **Lemon Squeezy** - Payment processing & merchant of record

---

## 📈 Changelog

### v3.2.0 (April 2026) - Current Release
- ✅ YouTube video summarization with transcript extraction
- ✅ Phishing detection feature
- ✅ Freemium quota system (5 chat/day, 3 premium/day)
- ✅ Quota countdown timer
- ✅ Browser fingerprinting for quota enforcement
- ✅ Security enhancements (A- rating)
- ✅ UI improvements with quota indicators

### v3.1.0 (March 2026)
- ✨ Migrated from ExtensionPay to Lemon Squeezy
- ✨ Added Google Sign-In for cross-device sync
- ✨ Improved license validation (24h cache)
- ✨ Enhanced freemium model
- ✨ Better PDF detection
- ✨ PRO badges in UI

### v3.0.0 (March 2026)
- 🎉 Initial release
- 🌍 Translation feature
- 📝 Summarization feature
- 💬 Chat with pages
- 📄 PDF support
- 🤖 Multiple AI providers
- 📊 Usage statistics

---

## ⭐ Show Your Support

If you find PagePal useful:
- ⭐ Star this repository
- 🐦 Share on social media
- 💬 Leave feedback
- 🔄 Share with colleagues

---

## 💬 Community

- **Website:** Coming soon
- **Twitter:** Coming soon
- **Discord:** Coming soon
- **LinkedIn:** Coming soon

---

**Made with ❤️ by the PagePal Team**

*Transform the web, one page at a time.*

---

## 📸 Screenshots

(Coming soon - add screenshots of the extension in action)

---

## ❓ FAQ

**Q: Is PagePal really free?**  
A: Yes! Translation and summarization are unlimited. Advanced features have generous daily quotas (5-3 per day).

**Q: Do you store my data?**  
A: No! We don't collect, store, or transmit your personal data. Everything happens locally or goes directly to your chosen AI provider.

**Q: Which AI provider should I choose?**  
A: 
- **Privacy-focused:** Chrome Local AI (free, offline)
- **Best balance:** Google Gemini (free, fast, generous limits)
- **Highest quality:** OpenAI ChatGPT (affordable, excellent results)

**Q: Does it work on PDFs?**  
A: Yes! PDF support (translate, summarize, chat) is available for PRO users.

**Q: Does it work on YouTube?**  
A: Yes! Extract and summarize video transcripts with timestamps. 3 per day free, unlimited with PRO.

**Q: Is it safe?**  
A: Yes! PagePal has passed comprehensive security audits with an A- rating (90/100).

**Q: Can I use it offline?**  
A: Yes, if you use Chrome Local AI. Cloud AI providers require internet connection.

**Q: How do I upgrade to PRO?**  
A: Click the upgrade button in the extension → Complete payment via Lemon Squeezy → Enter your license key.

**Q: Can I get a refund?**  
A: Yes, contact support within 14 days for a full refund, no questions asked.

---

**Thank you for using PagePal!** 🎉

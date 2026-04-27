(() => {
  if (window.__pxtLoaded) return;
  window.__pxtLoaded = true;

  // ─── Page text extraction ──────────────────────────────────────────────────

  function extractPageText() {
    const clone = document.body.cloneNode(true);
    clone
      .querySelectorAll(
        "script,style,noscript,nav,footer,header,iframe,[aria-hidden='true'],.ad,#ad,[class*='banner'],[id*='banner']"
      )
      .forEach((el) => el.remove());
    return clone.innerText.replace(/\s{3,}/g, "\n\n").trim();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
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

  // ─── In-page modal ─────────────────────────────────────────────────────────

  function ensureModal() {
    let overlay = document.getElementById("pxt-modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "pxt-modal-overlay";
    overlay.innerHTML = `
      <div id="pxt-modal">
        <div id="pxt-modal-header">
          <div id="pxt-modal-title">
            <span id="pxt-modal-icon">🤖</span>
            <span id="pxt-modal-label">AI Translator</span>
          </div>
          <div id="pxt-modal-actions">
            <button id="pxt-copy-btn" title="העתק">📋</button>
            <button id="pxt-close-btn" title="סגור">✕</button>
          </div>
        </div>
        <div id="pxt-modal-body">
          <div id="pxt-loading">
            <div class="pxt-spinner"></div>
            <p id="pxt-loading-text">מעבד...</p>
          </div>
          <div id="pxt-content" dir="rtl" lang="he" hidden></div>
          <div id="pxt-error" hidden></div>
        </div>
        <div id="pxt-modal-footer">
          <span id="pxt-source-label"></span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById("pxt-close-btn").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById("pxt-copy-btn").addEventListener("click", () => {
      const c = document.getElementById("pxt-content");
      if (!c) return;
      navigator.clipboard.writeText(c.innerText).then(() => {
        const btn = document.getElementById("pxt-copy-btn");
        btn.textContent = "✅";
        setTimeout(() => (btn.textContent = "📋"), 2000);
      });
    });

    return overlay;
  }

  function showModalLoading(action, label) {
    const overlay = ensureModal();
    overlay.style.display = "flex";
    document.getElementById("pxt-loading").hidden = false;
    document.getElementById("pxt-content").hidden = true;
    document.getElementById("pxt-error").hidden = true;
    document.getElementById("pxt-modal-label").textContent =
      action === "translate" ? "מתרגם לעברית..." : action === "summarize" ? "מסכם בעברית..." : "מעבד...";
    document.getElementById("pxt-loading-text").textContent = "שולח לעיבוד...";
    document.getElementById("pxt-source-label").textContent = label || window.location.hostname;
    return overlay;
  }

  function showModalResult(text, action) {
    document.getElementById("pxt-loading").hidden = true;
    document.getElementById("pxt-error").hidden = true;
    const content = document.getElementById("pxt-content");
    content.hidden = false;
    content.innerHTML = formatText(text);
    document.getElementById("pxt-modal-label").textContent =
      action === "translate" ? "תרגום לעברית" : action === "summarize" ? "סיכום בעברית" : "תוצאה";
    document.getElementById("pxt-modal-icon").textContent =
      action === "translate" ? "🇮🇱" : action === "summarize" ? "📝" : "🤖";
  }

  function showModalError(msg) {
    const loading = document.getElementById("pxt-loading");
    const error = document.getElementById("pxt-error");
    if (loading) loading.hidden = true;
    if (error) { error.hidden = false; error.innerHTML = `<span>⚠️</span><p>${escapeHtml(msg)}</p>`; }
    const label = document.getElementById("pxt-modal-label");
    if (label) label.textContent = "שגיאה";
  }

  // ─── Selection tooltip ─────────────────────────────────────────────────────

  let tooltipEl = null;
  let tooltipTimeout = null;

  function removeTooltip() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    if (tooltipTimeout) { clearTimeout(tooltipTimeout); tooltipTimeout = null; }
  }

  function showTooltip(selectedText, rect) {
    removeTooltip();

    tooltipEl = document.createElement("div");
    tooltipEl.id = "pxt-tooltip";
    tooltipEl.innerHTML = `
      <button data-action="translate" title="תרגם לעברית">🇮🇱 תרגם</button>
      <button data-action="summarize" title="סכם בעברית">📝 סכם</button>
    `;

    // Position above the selection
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    tooltipEl.style.cssText = `
      position: absolute;
      top: ${rect.top + scrollY - 48}px;
      left: ${rect.left + scrollX + rect.width / 2}px;
      transform: translateX(-50%);
      z-index: 2147483647;
    `;

    document.body.appendChild(tooltipEl);

    tooltipEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        removeTooltip();
        processSelectedText(action, selectedText);
      });
    });

    // Auto-hide after 6 seconds
    tooltipTimeout = setTimeout(removeTooltip, 6000);
  }

  async function processSelectedText(action, text) {
    showModalLoading(action, `טקסט נבחר (${text.length} תווים)`);

    chrome.runtime.sendMessage(
      { action, text },
      (response) => {
        if (chrome.runtime.lastError) {
          showModalError("שגיאת תקשורת: " + chrome.runtime.lastError.message);
          return;
        }
        if (response?.success) {
          showModalResult(response.result, action);
        } else {
          showModalError(response?.error ?? "שגיאה לא ידועה.");
        }
      }
    );
  }

  document.addEventListener("mouseup", (e) => {
    // Don't trigger inside our own modal / tooltip
    if (e.target.closest("#pxt-modal-overlay") || e.target.closest("#pxt-tooltip")) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text.length < 20) {
      removeTooltip();
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      showTooltip(text, rect);
    } catch (_) {}
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") removeTooltip();
  });

  // ─── YouTube Transcript Extraction ─────────────────────────────────────────
  
  // Utility: Wait for element to appear
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      let timeoutId;
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // Helper: Parse YouTube timestamp (MM:SS or HH:MM:SS) to seconds
  function parseYouTubeTimestamp(timeStr) {
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
  }

  async function extractYouTubeTranscript(videoId) {
    console.log("🎬 Starting YouTube transcript extraction for:", videoId);
    
    try {
      // METHOD 1: Try to get caption tracks from ytInitialPlayerResponse (API data)
      console.log("🔍 Method 1: Extracting from page data (ytInitialPlayerResponse)...");
      
      const apiTranscript = await extractFromYouTubeAPI(videoId);
      if (apiTranscript && apiTranscript.length > 0) {
        console.log("✅ Successfully extracted via API:", apiTranscript.length, "entries");
        return apiTranscript;
      }
      
      // METHOD 2: Fallback to UI extraction
      console.log("⚠️ API method failed, trying UI extraction...");
      
      const transcriptContainerSelector = '#segments-container';
      let transcriptContainer = document.querySelector(transcriptContainerSelector);

      // If already open, extract immediately
      if (transcriptContainer && transcriptContainer.offsetParent) {
        console.log("✅ Transcript panel already open - reading it!");
        return await extractTranscriptFromPanel(transcriptContainer);
      }

      // Try to open transcript panel
      console.log("📂 Opening transcript panel...");
      
      // Step 1: Expand description
      const moreButton = document.querySelector('#expand, tp-yt-paper-button#expand');
      if (moreButton && !moreButton.getAttribute('hidden')) {
        moreButton.click();
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Step 2: Find and click transcript button
      const transcriptButtonSelectors = [
        '[aria-label="Show transcript"]',
        'button[aria-label*="Show transcript" i]',
        'ytd-video-description-transcript-section-renderer button',
      ];
      
      let showTranscriptButton = null;
      for (const selector of transcriptButtonSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (btn.offsetParent !== null) {
            showTranscriptButton = btn;
            break;
          }
        }
        if (showTranscriptButton) break;
      }

      if (showTranscriptButton) {
        showTranscriptButton.click();
        transcriptContainer = await waitForElement(transcriptContainerSelector, 5000);
        
        if (transcriptContainer) {
          return await extractTranscriptFromPanel(transcriptContainer);
        }
      }

      console.error("❌ Both API and UI methods failed");
      return null;

    } catch (error) {
      console.error("❌ YouTube transcript extraction error:", error);
      return null;
    }
  }

  // Extract from YouTube's internal API data
  async function extractFromYouTubeAPI(videoId) {
    try {
      // Inject script to access ytInitialPlayerResponse
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
            const captionTracks = window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;
            if (captionTracks && captionTracks.length > 0) {
              window.__ytCaptionTracks = captionTracks;
            }
          }
        })();
      `;
      document.documentElement.appendChild(script);
      await new Promise(r => setTimeout(r, 100));
      script.remove();
      
      const captionTracks = window.__ytCaptionTracks;
      delete window.__ytCaptionTracks;
      
      if (!captionTracks || captionTracks.length === 0) {
        console.log("❌ No caption tracks found in ytInitialPlayerResponse");
        return null;
      }
      
      console.log("📝 Found", captionTracks.length, "caption tracks:", 
        captionTracks.map(t => `${t.languageCode}${t.kind ? ' (auto)' : ''}`).join(', '));
      
      // Select best track (prefer manual over auto-generated, prefer English)
      let selectedTrack = captionTracks.find(t => t.languageCode === "en" && !t.kind) ||
                          captionTracks.find(t => t.languageCode === "en") ||
                          captionTracks.find(t => !t.kind) ||
                          captionTracks[0];
      
      console.log("✅ Selected track:", selectedTrack.languageCode, selectedTrack.kind || "manual");
      
      // Fetch transcript with json3 format
      const url = selectedTrack.baseUrl + '&fmt=json3';
      console.log("📡 Fetching from:", url.substring(0, 80) + "...");
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error("❌ Fetch failed:", response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        console.error("❌ No events in response");
        return null;
      }
      
      console.log("📊 Received", data.events.length, "events");
      
      // Parse events into transcript
      const transcript = [];
      data.events.forEach(event => {
        if (!event.segs) return; // Skip timing-only events
        
        const startSeconds = (event.tStartMs || 0) / 1000;
        const text = event.segs.map(seg => seg.utf8 || '').join('').trim();
        
        if (text) {
          transcript.push({
            timestamp: formatTimestamp(startSeconds),
            seconds: Math.floor(startSeconds),
            text: text
          });
        }
      });
      
      if (transcript.length > 0) {
        console.log("✅ Parsed", transcript.length, "transcript entries");
        transcript.slice(0, 3).forEach((entry, i) => {
          console.log(`📝 Entry ${i}: [${entry.timestamp}] ${entry.text.substring(0, 50)}...`);
        });
      }
      
      return transcript.length > 0 ? transcript : null;
      
    } catch (error) {
      console.error("❌ API extraction error:", error);
      return null;
    }
  }

  // Helper: Format seconds to MM:SS
  function formatTimestamp(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Helper: Extract transcript from an open panel
  async function extractTranscriptFromPanel(transcriptContainer) {
    console.log("✅ Found transcript panel");

    // Extract transcript text - SIMPLE: just use innerText!
    const transcriptText = transcriptContainer.innerText;

    if (!transcriptText || transcriptText.trim() === '') {
      console.error("❌ Transcript is empty");
      return null;
    }

    console.log("📄 Raw transcript length:", transcriptText.length);
    console.log("📄 Preview:", transcriptText.substring(0, 200));

    // Parse transcript into structured format
    // Format is: "0:05\nFirst line of text\n0:10\nSecond line..."
    const lines = transcriptText.split('\n');
    const transcript = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line is a timestamp (matches MM:SS or HH:MM:SS format)
      if (/^\d+:\d{2}(:\d{2})?$/.test(line)) {
        const timestamp = line;
        const text = lines[i + 1]?.trim();
        
        if (text) {
          transcript.push({
            timestamp: timestamp,
            seconds: parseYouTubeTimestamp(timestamp),
            text: text
          });
          i++; // Skip the next line since we already processed it
        }
      }
    }

    console.log("✅ Successfully parsed", transcript.length, "transcript entries");
    
    if (transcript.length === 0) {
      console.error("❌ No transcript entries parsed");
      return null;
    }

    // Show first few entries for debugging
    transcript.slice(0, 3).forEach((entry, index) => {
      console.log(`📝 Entry ${index}: [${entry.timestamp}] ${entry.text.substring(0, 50)}...`);
    });

    return transcript;
  }

  // ─── Message listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "getPageText") {
      const text = extractPageText();
      sendResponse({ text: text && text.length >= 50 ? text : null });
      return;
    }

    if (message.action === "getYouTubeTranscript") {
      console.log("🎬 Content script received getYouTubeTranscript request for:", message.videoId);
      extractYouTubeTranscript(message.videoId)
        .then((transcript) => {
          console.log("✅ Transcript extraction completed:", transcript ? `${transcript.length} entries` : "null");
          sendResponse({ transcript });
        })
        .catch((error) => {
          console.error("❌ Transcript extraction failed:", error);
          sendResponse({ transcript: null });
        });
      return true; // Keep channel open for async response
    }

    // Legacy in-page flow
    if (message.action === "translate" || message.action === "summarize") {
      const pageText = extractPageText();
      if (!pageText || pageText.length < 50) {
        showModalLoading(message.action);
        showModalError("לא נמצא תוכן מספיק בעמוד זה.");
        sendResponse({ started: false });
        return;
      }
      showModalLoading(message.action);
      sendResponse({ started: true });

      chrome.runtime.sendMessage(
        { action: message.action, text: pageText },
        (response) => {
          if (chrome.runtime.lastError) { showModalError("שגיאת תקשורת."); return; }
          if (response?.success) showModalResult(response.result, message.action);
          else showModalError(response?.error ?? "שגיאה לא ידועה.");
        }
      );
    }
  });
})();

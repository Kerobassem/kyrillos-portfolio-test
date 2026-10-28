/* ===========================================================
   KERO ASSISTANT - floating chat widget (no dependencies)
   Optional: set window.KC_API_BASE = "https://your-backend.com"
   BEFORE loading this file if the API is hosted on another domain.
=========================================================== */
(() => {
  const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && window.location.port !== "5000";
  const API_BASE = (window.KC_API_BASE || (isLocalPreview ? "http://127.0.0.1:5000" : "")).replace(/\/$/, "");

  const T = {
    en: {
      title: "Kero's Assistant",
      status: "Ask me about Kyrillos",
      ph: "Ask about projects, skills, pricing…",
      hello: "Hi! 👋 I'm Kyrillos' portfolio assistant. Ask me about his projects, skills, services or how to contact him.",
      chips: ["Who is Kyrillos?", "Show his projects", "Services & pricing", "How can I contact him?"],
      err: "Couldn't reach the assistant. Please try again.",
      reset: "New chat",
      open: "Open chat assistant",
      close: "Close chat",
      note: "AI assistant · answers are based on Kyrillos' portfolio",
    },
    ar: {
      title: "مساعد كيرو",
      status: "اسألني عن كيرلس",
      ph: "اسأل عن المشاريع، المهارات، الأسعار…",
      hello: "أهلاً! 👋 أنا مساعد معرض أعمال كيرلس. اسألني عن مشاريعه ومهاراته وخدماته وطرق التواصل معه.",
      chips: ["من هو كيرلس؟", "اعرض مشاريعه", "الخدمات والأسعار", "كيف أتواصل معه؟"],
      err: "تعذر الوصول إلى المساعد. حاول مرة أخرى.",
      reset: "محادثة جديدة",
      open: "افتح مساعد الدردشة",
      close: "إغلاق",
      note: "مساعد ذكي · الإجابات مبنية على معرض أعمال كيرلس",
    },
  };

  const SVG = {
    chat: '<svg class="kc-ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>',
    close: '<svg class="kc-ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  };

  const lang = () => (document.documentElement.lang === "ar" ? "ar" : "en");
  const t = () => T[lang()];

  // ---------- session ----------
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  let sid = null;
  try { sid = localStorage.getItem("kc_sid"); } catch (e) {}
  if (!sid) { sid = newId(); try { localStorage.setItem("kc_sid", sid); } catch (e) {} }

  // ---------- safe mini-markdown ----------
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const inline = (s) =>
    esc(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  function md(text) {
    let out = "", inList = false;
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*[-*•]\s+(.*)/);
      if (m) {
        if (!inList) { out += "<ul>"; inList = true; }
        out += "<li>" + inline(m[1]) + "</li>";
      } else {
        if (inList) { out += "</ul>"; inList = false; }
        if (line.trim()) out += "<p>" + inline(line) + "</p>";
      }
    }
    if (inList) out += "</ul>";
    return out;
  }

  // ---------- DOM ----------
  const launcher = document.createElement("button");
  launcher.className = "kc-launcher";
  launcher.innerHTML = SVG.chat + SVG.close;

  const panel = document.createElement("div");
  panel.className = "kc-panel";
  panel.setAttribute("role", "dialog");
  panel.innerHTML = `
    <div class="kc-head">
      <div class="kc-avatar">K</div>
      <div class="kc-title"><strong data-k="title"></strong><span data-k="status"></span></div>
      <button class="kc-icon-btn" data-k="reset" type="button">${SVG.reset}</button>
    </div>
    <div class="kc-messages" aria-live="polite"></div>
    <div class="kc-chips"></div>
    <form class="kc-form">
      <textarea class="kc-input" rows="1" maxlength="1000"></textarea>
      <button class="kc-send" type="submit">${SVG.send}</button>
    </form>
    <div class="kc-note" data-k="note"></div>`;
  document.body.append(panel, launcher);

  const $msgs = panel.querySelector(".kc-messages");
  const $chips = panel.querySelector(".kc-chips");
  const $form = panel.querySelector(".kc-form");
  const $input = panel.querySelector(".kc-input");
  const $send = panel.querySelector(".kc-send");
  const $reset = panel.querySelector('[data-k="reset"]');
  let started = false; // true once the visitor has sent a message

  function applyLang() {
    const L = t();
    panel.dir = lang() === "ar" ? "rtl" : "ltr";
    panel.querySelectorAll("[data-k]").forEach((el) => {
      const k = el.dataset.k;
      if (k === "reset") { el.title = L.reset; el.setAttribute("aria-label", L.reset); }
      else el.textContent = L[k];
    });
    launcher.setAttribute("aria-label", L.open);
    launcher.title = L.open;
    $input.placeholder = L.ph;
    if (!started) renderWelcome();
  }

  function renderWelcome() {
    const L = t();
    $msgs.innerHTML = "";
    addMsg(L.hello, "bot");
    $chips.innerHTML = "";
    L.chips.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kc-chip";
      b.textContent = c;
      b.onclick = () => send(c);
      $chips.appendChild(b);
    });
  }

  function addMsg(text, who, isError = false) {
    const el = document.createElement("div");
    el.className = "kc-msg kc-" + who + (isError ? " kc-error" : "");
    if (who === "bot" && !isError) el.innerHTML = md(text);
    else el.textContent = text;
    $msgs.appendChild(el);
    $msgs.scrollTop = $msgs.scrollHeight;
    return el;
  }

  function addTyping() {
    const el = document.createElement("div");
    el.className = "kc-msg kc-bot";
    el.innerHTML = '<div class="kc-typing"><span></span><span></span><span></span></div>';
    $msgs.appendChild(el);
    $msgs.scrollTop = $msgs.scrollHeight;
    return el;
  }

  async function send(text) {
    text = text.trim();
    if (!text || $send.disabled) return;
    started = true;
    $chips.innerHTML = "";
    addMsg(text, "user");
    $send.disabled = true;
    const typing = addTyping();
    try {
      const res = await fetch(API_BASE + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, message: text }),
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (res.ok) addMsg(data.reply, "bot");
      else addMsg(data.error || t().err, "bot", true);
    } catch (e) {
      typing.remove();
      addMsg(t().err, "bot", true);
    } finally {
      $send.disabled = false;
      $input.focus();
    }
  }

  // ---------- events ----------
  function toggle(open) {
    const show = typeof open === "boolean" ? open : !panel.classList.contains("kc-show");
    panel.classList.toggle("kc-show", show);
    launcher.classList.toggle("kc-open", show);
    if (show) setTimeout(() => $input.focus(), 250);
  }
  launcher.onclick = () => toggle();
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });

  $form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $input.value;
    $input.value = "";
    $input.style.height = "auto";
    send(v);
  });
  $input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $form.requestSubmit(); }
  });
  $input.addEventListener("input", () => {
    $input.style.height = "auto";
    $input.style.height = Math.min($input.scrollHeight, 110) + "px";
  });

  $reset.onclick = async () => {
    try {
      await fetch(API_BASE + "/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid }),
      });
    } catch (e) {}
    sid = newId();
    try { localStorage.setItem("kc_sid", sid); } catch (e) {}
    started = false;
    renderWelcome();
  };

  // follow the portfolio's EN/AR switch (it sets <html lang>)
  new MutationObserver(applyLang).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  applyLang();
})();

// Sahra chat widget - Workers AI, free tier. Vanilla JS, no deps.
(function () {
  if (window.__sahraChat) return;
  window.__sahraChat = true;

  const ENDPOINT = "https://chat.stefanyasin.com/chat";
  const GREEN = "#1c1917";
  const GREEN_HOVER = "#292524";
  const LAUNCHER = "#ffffff";
  const LAUNCHER_HOVER = "#f5f5f4";

  const history = [];

  const style = document.createElement("style");
  style.textContent = `
    #sc-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
    #sc-wrap { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
    #sc-btn { position: fixed; right: 18px; bottom: 92px; z-index: 9999; width: 56px; height: 56px; border-radius: 9999px;
      background: ${LAUNCHER}; border: 1px solid #e7e5e4; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.22);
      display: flex; align-items: center; justify-content: center; transition: background .15s ease, transform .1s ease; }
    #sc-btn:hover { background: ${LAUNCHER_HOVER}; }
    #sc-btn:active { transform: scale(.96); }
    #sc-btn svg { width: 26px; height: 26px; }
    #sc-panel { position: fixed; right: 18px; bottom: 92px; z-index: 9999; width: min(360px, calc(100vw - 36px)); height: 480px;
      max-height: calc(100vh - 120px); background: #fff; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden;
      box-shadow: 0 24px 48px rgba(0,0,0,.18); display: none; flex-direction: column; }
    #sc-panel.open { display: flex; }
    #sc-head { padding: 12px 16px; border-bottom: 1px solid #e7e5e4; display: flex; align-items: center; gap: 10px; }
    #sc-head .dot { width: 8px; height: 8px; border-radius: 9999px; background: #16a34a; flex-shrink: 0; }
    #sc-head .name { font-weight: 600; font-size: 14px; color: #1c1917; }
    #sc-head .sub { font-size: 11px; color: #78716c; }
    #sc-cta { margin: 10px 12px 0; display: block; text-align: center; padding: 9px 12px; border-radius: 10px;
      background: #f0fdf4; border: 1px solid #bbf7d0; color: ${GREEN}; text-decoration: none; font-size: 12.5px; font-weight: 600; }
    #sc-cta:hover { background: #dcfce7; }
    #sc-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    #sc-msgs .m { max-width: 82%; padding: 9px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
    #sc-msgs .m.user { align-self: flex-end; background: ${GREEN}; color: #fff; border-bottom-right-radius: 4px; }
    #sc-msgs .m.bot { align-self: flex-start; background: #f5f5f4; color: #1c1917; border-bottom-left-radius: 4px; }
    #sc-msgs .m.err { background: #fef2f2; color: #991b1b; }
    #sc-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e7e5e4; }
    #sc-input { flex: 1; border: 1px solid #d6d3d1; border-radius: 9999px; padding: 10px 14px; font-size: 13.5px; outline: none; }
    #sc-input:focus { border-color: ${GREEN}; box-shadow: 0 0 0 2px rgba(20,83,45,.15); }
    #sc-send { border: none; background: ${GREEN}; color: #fff; border-radius: 9999px; padding: 0 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
    #sc-send:hover { background: ${GREEN_HOVER}; }
    #sc-send:disabled { opacity: .5; cursor: default; }
    @media (min-width: 768px) { #sc-btn, #sc-panel { bottom: 20px; } }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.id = "sc-wrap";
  wrap.innerHTML = `
    <button id="sc-btn" aria-label="Chat with Sahra's assistant">
      <svg viewBox="0 0 24 24" fill="none" stroke="#1c1917" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    </button>
    <div id="sc-panel" role="dialog" aria-label="Chat">
      <div id="sc-head">
        <span class="dot"></span>
        <div>
          <div class="name">Stefan's assistant</div>
          <div class="sub">Ask about his work and projects</div>
        </div>
      </div>
      <a id="sc-cta" href="/">See his projects</a>
      <div id="sc-msgs"></div>
      <form id="sc-form">
        <input id="sc-input" type="text" maxlength="500" placeholder="Ask about buying or selling..." autocomplete="off" />
        <button id="sc-send" type="submit">Send</button>
      </form>
    </div>`;
  document.body.appendChild(wrap);

  const btn = document.getElementById("sc-btn");
  const panel = document.getElementById("sc-panel");
  const msgs = document.getElementById("sc-msgs");
  const form = document.getElementById("sc-form");
  const input = document.getElementById("sc-input");
  const send = document.getElementById("sc-send");

  btn.addEventListener("click", function () {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && !msgs.children.length) {
      addMsg("bot", "Hi, I can answer questions about Stefan's background, his companies, and his open-source work. What would you like to know?");
    }
    if (panel.classList.contains("open")) input.focus();
  });

  function addMsg(role, text, cls) {
    const div = document.createElement("div");
    div.className = "m " + role + (cls ? " " + cls : "");
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;
    input.value = "";
    addMsg("user", text);
    history.push({ role: "user", content: text });
    if (history.length > 12) history.splice(0, history.length - 12);

    send.disabled = true;
    const botDiv = addMsg("bot", "");
    let reply = "";

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("bad response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw.startsWith("data:")) continue;
          const payload = raw.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const o = JSON.parse(payload);
            if (o.err) throw new Error("stream error");
            if (o.t) { reply += o.t; botDiv.textContent = reply; msgs.scrollTop = msgs.scrollHeight; }
          } catch (err) {
            if (String(err.message).indexOf("JSON") === -1) throw err;
          }
        }
      }
    } catch (err) {
      if (!reply) {
        botDiv.textContent = "Sorry, I could not reach Sahra's assistant right now. Please call or text 437-422-4256 and she will get back to you.";
        botDiv.className = "m bot err";
      }
    }
    if (reply) history.push({ role: "assistant", content: reply });
    send.disabled = false;
    input.focus();
  });
})();

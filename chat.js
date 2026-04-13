/* ============================
   Z BIKES — Chat Widget
   ============================ */

const BACKEND_URL = 'http://localhost:8000';

(function () {
  const messages = [];
  let isOpen = false;
  let isLoading = false;

  // Inject widget HTML
  const widget = document.createElement('div');
  widget.id = 'chatWidget';
  widget.innerHTML = `
    <button class="chat-toggle" id="chatToggle" aria-label="Open chat">
      <svg class="chat-toggle-icon chat-icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="chat-toggle-icon chat-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
    <div class="chat-panel" id="chatPanel">
      <div class="chat-header">
        <span class="chat-header-title">Z Bikes</span>
        <span class="chat-header-dot"></span>
        <span class="chat-header-status">Ask me anything</span>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <form class="chat-input-row" id="chatForm">
        <input type="text" id="chatInput" class="chat-input" placeholder="Type a message…" autocomplete="off" />
        <button type="submit" class="chat-send" aria-label="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(widget);

  // Element refs
  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messagesEl = document.getElementById('chatMessages');

  // Toggle open/close
  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    widget.classList.toggle('open', isOpen);
    if (isOpen) input.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
      widget.classList.remove('open');
    }
  });

  // Render all messages
  function render() {
    messagesEl.innerHTML = '';
    messages.forEach((msg) => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble chat-bubble-' + msg.role;
      bubble.textContent = msg.text;
      messagesEl.appendChild(bubble);

      if (msg.role === 'assistant' && msg.sources && msg.sources.length) {
        const sources = document.createElement('div');
        sources.className = 'chat-sources';
        sources.innerHTML = msg.sources
          .map((s) => '<span class="chat-source-tag">' + escapeHtml(s) + '</span>')
          .join('');
        messagesEl.appendChild(sources);
      }
    });

    if (isLoading) {
      const loader = document.createElement('div');
      loader.className = 'chat-bubble chat-bubble-assistant chat-loading';
      loader.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(loader);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Handle send
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || isLoading) return;

    messages.push({ role: 'user', text });
    input.value = '';
    isLoading = true;
    render();

    fetch(BACKEND_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Server error (' + res.status + ')');
        return res.json();
      })
      .then((data) => {
        messages.push({
          role: 'assistant',
          text: data.answer,
          sources: data.sources || [],
        });
      })
      .catch(() => {
        messages.push({
          role: 'assistant',
          text: 'Sorry, I couldn\u2019t reach the server. Please try again later.',
          sources: [],
        });
      })
      .finally(() => {
        isLoading = false;
        render();
      });
  });

  // Initial render (empty)
  render();
})();

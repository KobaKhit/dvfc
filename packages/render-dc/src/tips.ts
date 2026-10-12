/**
 * Shared HTML tooltip helpers for dc.js dashboards.
 * Native SVG <title> tips are unreliable and brush overlays steal hover,
 * so marks write structured `Heading\nKey: value` titles and this module
 * renders them as a small card (title + key/value rows).
 */

export const DVFC_TIP_CSS = `
    #dvfc-tip {
      position: fixed;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transform: translate3d(0, 4px, 0);
      transition: opacity 90ms ease, transform 90ms ease;
      min-width: 120px;
      max-width: min(300px, 72vw);
      padding: 0.55rem 0.65rem 0.6rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(16, 33, 41, 0.96);
      color: #f2f7f8;
      font-size: 0.78rem;
      font-weight: 500;
      line-height: 1.4;
      box-shadow: 0 10px 28px rgba(16, 33, 41, 0.35);
    }
    #dvfc-tip.is-on {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
    .dvfc-tip-title {
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: -0.01em;
      padding-bottom: 0.3rem;
      margin-bottom: 0.3rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
      overflow-wrap: anywhere;
    }
    .dvfc-tip-rows {
      display: grid;
      gap: 0.15rem;
    }
    .dvfc-tip-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.9rem;
    }
    .dvfc-tip-k {
      color: rgba(226, 236, 240, 0.65);
      font-weight: 500;
      white-space: nowrap;
    }
    .dvfc-tip-v {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 600;
      text-align: right;
      overflow-wrap: anywhere;
    }
    .dvfc-tip-text {
      margin-top: 0.15rem;
      color: rgba(226, 236, 240, 0.85);
      white-space: pre-line;
    }
`;
/** Browser IIFE body — defines dvfcInstallTips(). Call after dc.renderAll(). */
export const DVFC_TIP_JS = `
  function dvfcInstallTips() {
    let tip = document.getElementById('dvfc-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'dvfc-tip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    const hide = () => tip.classList.remove('is-on');
    const row = (k, v) => {
      const line = document.createElement('div');
      line.className = 'dvfc-tip-row';
      const key = document.createElement('span');
      key.className = 'dvfc-tip-k';
      key.textContent = k;
      const val = document.createElement('span');
      val.className = 'dvfc-tip-v';
      val.textContent = v;
      line.appendChild(key);
      line.appendChild(val);
      return line;
    };
    const show = (text, x, y) => {
      if (!text || !String(text).trim()) return hide();
      const lines = String(text).split('\\n').map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return hide();
      tip.innerHTML = '';
      const heading = document.createElement('div');
      heading.className = 'dvfc-tip-title';
      heading.textContent = lines[0];
      tip.appendChild(heading);
      const rest = lines.slice(1);
      const kv = rest.filter((l) => l.indexOf(':') > 0);
      if (kv.length) {
        const box = document.createElement('div');
        box.className = 'dvfc-tip-rows';
        for (const line of kv) {
          const i = line.indexOf(':');
          box.appendChild(row(line.slice(0, i).trim(), line.slice(i + 1).trim()));
        }
        tip.appendChild(box);
      }
      const extra = rest.filter((l) => l.indexOf(':') <= 0);
      if (extra.length) {
        const t = document.createElement('div');
        t.className = 'dvfc-tip-text';
        t.textContent = extra.join('\\n');
        tip.appendChild(t);
      }
      tip.classList.add('is-on');
      const pad = 14;
      const tw = tip.offsetWidth || 0;
      const th = tip.offsetHeight || 0;
      tip.style.left = Math.max(8, Math.min(x + pad, window.innerWidth - tw - 8)) + 'px';
      tip.style.top = Math.max(8, Math.min(y + pad, window.innerHeight - th - 8)) + 'px';
    };
    const titleFrom = (node) => {
      if (!node || node.nodeType !== 1) return '';
      if (
        node.classList &&
        (node.classList.contains('overlay') ||
          node.classList.contains('selection') ||
          node.classList.contains('handle') ||
          node.classList.contains('custom-brush-handle'))
      ) {
        return '';
      }
      let n = node;
      for (let i = 0; i < 5 && n; i++) {
        if (n.classList && n.classList.contains('dc-chart')) break;
        const direct = n.querySelector && n.querySelector(':scope > title');
        if (direct && direct.textContent) return direct.textContent.trim();
        const attr = n.getAttribute && (n.getAttribute('data-tip') || n.getAttribute('title'));
        if (attr) return String(attr).trim();
        n = n.parentElement;
      }
      return '';
    };
    const pickText = (clientX, clientY) => {
      const blocked = [];
      let el = document.elementFromPoint(clientX, clientY);
      // Peek under brush overlays / selections that steal pointer events
      while (
        el &&
        el !== document.body &&
        el.classList &&
        (el.classList.contains('overlay') ||
          el.classList.contains('selection') ||
          el.classList.contains('handle') ||
          el.classList.contains('custom-brush-handle'))
      ) {
        el.style.pointerEvents = 'none';
        blocked.push(el);
        el = document.elementFromPoint(clientX, clientY);
      }
      let text = '';
      if (el && el.closest && el.closest('.dc-chart')) {
        text = titleFrom(el);
      }
      for (const b of blocked) b.style.pointerEvents = '';
      return text;
    };
    document.addEventListener(
      'mousemove',
      (e) => {
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const host = under && under.closest && under.closest('.dc-chart');
        if (!host) return hide();
        show(pickText(e.clientX, e.clientY), e.clientX, e.clientY);
      },
      true
    );
    document.addEventListener(
      'mouseleave',
      (e) => {
        if (e.target === document.documentElement || e.target === document.body) hide();
      },
      true
    );
  }
`;

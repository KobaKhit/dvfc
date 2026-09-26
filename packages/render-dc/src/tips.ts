/**
 * Shared HTML tooltip helpers for dc.js dashboards.
 * Native SVG <title> tips are unreliable and brush overlays steal hover.
 */

export const DVFC_TIP_CSS = `
    #dvfc-tip {
      position: fixed;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transform: translate3d(0, 4px, 0);
      transition: opacity 80ms ease, transform 80ms ease;
      max-width: min(280px, 70vw);
      padding: 0.4rem 0.55rem;
      border-radius: 4px;
      background: #102129;
      color: #f7f8fa;
      font-size: 0.78rem;
      font-weight: 500;
      line-height: 1.35;
      box-shadow: 0 6px 18px rgba(16, 33, 41, 0.22);
      white-space: pre-line;
    }
    #dvfc-tip.is-on {
      opacity: 1;
      transform: translate3d(0, 0, 0);
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
    const show = (text, x, y) => {
      if (!text) return hide();
      tip.textContent = text;
      tip.classList.add('is-on');
      const pad = 12;
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

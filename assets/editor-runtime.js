/**
 * HTML Studio — In-Place Browser Editor Runtime
 * Supports:
 * - [data-editable-html]: direct contenteditable text editing
 * - [data-editable-text]: inline SVG <text>/<tspan> editing overlay
 * - [data-editable-shape]: SVG shape fill recoloring
 * - Export selected SVG & save clean self-contained HTML
 */
(() => {
  if (window.__CHS_EDITOR_MOUNTED__) return;
  window.__CHS_EDITOR_MOUNTED__ = true;

  const STYLE_ID = 'chs-editor-styles';
  const TOOLBAR_ID = 'chs-editor-toolbar';

  const css = `
    #${TOOLBAR_ID} {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(18, 24, 32, 0.9);
      color: #f8fafc;
      font: 500 12px/1.2 "Noto Sans SC", system-ui, -apple-system, sans-serif;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.14);
    }
    #${TOOLBAR_ID} button,
    #${TOOLBAR_ID} label {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
      border-radius: 999px;
      padding: 6px 11px;
      font: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    #${TOOLBAR_ID} button:hover {
      background: rgba(255, 255, 255, 0.18);
    }
    #${TOOLBAR_ID} button[data-active="true"] {
      background: #10b981;
      border-color: #10b981;
      color: #06281e;
      font-weight: 700;
    }
    #${TOOLBAR_ID} input[type="color"] {
      width: 18px;
      height: 18px;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
    }
    #${TOOLBAR_ID} [data-role="controls"] {
      display: none;
      align-items: center;
      gap: 6px;
    }
    body.chs-editing #${TOOLBAR_ID} [data-role="controls"] {
      display: inline-flex;
    }
    body.chs-editing [data-editable-html] {
      outline: 1px dashed rgba(16, 185, 129, 0.45);
      outline-offset: 3px;
      border-radius: 4px;
      cursor: text;
    }
    body.chs-editing [data-editable-html]:focus {
      outline: 2px solid #10b981;
      background: rgba(16, 185, 129, 0.06);
    }
    body.chs-editing [data-editable-text] {
      cursor: text;
    }
    body.chs-editing [data-editable-text]:hover {
      outline: 1px dashed #10b981;
    }
    body.chs-editing [data-editable-shape] {
      cursor: pointer;
    }
    body.chs-editing [data-editable-shape][data-chs-selected="true"] {
      outline: 2px solid #f59e0b;
      outline-offset: 2px;
    }
    .chs-svg-editor-overlay {
      position: fixed;
      z-index: 100000;
      padding: 4px 6px;
      border: 2px solid #10b981;
      border-radius: 6px;
      background: #ffffff;
      color: #111827;
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
      resize: none;
      outline: none;
      font-family: "Noto Sans SC", system-ui, sans-serif;
    }
    @media (max-width: 640px) {
      body:not(.chs-force-toolbar) #${TOOLBAR_ID} {
        display: none;
      }
    }
    @media print {
      #${TOOLBAR_ID},
      .chs-svg-editor-overlay {
        display: none !important;
      }
    }
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  let editing = false;
  let selectedShape = null;
  let selectedSvg = null;
  let activeOverlay = null;

  function closeSvgOverlay(commit) {
    if (!activeOverlay) return;
    const { el, input } = activeOverlay;
    if (commit) {
      const lines = input.value.split(/\r?\n/);
      const tspans = el.querySelectorAll('tspan');
      if (tspans.length > 0 && lines.length === tspans.length) {
        tspans.forEach((ts, idx) => { ts.textContent = lines[idx]; });
      } else if (lines.length === 1) {
        el.textContent = lines[0];
      } else {
        const x = el.getAttribute('x') || '0';
        const fs = parseFloat(getComputedStyle(el).fontSize) || 14;
        el.textContent = '';
        lines.forEach((line, idx) => {
          const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          ts.setAttribute('x', x);
          if (idx > 0) ts.setAttribute('dy', String(Math.round(fs * 1.25)));
          ts.textContent = line;
          el.appendChild(ts);
        });
      }
    }
    input.remove();
    activeOverlay = null;
  }

  function setEditing(next) {
    editing = next;
    closeSvgOverlay(true);
    document.body.classList.toggle('chs-editing', editing);
    const toggleBtn = document.querySelector(`#${TOOLBAR_ID} [data-action="toggle"]`);
    if (toggleBtn) {
      toggleBtn.dataset.active = String(editing);
      toggleBtn.textContent = editing ? '完成编辑' : '编辑内容';
    }
    document.querySelectorAll('[data-editable-html]').forEach((el) => {
      if (editing) el.setAttribute('contenteditable', 'true');
      else el.removeAttribute('contenteditable');
    });
    if (!editing && selectedShape) {
      selectedShape.removeAttribute('data-chs-selected');
      selectedShape = null;
    }
  }

  function openSvgTextEditor(textEl) {
    closeSvgOverlay(true);
    const rect = textEl.getBoundingClientRect();
    const cs = getComputedStyle(textEl);
    const tspans = textEl.querySelectorAll('tspan');
    const initial = tspans.length
      ? Array.from(tspans).map((t) => t.textContent).join('\n')
      : (textEl.textContent || '');

    const input = document.createElement('textarea');
    input.className = 'chs-svg-editor-overlay';
    input.value = initial;
    input.style.left = `${Math.max(8, rect.left - 6)}px`;
    input.style.top = `${Math.max(8, rect.top - 6)}px`;
    input.style.minWidth = `${Math.max(120, rect.width + 24)}px`;
    input.style.minHeight = `${Math.max(32, rect.height + 14)}px`;
    input.style.fontSize = cs.fontSize || '14px';
    input.style.fontWeight = cs.fontWeight || '400';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSvgOverlay(false);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        closeSvgOverlay(true);
      }
    });
    input.addEventListener('blur', () => closeSvgOverlay(true));

    document.body.appendChild(input);
    activeOverlay = { el: textEl, input };
    input.focus();
    input.select();
  }

  function rgbToHex(color) {
    if (!color || color === 'none') return '#1e4d40';
    if (color.startsWith('#')) {
      return color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color.slice(0, 7);
    }
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return '#1e4d40';
    return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  }

  function exportSelectedSvg() {
    const target = selectedSvg || document.querySelector('svg[data-exportable], main svg, section svg');
    if (!target) {
      alert('未找到可导出的 SVG 图形。请先点击一个 SVG 图形后再导出。');
      return;
    }
    const clone = target.cloneNode(true);
    clone.querySelectorAll('[data-chs-selected]').forEach((el) => el.removeAttribute('data-chs-selected'));
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(document.title || 'corporate-graphic').replace(/[^\w\u4e00-\u9fa5-]+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportUpdatedHtml() {
    closeSvgOverlay(true);
    const prevEditing = editing;
    if (prevEditing) setEditing(false);

    const docClone = document.documentElement.cloneNode(true);
    docClone.querySelectorAll(`#${TOOLBAR_ID}, .chs-svg-editor-overlay, #${STYLE_ID}`).forEach((el) => el.remove());
    docClone.querySelectorAll('body').forEach((b) => b.classList.remove('chs-editing'));
    docClone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    docClone.querySelectorAll('[data-chs-selected]').forEach((el) => el.removeAttribute('data-chs-selected'));
    docClone.querySelectorAll('script').forEach((s) => {
      if (s.textContent && s.textContent.includes('__CHS_EDITOR_MOUNTED__')) {
        // Keep the inline script cleanly; remove runtime state only
      }
    });

    const htmlText = '<!doctype html>\n' + docClone.outerHTML;
    const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(document.title || 'corporate-profile').replace(/[^\w\u4e00-\u9fa5-]+/g, '-')}-edited.html`;
    a.click();
    URL.revokeObjectURL(url);

    if (prevEditing) setEditing(true);
  }

  function mountToolbar() {
    if (document.getElementById(TOOLBAR_ID)) return;
    const bar = document.createElement('div');
    bar.id = TOOLBAR_ID;
    bar.setAttribute('aria-label', '页面原位编辑工具栏');
    bar.innerHTML = `
      <button type="button" data-action="toggle" data-active="false">编辑内容</button>
      <span data-role="controls">
        <label title="调整选中图形填充色">图形色 <input type="color" data-action="fill" value="#1e4d40"></label>
        <button type="button" data-action="export-svg">导出 SVG</button>
        <button type="button" data-action="export-html">保存 HTML</button>
      </span>
    `;
    document.body.appendChild(bar);

    bar.querySelector('[data-action="toggle"]').addEventListener('click', () => setEditing(!editing));
    bar.querySelector('[data-action="export-svg"]').addEventListener('click', exportSelectedSvg);
    bar.querySelector('[data-action="export-html"]').addEventListener('click', exportUpdatedHtml);

    const colorInput = bar.querySelector('[data-action="fill"]');
    colorInput.addEventListener('input', (e) => {
      if (selectedShape) {
        selectedShape.setAttribute('fill', e.target.value);
        selectedShape.style.fill = e.target.value;
      }
    });

    document.addEventListener('click', (e) => {
      if (!editing) return;
      if (bar.contains(e.target) || (activeOverlay && activeOverlay.input === e.target)) return;

      const textEl = e.target.closest?.('[data-editable-text]');
      if (textEl) {
        e.preventDefault();
        e.stopPropagation();
        selectedSvg = textEl.closest('svg');
        openSvgTextEditor(textEl);
        return;
      }

      const shapeEl = e.target.closest?.('[data-editable-shape]');
      if (shapeEl) {
        e.preventDefault();
        e.stopPropagation();
        if (selectedShape) selectedShape.removeAttribute('data-chs-selected');
        selectedShape = shapeEl;
        selectedShape.setAttribute('data-chs-selected', 'true');
        selectedSvg = shapeEl.closest('svg');
        colorInput.value = rgbToHex(getComputedStyle(shapeEl).fill || shapeEl.getAttribute('fill'));
      }
    }, true);
  }

  function init() {
    if (new URLSearchParams(location.search).get('export') === '1') return;
    const hasEditable = document.querySelector('[data-editable-html], [data-editable-text], [data-editable-shape]');
    if (!hasEditable) return;
    injectStyles();
    mountToolbar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

const VIEWER_HTML = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>godnote viewer</title>
    <!-- godnote workspace template v2 -->
    <style>
      :root {
        color-scheme: light;
        --bg: #f5efe6;
        --panel: rgba(255, 250, 242, 0.94);
        --line: rgba(62, 45, 28, 0.12);
        --ink: #2b241c;
        --muted: #6f5d48;
        --accent: #9a5b2f;
        --shadow: 0 20px 60px rgba(60, 39, 17, 0.1);
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        margin: 0;
        color: var(--ink);
        background: linear-gradient(180deg, #faf4eb 0%, var(--bg) 100%);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      button { font: inherit; cursor: pointer; }
      a { color: inherit; text-decoration: none; }
      .shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
      .topbar {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        padding: 18px 22px;
        background: rgba(251, 247, 241, 0.82);
        border-bottom: 1px solid rgba(62, 45, 28, 0.08);
        backdrop-filter: blur(16px);
      }
      .brand h1 { margin: 0; font-family: Georgia, serif; font-size: 1.55rem; line-height: 1; }
      .brand p { margin: 4px 0 0; color: var(--muted); }
      .toolbar { display: flex; flex-wrap: wrap; gap: 10px; }
      .toolbar button {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: white;
        padding: 10px 14px;
        box-shadow: 0 6px 18px rgba(60, 39, 17, 0.06);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(154, 91, 47, 0.12);
        color: var(--accent);
        font-weight: 600;
      }
      .screen { min-height: 0; padding: 20px; }
      .panel {
        min-height: 0;
        height: 100%;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 22px;
        box-shadow: var(--shadow);
        overflow: hidden;
      }
      .note-screen { height: 100%; display: grid; grid-template-rows: auto 1fr; min-height: 0; }
      .note-screen-header {
        padding: 18px 20px;
        border-bottom: 1px solid rgba(62, 45, 28, 0.08);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .note-screen-header h2 { margin: 0; font-family: Georgia, serif; font-size: 1.8rem; }
      .summary, .empty, .card-meta, .note-meta, .error { color: var(--muted); font-size: 0.95rem; line-height: 1.6; }
      .note-meta-row { display: flex; flex-wrap: wrap; gap: 10px 12px; align-items: center; }
      .element-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(62, 45, 28, 0.1);
        color: var(--muted);
        font-size: 0.9rem;
      }
      .note-screen-body { min-height: 0; overflow: hidden; position: relative; }
      .stage-shell { min-height: 0; height: 100%; padding: 18px; }
      .stage {
        position: relative;
        height: 100%;
        min-height: 0;
        overflow: hidden;
        border-radius: 22px;
        border: 1px solid rgba(62, 45, 28, 0.08);
        background:
          linear-gradient(rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.55)),
          radial-gradient(circle at 20% 20%, rgba(154, 91, 47, 0.05), transparent 32%),
          radial-gradient(circle at 80% 10%, rgba(90, 127, 160, 0.08), transparent 28%),
          #f8f3eb;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        cursor: grab;
      }
      .stage.dragging { cursor: grabbing; }
      .world { position: absolute; left: 0; top: 0; transform-origin: 0 0; will-change: transform; }
      .element { position: absolute; box-sizing: border-box; overflow: hidden; }
      .element.text { display: flex; }
      .element.text .surface {
        width: 100%;
        height: 100%;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(62, 45, 28, 0.1);
        box-shadow: 0 10px 24px rgba(60, 39, 17, 0.08);
        overflow: hidden;
        line-height: 1.65;
      }
      .text-render {
        width: 100%;
        height: 100%;
        overflow: hidden;
        color: inherit;
      }
      .text-render.plain {
        white-space: pre-wrap;
      }
      .text-render.markdown,
      .text-render.markdown-tex,
      .text-render.tex {
        font-size: 0.98em;
      }
      .text-render p {
        margin: 0 0 0.5em;
      }
      .text-render p:last-child {
        margin-bottom: 0;
      }
      .text-render ul,
      .text-render ol {
        margin: 0 0 0.5em 1.2em;
        padding-left: 1.2em;
      }
      .text-render li + li {
        margin-top: 0.25em;
      }
      .text-render a {
        color: var(--accent);
      }
      .text-render code {
        padding: 0 0.3em;
        border-radius: 6px;
        background: rgba(62, 45, 28, 0.08);
      }
      .text-render .tex-inline {
        display: inline-block;
        vertical-align: middle;
      }
      .text-render .tex-block {
        display: block;
        margin: 0.35em 0;
      }
      .text-render .tex-frac {
        display: inline-flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        text-align: center;
        vertical-align: middle;
        line-height: 1.05;
        min-width: 1.2em;
      }
      .text-render .tex-num,
      .text-render .tex-den {
        padding: 0 0.18em;
      }
      .text-render .tex-rule {
        border-top: 1px solid currentColor;
        margin: 0.1em 0;
      }
      .text-render h1,
      .text-render h2,
      .text-render h3,
      .text-render h4,
      .text-render h5,
      .text-render h6 {
        margin: 0 0 0.45em;
        line-height: 1.25;
      }
      .text-render h1:last-child,
      .text-render h2:last-child,
      .text-render h3:last-child,
      .text-render h4:last-child,
      .text-render h5:last-child,
      .text-render h6:last-child {
        margin-bottom: 0;
      }
      .element.image img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(62, 45, 28, 0.1);
        box-shadow: 0 10px 24px rgba(60, 39, 17, 0.08);
      }
      .element.rect, .element.ellipse {
        border: 2px solid rgba(47, 93, 98, 0.8);
        box-shadow: 0 10px 24px rgba(60, 39, 17, 0.06);
      }
      .element.rect { border-radius: 16px; }
      .element.ellipse { border-radius: 999px; }
      .element-svg { width: 100%; height: 100%; display: block; overflow: visible; }
      .empty-card {
        border: 1px solid rgba(62, 45, 28, 0.08);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.86);
        padding: 16px;
        display: grid;
        gap: 12px;
      }
      .empty-card h3 { margin: 0; font-family: Georgia, serif; }
      .error {
        color: #7c332d;
        background: rgba(183, 73, 58, 0.09);
        border: 1px solid rgba(183, 73, 58, 0.15);
        border-radius: 16px;
        padding: 12px 14px;
        white-space: pre-wrap;
      }
      @media (max-width: 920px) {
        .topbar { flex-direction: column; align-items: stretch; }
        .toolbar button { flex: 1 1 0; }
        .screen { padding: 12px; }
        .note-screen-header { flex-direction: column; }
        .stage-shell { padding: 12px; }
        .stage { min-height: 62vh; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <h1>godnote viewer</h1>
          <p>readonly static viewer. editing is disabled, note viewing only.</p>
        </div>
        <div class="toolbar">
          <span class="badge" id="mode-badge">Viewer</span>
          <button id="nav-home" type="button">Home</button>
          <button id="nav-back" type="button">Back</button>
          <button id="nav-reset" type="button">Reset view</button>
          <button id="nav-fit" type="button">Fit note</button>
        </div>
      </header>
      <main class="screen" id="screen"></main>
    </div>
    <script>
      const dataRoot = './data';
      const state = {
        note: null,
        subjectId: null,
        noteId: null,
        viewportFromNote: { x: 0, y: 0, scale: 1 },
        viewport: { x: 0, y: 0, scale: 1 },
      };
      const el = {
        screen: document.getElementById('screen'),
        modeBadge: document.getElementById('mode-badge'),
        navBack: document.getElementById('nav-back'),
        navReset: document.getElementById('nav-reset'),
        navFit: document.getElementById('nav-fit'),
      };
      const cache = new Map();
      const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      const mathPattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
      const mathCommands = {
        '\\alpha': 'α',
        '\\beta': 'β',
        '\\gamma': 'γ',
        '\\delta': 'δ',
        '\\epsilon': 'ε',
        '\\theta': 'θ',
        '\\lambda': 'λ',
        '\\mu': 'μ',
        '\\pi': 'π',
        '\\rho': 'ρ',
        '\\sigma': 'σ',
        '\\tau': 'τ',
        '\\phi': 'φ',
        '\\omega': 'ω',
        '\\times': '×',
        '\\cdot': '·',
        '\\pm': '±',
        '\\leq': '≤',
        '\\geq': '≥',
        '\\neq': '≠',
        '\\to': '→',
      };
      function textStyleToString(style) {
        return [
          'font-size:' + style.fontSize + 'px',
          'color:' + style.color,
          'background-color:' + style.backgroundColor,
          'padding:' + style.padding + 'px',
          'font-family:' + (style.fontFamily || 'inherit'),
          'border-color:' + (style.borderColor || 'transparent'),
          'border-width:' + (style.borderWidth ?? 0) + 'px',
        ].join(';');
      }
      function renderInlineMarkdown(content) {
        const codeSpans = [];
        let output = escapeHtml(content).replace(/\n/g, '<br />').replace(/\`([^\`]+)\`/g, (_match, code) => {
          codeSpans.push(code);
          return '\u0000' + (codeSpans.length - 1) + '\u0000';
        });
        output = output
          .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
          .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
          .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
        return output.replace(/\u0000(\d+)\u0000/g, (_match, index) => '<code>' + codeSpans[Number(index)] + '</code>');
      }
      function renderMarkdownBlocks(content) {
        const lines = String(content).replace(/\r\n/g, '\n').split('\n');
        const blocks = [];
        let index = 0;
        const isListLine = (value) => /^\s*[-*+]\s+/.test(value);
        const isHeadingLine = (value) => /^\s*#{1,6}\s+/.test(value);
        const isBlockStart = (value) => isListLine(value) || isHeadingLine(value);
        while (index < lines.length) {
          const line = lines[index];
          if (!line.trim()) {
            index += 1;
            continue;
          }
          if (isHeadingLine(line)) {
            const match = line.match(/^\s*(#{1,6})\s+(.+)$/);
            const level = Math.min(6, Math.max(1, match?.[1].length ?? 1));
            blocks.push('<h' + level + '>' + renderInlineMarkdown(match?.[2] ?? '') + '</h' + level + '>');
            index += 1;
            continue;
          }
          if (isListLine(line)) {
            const items = [];
            while (index < lines.length && isListLine(lines[index])) {
              items.push(lines[index].replace(/^\s*[-*+]\s+/, ''));
              index += 1;
            }
            blocks.push('<ul>' + items.map((item) => '<li>' + renderInlineMarkdown(item) + '</li>').join('') + '</ul>');
            continue;
          }
          const paragraph = [];
          while (index < lines.length) {
            const current = lines[index];
            if (!current.trim()) break;
            if (paragraph.length > 0 && isBlockStart(current)) break;
            paragraph.push(current);
            index += 1;
          }
          blocks.push('<p>' + renderInlineMarkdown(paragraph.join('\n')) + '</p>');
        }
        return blocks.join('');
      }
      function renderMathExpression(content, displayMode) {
        let output = escapeHtml(String(content).trim());
        output = output.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_match, numerator, denominator) => {
          return '<span class="tex-frac"><span class="tex-num">' + numerator + '</span><span class="tex-rule"></span><span class="tex-den">' + denominator + '</span></span>';
        });
        output = output.replace(/\\frac\s+([^\s{}]+)\s+([^\s{}]+)/g, (_match, numerator, denominator) => {
          return '<span class="tex-frac"><span class="tex-num">' + numerator + '</span><span class="tex-rule"></span><span class="tex-den">' + denominator + '</span></span>';
        });
        output = output.replace(/([A-Za-z0-9\)\]])\^\{([^{}]+)\}/g, '$1<sup>$2</sup>');
        output = output.replace(/([A-Za-z0-9\)\]])\^([A-Za-z0-9+-]+)/g, '$1<sup>$2</sup>');
        output = output.replace(/([A-Za-z0-9\)\]])_\{([^{}]+)\}/g, '$1<sub>$2</sub>');
        output = output.replace(/([A-Za-z0-9\)\]])_([A-Za-z0-9+-]+)/g, '$1<sub>$2</sub>');
        for (const [command, replacement] of Object.entries(mathCommands)) {
          output = output.replace(new RegExp(command.replace(/[-/\\^*+?.()|[\]{}]/g, '\\$&'), 'g'), replacement);
        }
        return '<span class="' + (displayMode ? 'tex-block' : 'tex-inline') + '">' + output + '</span>';
      }
      function splitTextSegments(content) {
        const segments = [];
        let lastIndex = 0;
        mathPattern.lastIndex = 0;
        for (const match of String(content).matchAll(mathPattern)) {
          const start = match.index ?? 0;
          const raw = match[0];
          if (start > lastIndex) segments.push({ kind: 'text', value: String(content).slice(lastIndex, start) });
          if (raw.startsWith('$$')) segments.push({ kind: 'math', value: raw.slice(2, -2).trim(), display: true });
          else segments.push({ kind: 'math', value: raw.slice(1, -1).trim(), display: false });
          lastIndex = start + raw.length;
        }
        if (lastIndex < String(content).length) segments.push({ kind: 'text', value: String(content).slice(lastIndex) });
        return segments;
      }
      function renderTextContent(content, format) {
        const value = String(content ?? '');
        if (format === 'plain') {
          return '<div class="text-render plain">' + escapeHtml(value).replace(/\n/g, '<br />') + '</div>';
        }
        if (format === 'tex') {
          const segments = splitTextSegments(value);
          if (segments.length === 1 && segments[0]?.kind === 'text') {
            return '<div class="text-render tex">' + renderMathExpression(segments[0].value, true) + '</div>';
          }
          return '<div class="text-render tex">' + segments.map((segment) => segment.kind === 'math' ? renderMathExpression(segment.value, segment.display) : renderMarkdownBlocks(segment.value)).join('') + '</div>';
        }
        if (format === 'markdown') {
          return '<div class="text-render markdown">' + renderMarkdownBlocks(value) + '</div>';
        }
        const segments = splitTextSegments(value);
        return '<div class="text-render markdown-tex">' + segments.map((segment) => segment.kind === 'math' ? renderMathExpression(segment.value, segment.display) : renderMarkdownBlocks(segment.value)).join('') + '</div>';
      }
      function parseHash() {
        const raw = location.hash.startsWith('#/') ? location.hash.slice(2) : location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
        if (!raw) return { subjectId: null, noteId: null };
        const parts = raw.split('/').filter(Boolean);
        if (parts[0] === 'note') return { subjectId: parts[1] ?? null, noteId: parts[2] ?? null };
        return { subjectId: null, noteId: null };
      }
      function setHash(subjectId = null, noteId = null) {
        const next = subjectId && noteId ? '#/note/' + subjectId + '/' + noteId : '';
        if (location.hash === next) return;
        history.replaceState(null, '', next || location.pathname + location.search);
      }
      async function readJson(path) {
        if (!cache.has(path)) {
          cache.set(
            path,
            fetch(path).then((response) => {
              if (!response.ok) throw new Error('Failed to load ' + path + ': ' + response.status);
              return response.json();
            }),
          );
        }
        return cache.get(path);
      }
      async function loadNote(subjectId, noteId) {
        return readJson(dataRoot + '/notes/' + subjectId + '/' + noteId + '/note.json');
      }
      function elementBounds(element) {
        if (element.type === 'line') {
          const left = Math.min(element.start.x, element.end.x);
          const top = Math.min(element.start.y, element.end.y);
          const right = Math.max(element.start.x, element.end.x);
          const bottom = Math.max(element.start.y, element.end.y);
          return { left, top, right, bottom };
        }
        return { left: element.x, top: element.y, right: element.x + element.width, bottom: element.y + element.height };
      }
      function normalizedElements(note) {
        return [...(note?.canvas?.elements ?? [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      }
      function noteViewportFromData(note) {
        const viewport = note?.canvas?.viewport ?? { x: 0, y: 0, scale: 1 };
        return {
          x: Number.isFinite(viewport.x) ? viewport.x : 0,
          y: Number.isFinite(viewport.y) ? viewport.y : 0,
          scale: Number.isFinite(viewport.scale) ? viewport.scale : 1,
        };
      }
      function renderElement(subjectId, noteId, element) {
        if (element.type === 'text') {
          return '<div class="element text" style="left:' + element.x + 'px; top:' + element.y + 'px; width:' + element.width + 'px; height:' + element.height + 'px; z-index:' + element.zIndex + ';"><div class="surface" style="' + textStyleToString(element.style) + '">' + renderTextContent(element.content ?? '', element.format ?? 'plain') + '</div></div>';
        }
        if (element.type === 'image') {
          const src = dataRoot + '/notes/' + subjectId + '/' + noteId + '/' + element.src;
          return '<div class="element image" style="left:' + element.x + 'px; top:' + element.y + 'px; width:' + element.width + 'px; height:' + element.height + 'px; z-index:' + element.zIndex + ';"><img src="' + src + '" alt="' + escapeHtml(element.originalFileName || element.id) + '" draggable="false" /></div>';
        }
        if (element.type === 'rect') {
          return '<div class="element rect" style="left:' + element.x + 'px; top:' + element.y + 'px; width:' + element.width + 'px; height:' + element.height + 'px; z-index:' + element.zIndex + '; background:' + (element.fill ?? 'rgba(214, 232, 255, 0.8)') + '; border-color:' + (element.stroke ?? 'rgba(47, 93, 98, 0.8)') + '; border-width:' + (element.strokeWidth ?? 2) + 'px;"></div>';
        }
        if (element.type === 'ellipse') {
          return '<div class="element ellipse" style="left:' + element.x + 'px; top:' + element.y + 'px; width:' + element.width + 'px; height:' + element.height + 'px; z-index:' + element.zIndex + '; background:' + (element.fill ?? 'rgba(214, 232, 255, 0.8)') + '; border-color:' + (element.stroke ?? 'rgba(47, 93, 98, 0.8)') + '; border-width:' + (element.strokeWidth ?? 2) + 'px;"></div>';
        }
        if (element.type === 'line') {
          const bounds = elementBounds(element);
          return '<div class="element line" style="left:' + bounds.left + 'px; top:' + bounds.top + 'px; width:' + Math.max(1, bounds.right - bounds.left) + 'px; height:' + Math.max(1, bounds.bottom - bounds.top) + 'px; z-index:' + element.zIndex + ';"><svg class="element-svg" viewBox="0 0 ' + Math.max(1, bounds.right - bounds.left) + ' ' + Math.max(1, bounds.bottom - bounds.top) + '" preserveAspectRatio="none" aria-hidden="true"><line x1="' + (element.start.x - bounds.left) + '" y1="' + (element.start.y - bounds.top) + '" x2="' + (element.end.x - bounds.left) + '" y2="' + (element.end.y - bounds.top) + '" stroke="' + (element.stroke ?? '#2f5d62') + '" stroke-width="' + (element.strokeWidth ?? 6) + '" stroke-linecap="round" /></svg></div>';
        }
        if (element.type === 'freehand') {
          const bounds = elementBounds(element);
          const points = (element.points ?? []).map((point) => (point.x - bounds.left) + ',' + (point.y - bounds.top)).join(' ');
          return '<div class="element freehand" style="left:' + bounds.left + 'px; top:' + bounds.top + 'px; width:' + Math.max(1, bounds.right - bounds.left) + 'px; height:' + Math.max(1, bounds.bottom - bounds.top) + 'px; z-index:' + element.zIndex + ';"><svg class="element-svg" viewBox="0 0 ' + Math.max(1, bounds.right - bounds.left) + ' ' + Math.max(1, bounds.bottom - bounds.top) + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + points + '" fill="none" stroke="' + (element.stroke ?? '#1f1a17') + '" stroke-width="' + (element.strokeWidth ?? 4) + '" stroke-linecap="round" stroke-linejoin="round" /></svg></div>';
        }
        return '';
      }
      function renderViewport() {
        const world = document.getElementById('note-world');
        if (!world) return;
        world.style.transform = 'translate(' + state.viewport.x + 'px, ' + state.viewport.y + 'px) scale(' + state.viewport.scale + ')';
        const scaleLabel = document.querySelector('[data-viewport-scale]');
        if (scaleLabel) scaleLabel.textContent = 'scale ' + state.viewport.scale.toFixed(2);
      }
      function setViewport(next) {
        state.viewport = {
          x: Number.isFinite(next.x) ? next.x : 0,
          y: Number.isFinite(next.y) ? next.y : 0,
          scale: Math.min(10000, Math.max(0.00001, Number.isFinite(next.scale) ? next.scale : 1)),
        };
        renderViewport();
      }
      function zoomAtClientPoint(clientX, clientY, nextScaleRaw, stageRect) {
        const nextScale = Math.min(10000, Math.max(0.00001, nextScaleRaw));
        const worldX = (clientX - stageRect.left - state.viewport.x) / state.viewport.scale;
        const worldY = (clientY - stageRect.top - state.viewport.y) / state.viewport.scale;
        setViewport({
          scale: nextScale,
          x: clientX - stageRect.left - worldX * nextScale,
          y: clientY - stageRect.top - worldY * nextScale,
        });
      }
      function fitNoteToView() {
        const stage = document.getElementById('note-stage');
        if (!stage || !state.note) return;
        const elements = normalizedElements(state.note);
        if (elements.length === 0) {
          setViewport({ x: 40, y: 40, scale: 1 });
          return;
        }
        const bounds = elements.reduce((acc, element) => {
          const current = elementBounds(element);
          return {
            left: Math.min(acc.left, current.left),
            top: Math.min(acc.top, current.top),
            right: Math.max(acc.right, current.right),
            bottom: Math.max(acc.bottom, current.bottom),
          };
        }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
        const padding = 96;
        const rect = stage.getBoundingClientRect();
        const width = Math.max(1, bounds.right - bounds.left);
        const height = Math.max(1, bounds.bottom - bounds.top);
        const scale = Math.min((rect.width - padding * 2) / width, (rect.height - padding * 2) / height, 2);
        const safeScale = Math.min(10000, Math.max(0.00001, Number.isFinite(scale) ? scale : 1));
        setViewport({
          scale: safeScale,
          x: (rect.width - width * safeScale) / 2 - bounds.left * safeScale,
          y: (rect.height - height * safeScale) / 2 - bounds.top * safeScale,
        });
      }
      function bindStageInteractions() {
        const stage = document.getElementById('note-stage');
        if (!stage) return;
        stage.onwheel = (event) => {
          event.preventDefault();
          const rect = stage.getBoundingClientRect();
          if (event.ctrlKey || event.metaKey) {
            const nextScale = state.viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1);
            zoomAtClientPoint(event.clientX, event.clientY, nextScale, rect);
            return;
          }
          setViewport({ ...state.viewport, y: state.viewport.y - event.deltaY });
        };
        let dragging = null;
        stage.onpointerdown = (event) => {
          if (event.button !== 0 && event.button !== 1) return;
          const target = event.target;
          if (target instanceof Element && target.closest('.element')) return;
          event.preventDefault();
          stage.setPointerCapture(event.pointerId);
          dragging = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            viewport: { ...state.viewport },
          };
          stage.classList.add('dragging');
        };
        stage.onpointermove = (event) => {
          if (!dragging || dragging.pointerId !== event.pointerId) return;
          const dx = event.clientX - dragging.startX;
          const dy = event.clientY - dragging.startY;
          setViewport({ ...dragging.viewport, x: dragging.viewport.x + dx, y: dragging.viewport.y + dy });
        };
        const finishDrag = (event) => {
          if (!dragging || dragging.pointerId !== event.pointerId) return;
          dragging = null;
          stage.classList.remove('dragging');
          try {
            stage.releasePointerCapture(event.pointerId);
          } catch {}
        };
        stage.onpointerup = finishDrag;
        stage.onpointercancel = finishDrag;
      }
      function renderNoteScreen() {
        const note = state.note;
        if (!note || !state.subjectId || !state.noteId) {
          el.screen.innerHTML = '<section class="panel"><div class="empty-card"><h3>No note selected</h3><p class="empty">index.html から表示したいノートを選んでください。</p></div></section>';
          el.modeBadge.textContent = 'Viewer';
          el.navBack.onclick = null;
          el.navReset.disabled = true;
          el.navFit.disabled = true;
          return;
        }
        const elements = normalizedElements(note);
        state.viewportFromNote = noteViewportFromData(note);
        state.viewport = { ...state.viewportFromNote };
        el.modeBadge.textContent = 'Viewer';
        el.screen.innerHTML = '<section class="panel note-screen"><header class="note-screen-header"><div><h2>' + escapeHtml(note.title ?? 'Note') + '</h2><p class="summary">readonly view only. home からノートを選んで表示する画面です。</p></div><div class="note-meta-row"><span class="element-label">' + elements.length + ' elements</span><span class="element-label"><span data-viewport-scale>scale ' + state.viewport.scale.toFixed(2) + '</span></span></div></header><div class="note-screen-body"><div class="stage-shell"><div id="note-stage" class="stage"><div id="note-world" class="world">' + elements.map((element) => renderElement(state.subjectId, state.noteId, element)).join('') + '</div></div></div></div></section>';
        bindStageInteractions();
        renderViewport();
        el.navBack.onclick = () => { location.href = './index.html#/subject/' + state.subjectId; };
        el.navReset.disabled = false;
        el.navFit.disabled = false;
      }
      async function openNote(subjectId, noteId) {
        state.subjectId = subjectId;
        state.noteId = noteId;
        state.note = await loadNote(subjectId, noteId);
        setHash(subjectId, noteId);
        renderNoteScreen();
      }
      function openHome() {
        location.href = './index.html';
      }
      function syncNavigation() {
        const route = parseHash();
        if (route.subjectId && route.noteId) {
          el.navBack.disabled = false;
          return;
        }
        el.navBack.disabled = true;
      }
      async function bootstrap() {
        try {
          const route = parseHash();
          if (route.subjectId && route.noteId) {
            await openNote(route.subjectId, route.noteId);
          } else {
            el.screen.innerHTML = '<section class="panel"><div class="empty-card"><h3>Open a note</h3><p class="empty">index.html からノートを選ぶと、この viewer で表示します。</p></div></section>';
            syncNavigation();
          }
        } catch (error) {
          el.screen.innerHTML = '<section class="panel"><div class="empty-card"><h3>Failed to load</h3><div class="error">' + escapeHtml(error instanceof Error ? error.message : String(error)) + '</div></div></section>';
        }
      }
      document.getElementById('nav-home').addEventListener('click', openHome);
      el.navBack.addEventListener('click', () => {
        if (state.subjectId) {
          location.href = './index.html#/subject/' + state.subjectId;
          return;
        }
        openHome();
      });
      el.navReset.addEventListener('click', () => setViewport(state.viewportFromNote));
      el.navFit.addEventListener('click', () => fitNoteToView());
      window.addEventListener('hashchange', () => {
        const route = parseHash();
        if (route.subjectId && route.noteId) {
          void openNote(route.subjectId, route.noteId);
        } else {
          openHome();
        }
      });
      bootstrap();
    </script>
  </body>
</html>`;

export function getWorkspaceViewerHtml() {
  return VIEWER_HTML;
}

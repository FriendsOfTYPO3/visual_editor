// spotlight-overlay.js

const SVG_NS = 'http://www.w3.org/2000/svg';

let styleEl = null;
let overlayEl = null;
let svgEl = null;
let maskEl = null;
let maskBgRect = null;

let currentTargets = [];
let isActive = false;
let listenersAdded = false;

const HOLE_PADDING = 8; // Abstand um das aktive Element

function ensureStyle() {
  if (styleEl) return;

  const css = `
.spotlight-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 999999;
  mask: url(#spotlight-mask);
  -webkit-mask: url(#spotlight-mask);
}

.spotlight-overlay--active {
  opacity: 1;
}
`;

  styleEl = document.createElement('style');
  styleEl.appendChild(document.createTextNode(css));
  document.head.appendChild(styleEl);
}

function ensureOverlay() {
  if (overlayEl) return;

  overlayEl = document.createElement('div');
  overlayEl.className = 'spotlight-overlay';
  overlayEl.id = 'spotlightOverlay';
  document.body.appendChild(overlayEl);
}

function ensureSvgMask() {
  if (svgEl && maskEl && maskBgRect) return;

  // SVG-Container
  svgEl = document.createElementNS(SVG_NS, 'svg');
  svgEl.setAttribute('id', 'spotlight-svg');
  svgEl.setAttribute('width', '0');
  svgEl.setAttribute('height', '0');
  svgEl.setAttribute('aria-hidden', 'true');
  svgEl.style.position = 'fixed';
  svgEl.style.top = '0';
  svgEl.style.left = '0';
  svgEl.style.pointerEvents = 'none';

  // Maske
  maskEl = document.createElementNS(SVG_NS, 'mask');
  maskEl.setAttribute('id', 'spotlight-mask');
  maskEl.setAttribute('maskUnits', 'userSpaceOnUse');
  maskEl.setAttribute('maskContentUnits', 'userSpaceOnUse');

  // Hintergrund (weiß = Overlay sichtbar)
  maskBgRect = document.createElementNS(SVG_NS, 'rect');
  maskBgRect.setAttribute('id', 'spotlight-mask-bg');
  maskBgRect.setAttribute('x', '0');
  maskBgRect.setAttribute('y', '0');
  maskBgRect.setAttribute('fill', 'white');

  // Grundfläche auf aktuelle Viewportgröße setzen
  maskBgRect.setAttribute('width', window.innerWidth);
  maskBgRect.setAttribute('height', window.innerHeight);

  maskEl.appendChild(maskBgRect);
  svgEl.appendChild(maskEl);
  document.body.appendChild(svgEl);
}

function ensureInfrastructure() {
  ensureStyle();
  ensureOverlay();
  ensureSvgMask();
}

function clearHoles() {
  if (!maskEl) return;
  maskEl.querySelectorAll('rect[data-spotlight-hole]').forEach(r => r.remove());
}

function updateViewportRect() {
  if (!maskBgRect) return;
  maskBgRect.setAttribute('width', window.innerWidth);
  maskBgRect.setAttribute('height', window.innerHeight);
}

function updateMask() {
  if (!isActive || !maskEl) return;

  updateViewportRect();
  clearHoles();

  if (!currentTargets.length) return;

  currentTargets.forEach(el => {
    if (!(el instanceof Element)) return;

    const rect = el.getBoundingClientRect();

    const hole = document.createElementNS(SVG_NS, 'rect');
    hole.setAttribute('data-spotlight-hole', 'true');

    const x = rect.left - HOLE_PADDING;
    const y = rect.top - HOLE_PADDING;
    const w = rect.width + HOLE_PADDING * 2;
    const h = rect.height + HOLE_PADDING * 2;

    hole.setAttribute('x', x);
    hole.setAttribute('y', y);
    hole.setAttribute('width', w);
    hole.setAttribute('height', h);
    hole.setAttribute('fill', 'black'); // schwarz = Loch in der Maske

    maskEl.appendChild(hole);
  });
}

function onWindowChanged() {
  if (!isActive) return;
  updateMask();
}

const resizeObserver = new ResizeObserver(() => onWindowChanged());
const mutationObserver = new MutationObserver(() => onWindowChanged());

function addListeners() {
  if (listenersAdded) return;
  listenersAdded = true;

  currentTargets.forEach(el => {
    resizeObserver.observe(el);
    mutationObserver.observe(el,{
      subtree: true,
      childList: true,
    });
  });
  window.addEventListener('resize', onWindowChanged);
  window.addEventListener('scroll', onWindowChanged, {passive: true});
}

function removeListeners() {
  if (!listenersAdded) return;
  listenersAdded = false;

  resizeObserver.disconnect();
  mutationObserver.disconnect();
  window.removeEventListener('resize', onWindowChanged);
  window.removeEventListener('scroll', onWindowChanged);

}

/**
 *
 * @param selectorToHighlight {String}
 * @returns {HTMLElement[]}
 */
function selectElements(selectorToHighlight) {
  function travers(el) {
    let result = [];
    el.querySelectorAll('*').forEach(
      child => {
        if (['absolute', 'fixed'].includes(window.getComputedStyle(child).position)) {
          result.push(child);
        }
        if (child.shadowRoot) {
          result = [...result, ...travers(child.shadowRoot)];
        }
      },
    );
    return result;
  }

  let result = [];
  document.querySelectorAll(selectorToHighlight).forEach(el => {
    result.push(el);
    result = [...result, ...travers(el)];
    if (el.shadowRoot) {
      result = [...result, ...travers(el.shadowRoot)];
    }
  });
  return result;
}

let currentSelectorToHighlight;

/**
 * Aktiviert das Spotlight-Overlay und schneidet für alle Matches
 * des übergebenen Selectors „Löcher“ ins Overlay.
 *
 * @param {string} selectorToHighlight
 */
export function highlight(selectorToHighlight) {
  currentSelectorToHighlight = selectorToHighlight;
  ensureInfrastructure();

  currentTargets = selectElements(selectorToHighlight);

  if (!currentTargets.length) {
    // Nichts zum Highlighten → lieber alles zurücksetzen
    reset();
    return;
  }

  isActive = true;
  overlayEl.classList.add('spotlight-overlay--active');
  addListeners();
  updateMask();
}

/**
 * Deaktiviert das Spotlight-Overlay und entfernt alle Löcher.
 */
export function reset() {
  isActive = false;
  currentTargets = [];

  if (overlayEl) {
    overlayEl.classList.remove('spotlight-overlay--active');
  }

  clearHoles();
  removeListeners();
}

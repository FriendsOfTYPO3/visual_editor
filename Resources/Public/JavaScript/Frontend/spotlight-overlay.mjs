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

const HOLE_PADDING_BLOCK = 8; // Distance around the active element
const HOLE_PADDING_INLINE = 10; // Distance around the active element

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

  // SVG container
  svgEl = document.createElementNS(SVG_NS, 'svg');
  svgEl.setAttribute('id', 'spotlight-svg');
  svgEl.setAttribute('width', '0');
  svgEl.setAttribute('height', '0');
  svgEl.setAttribute('aria-hidden', 'true');
  svgEl.style.position = 'fixed';
  svgEl.style.top = '0';
  svgEl.style.left = '0';
  svgEl.style.pointerEvents = 'none';

  // Mask
  maskEl = document.createElementNS(SVG_NS, 'mask');
  maskEl.setAttribute('id', 'spotlight-mask');
  maskEl.setAttribute('maskUnits', 'userSpaceOnUse');
  maskEl.setAttribute('maskContentUnits', 'userSpaceOnUse');

  // Background (white = overlay visible)
  maskBgRect = document.createElementNS(SVG_NS, 'rect');
  maskBgRect.setAttribute('id', 'spotlight-mask-bg');
  maskBgRect.setAttribute('x', '0');
  maskBgRect.setAttribute('y', '0');
  maskBgRect.setAttribute('fill', 'white');

  // Set base area to the current viewport size
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

    const x = rect.left - HOLE_PADDING_INLINE;
    const y = rect.top - HOLE_PADDING_BLOCK;
    const w = rect.width + HOLE_PADDING_INLINE * 2;
    const h = rect.height + HOLE_PADDING_BLOCK * 2;

    hole.setAttribute('x', x);
    hole.setAttribute('y', y);
    hole.setAttribute('width', w);
    hole.setAttribute('height', h);
    hole.setAttribute('fill', 'black'); // black = hole in the mask

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
    mutationObserver.observe(el, {
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
 * Activates the spotlight overlay and cuts 'holes' into the overlay for all
 * matches of the passed selector.
 *
 * @param {string} selectorToHighlight
 */
export function highlight(selectorToHighlight) {
  currentSelectorToHighlight = selectorToHighlight;
  ensureInfrastructure();

  currentTargets = selectElements(selectorToHighlight);

  if (!currentTargets.length) {
    // Nothing to highlight → reset everything instead
    reset();
    return;
  }

  isActive = true;
  overlayEl.classList.add('spotlight-overlay--active');
  addListeners();
  updateMask();
}

/**
 * Deactivates the spotlight overlay and removes all holes.
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

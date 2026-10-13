// spotlight-overlay.js
// Darkens the viewport and "cuts out" click-through holes around target elements.
// Outside the holes: NOT click-through (blocked). Inside the holes: click-through.
// Fixes overlapping holes by union-merging rectangles before building the evenodd path.

const SVG_NS = 'http://www.w3.org/2000/svg';

let styleEl = null;
let overlaySvgEl = null;
let overlayPathEl = null;

let currentTargets = [];
let isActive = false;
let listenersAdded = false;
let updateScheduled = false;
let lastPathD = null;

// Size of the whole document; the overlay is anchored to the document (not the viewport),
// so the browser scrolls it together with the content and the holes never lag behind.
let docWidth = 0;
let docHeight = 0;

const HOLE_PADDING_BLOCK = 8; // top/bottom padding around highlighted element
const HOLE_PADDING_INLINE = 10; // left/right padding around highlighted element

const EPS = 1e-6; // float compare tolerance

const resizeObserver = new ResizeObserver(() => scheduleUpdate());
const mutationObserver = new MutationObserver(() => scheduleUpdate());

function ensureStyle() {
  if (styleEl) return;

  const css = `
/* SVG overlay that blocks clicks only where it is painted (outside the holes).
   It is positioned in document coordinates; width/height are set inline. */
.spotlight-overlay-svg {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  max-height: none;
  z-index: 999999;
  opacity: 0;
  transition: opacity 0.2s ease;

  /* Root SVG does NOT catch pointer events.
     Only the painted path catches pointer events (outside holes).
  */
  pointer-events: none;
}

.spotlight-overlay-svg--active {
  opacity: 1;
}

.spotlight-overlay-svg--active .spotlight-overlay-path {
  pointer-events: auto; /* dark area blocks interactions */
}
`;

  styleEl = document.createElement('style');
  styleEl.appendChild(document.createTextNode(css));
  document.head.appendChild(styleEl);
}

function ensureOverlay() {
  if (overlaySvgEl && overlayPathEl) return;

  overlaySvgEl = document.createElementNS(SVG_NS, 'svg');
  overlaySvgEl.setAttribute('id', 'spotlightOverlay');
  overlaySvgEl.setAttribute('class', 'spotlight-overlay-svg');
  overlaySvgEl.setAttribute('aria-hidden', 'true');
  overlaySvgEl.setAttribute('focusable', 'false');

  overlayPathEl = document.createElementNS(SVG_NS, 'path');
  overlayPathEl.setAttribute('class', 'spotlight-overlay-path');
  overlayPathEl.setAttribute('fill', 'rgba(0,0,0,0.8)');
  overlayPathEl.setAttribute('fill-rule', 'evenodd'); // outer rect minus holes

  overlaySvgEl.setAttribute('preserveAspectRatio', 'none');

  overlaySvgEl.appendChild(overlayPathEl);
  document.documentElement.appendChild(overlaySvgEl);

  // After the fade-out the overlay is collapsed, so it cannot keep the document scrollable.
  overlaySvgEl.addEventListener('transitionend', () => {
    if (!isActive) collapseOverlay();
  });

  collapseOverlay();
}

function ensureInfrastructure() {
  ensureStyle();
  ensureOverlay();
}

function setOverlaySize(width, height) {
  // Inline style, because site CSS such as `svg {max-width: 100%; height: auto}`
  // would override the width/height attributes.
  overlaySvgEl.style.width = `${width}px`;
  overlaySvgEl.style.height = `${height}px`;
  overlaySvgEl.setAttribute('width', String(width));
  overlaySvgEl.setAttribute('height', String(height));
  overlaySvgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
}

function collapseOverlay() {
  if (!overlaySvgEl) return;
  setOverlaySize(0, 0);
  docWidth = 0;
  docHeight = 0;
  lastPathD = null;
}

function updateDocumentSize() {
  if (!overlaySvgEl) return;

  // Measure with the overlay collapsed, otherwise it inflates the scroll size itself
  // and the document could never shrink again.
  setOverlaySize(0, 0);
  const root = document.scrollingElement || document.documentElement;
  docWidth = Math.max(root.scrollWidth, root.clientWidth);
  docHeight = Math.max(root.scrollHeight, root.clientHeight);
  setOverlaySize(docWidth, docHeight);
}

function buildOverlayPathD(holes) {
  // Full document rectangle
  let d = `M 0 0 H ${docWidth} V ${docHeight} H 0 Z`;

  // Each hole rectangle; with fill-rule: evenodd, these become cut-outs
  for (const hole of holes) {
    const x1 = hole.x;
    const y1 = hole.y;
    const x2 = hole.x + hole.w;
    const y2 = hole.y + hole.h;

    d += ` M ${x1} ${y1} H ${x2} V ${y2} H ${x1} Z`;
  }

  return d;
}

function clampRectToDocument(r) {
  const x1 = Math.max(0, Math.min(docWidth, r.x));
  const y1 = Math.max(0, Math.min(docHeight, r.y));
  const x2 = Math.max(0, Math.min(docWidth, r.x + r.w));
  const y2 = Math.max(0, Math.min(docHeight, r.y + r.h));

  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);

  return {x: x1, y: y1, w, h};
}

/**
 * Union-merge axis-aligned rectangles into a set of non-overlapping rectangles.
 * This prevents evenodd "parity cancellation" when holes overlap.
 *
 * Strategy:
 *  - Split plane into vertical strips by all unique x boundaries.
 *  - For each strip, merge y-intervals covered by any rect in that strip.
 *  - Merge identical y-interval rectangles across adjacent strips.
 */
function unionRects(rects) {
  const normalized = rects
    .map(clampRectToDocument)
    .filter(r => r.w > EPS && r.h > EPS);

  if (normalized.length <= 1) return normalized;

  // Convert to x1/x2/y1/y2
  const rs = normalized.map(r => ({
    x1: r.x,
    x2: r.x + r.w,
    y1: r.y,
    y2: r.y + r.h,
  }));

  // Unique x boundaries
  const xs = Array.from(new Set(rs.flatMap(r => [r.x1, r.x2]))).sort((a, b) => a - b);

  const mergedRects = [];
  const activeByKey = new Map(); // key -> last rect we can extend horizontally

  function keyForInterval(y1, y2) {
    // rounding stabilizes float equality a bit
    return `${y1.toFixed(3)}|${y2.toFixed(3)}`;
  }

  for (let i = 0; i < xs.length - 1; i++) {
    const xL = xs[i];
    const xR = xs[i + 1];
    const dx = xR - xL;
    if (dx <= EPS) continue;

    // Find y-intervals covered in this strip
    const intervals = [];
    for (const r of rs) {
      if (r.x1 <= xL + EPS && r.x2 >= xR - EPS) {
        intervals.push([r.y1, r.y2]);
      }
    }

    if (!intervals.length) {
      // nothing covered here -> stop extending any active rects
      activeByKey.clear();
      continue;
    }

    // Merge y intervals
    intervals.sort((a, b) => a[0] - b[0]);
    const mergedIntervals = [];
    let [curS, curE] = intervals[0];

    for (let k = 1; k < intervals.length; k++) {
      const [s, e] = intervals[k];
      if (s <= curE + EPS) {
        curE = Math.max(curE, e);
      } else {
        mergedIntervals.push([curS, curE]);
        curS = s;
        curE = e;
      }
    }
    mergedIntervals.push([curS, curE]);

    // For this strip, create/extend rects per merged interval
    const keysInThisStrip = new Set();

    for (const [y1, y2] of mergedIntervals) {
      const dy = y2 - y1;
      if (dy <= EPS) continue;

      const key = keyForInterval(y1, y2);
      keysInThisStrip.add(key);

      const prev = activeByKey.get(key);
      if (prev && Math.abs(prev.x + prev.w - xL) <= 0.5) {
        // extend horizontally; allow tiny rounding differences (0.5px tolerance)
        prev.w += dx;
      } else {
        const nr = {x: xL, y: y1, w: dx, h: dy};
        mergedRects.push(nr);
        activeByKey.set(key, nr);
      }
    }

    // Stop extending intervals that didn't appear in this strip
    for (const key of Array.from(activeByKey.keys())) {
      if (!keysInThisStrip.has(key)) activeByKey.delete(key);
    }
  }

  return mergedRects;
}

/**
 * Walk upwards across light DOM, slots, and shadow boundaries.
 *
 * @param {Node|null} node
 * @returns {Element|null}
 */
function getComposedParent(node) {
  if (!node) return null;
  if (node.assignedSlot) return node.assignedSlot;
  if (node.parentNode instanceof ShadowRoot) return node.parentNode.host;
  if (node.parentElement) return node.parentElement;
  return node.parentNode instanceof Element ? node.parentNode : null;
}

/**
 * Returns whether the target is visually reachable for spotlighting.
 * Elements inside closed <details> stay visible only when they are inside
 * that details element's direct <summary> subtree.
 *
 * @param {Element} element
 * @returns {boolean}
 */
function isTargetVisible(element) {
  if (!(element instanceof Element) || !element.isConnected) return false;

  let current = element;
  let visibleSummaryOwner = null;

  while (current) {
    if (current instanceof HTMLElement && current.tagName === 'SUMMARY') {
      visibleSummaryOwner = current.parentElement instanceof HTMLDetailsElement ?
        current.parentElement
        : null;
    }

    if (current instanceof HTMLDetailsElement) {
      if (!current.open && visibleSummaryOwner !== current) {
        return false;
      }
      if (visibleSummaryOwner === current) {
        visibleSummaryOwner = null;
      }
    }

    current = getComposedParent(current);
  }

  return true;
}

function computeHolesFromTargets() {
  const holes = [];

  for (const el of currentTargets) {
    if (!(el instanceof Element) || !isTargetVisible(el)) continue;

    const rect = el.getBoundingClientRect();
    if (!rect || (rect.width <= EPS && rect.height <= EPS)) continue;

    const x = rect.left + window.scrollX - HOLE_PADDING_INLINE;
    const y = rect.top + window.scrollY - HOLE_PADDING_BLOCK;
    const w = rect.width + HOLE_PADDING_INLINE * 2;
    const h = rect.height + HOLE_PADDING_BLOCK * 2;

    holes.push({x, y, w, h});
  }

  // Critical fix: union overlapping rectangles
  return unionRects(holes);
}

function updateOverlayPath() {
  if (!overlayPathEl || !isActive) return;

  updateDocumentSize();

  const d = buildOverlayPathD(computeHolesFromTargets());
  if (d === lastPathD) return;

  lastPathD = d;
  overlayPathEl.setAttribute('d', d);
}

function isSameTargetList(a, b) {
  return a.length === b.length && a.every((el, i) => el === b[i]);
}

/**
 * Re-selects the targets and only re-observes them when the list changed.
 * Re-observing an unchanged list would make the ResizeObserver fire again.
 */
function refreshTargets() {
  const targets = selectElements(currentSelectorToHighlight);
  if (isSameTargetList(targets, currentTargets)) return;

  currentTargets = targets;
  observeTargets();
}

function runScheduledUpdate() {
  updateScheduled = false;
  if (!isActive) return;

  refreshTargets();
  updateOverlayPath();
}

/**
 * Coalesces all change notifications into at most one update per frame.
 */
function scheduleUpdate() {
  if (!isActive || updateScheduled) return;
  updateScheduled = true;
  requestAnimationFrame(runScheduledUpdate);
}

function observeTargets() {
  resizeObserver.disconnect();
  mutationObserver.disconnect();

  resizeObserver.observe(document.documentElement);

  currentTargets.forEach((el) => {
    if (!(el instanceof Element)) return;

    resizeObserver.observe(el);

    mutationObserver.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    if (el.shadowRoot) {
      mutationObserver.observe(el.shadowRoot, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }
  });
}

function addListeners() {
  if (listenersAdded) return;
  listenersAdded = true;

  observeTargets();

  document.addEventListener('toggle', scheduleUpdate, {capture: true});
  window.addEventListener('resize', scheduleUpdate);
}

function removeListeners() {
  if (!listenersAdded) return;
  listenersAdded = false;

  resizeObserver.disconnect();
  mutationObserver.disconnect();

  document.removeEventListener('toggle', scheduleUpdate, {capture: true});
  window.removeEventListener('resize', scheduleUpdate);
}

/**
 * Select elements to highlight, plus absolutely/fixed positioned descendants
 * (including Shadow DOM) so floating UI stays "hole-visible".
 *
 * @param {String} selectorToHighlight
 * @returns {HTMLElement[]}
 */
function selectElements(selectorToHighlight) {
  function traverse(root) {
    let result = [];
    root.querySelectorAll('*').forEach((child) => {
      const pos = window.getComputedStyle(child).position;
      if (pos === 'absolute' || pos === 'fixed') {
        result.push(child);
      }
      if (child.shadowRoot) {
        result = result.concat(traverse(child.shadowRoot));
      }
    });
    return result;
  }

  let result = [];
  document.querySelectorAll(selectorToHighlight).forEach((el) => {
    result.push(el);
    result = result.concat(traverse(el));

    if (el.shadowRoot) {
      result = result.concat(traverse(el.shadowRoot));
    }
  });

  return Array.from(new Set(result));
}

let currentSelectorToHighlight = null;

/**
 * Activates the spotlight overlay and cuts click-through holes around all matches
 * of the passed selector.
 *
 * @param {string} selectorToHighlight
 */
export function highlight(selectorToHighlight) {
  currentSelectorToHighlight = selectorToHighlight;
  ensureInfrastructure();

  removeListeners();
  currentTargets = selectElements(currentSelectorToHighlight);

  if (!currentTargets.length) {
    reset();
    return;
  }

  isActive = true;
  overlaySvgEl.classList.add('spotlight-overlay-svg--active');

  addListeners();
  updateOverlayPath();
}

/**
 * Deactivates the spotlight overlay.
 */
export function reset() {
  const wasActive = isActive;

  isActive = false;
  currentTargets = [];
  currentSelectorToHighlight = null;

  if (overlaySvgEl) {
    overlaySvgEl.classList.remove('spotlight-overlay-svg--active');
    // An active overlay is collapsed once its fade-out has finished (transitionend).
    if (!wasActive) collapseOverlay();
  }

  removeListeners();
}

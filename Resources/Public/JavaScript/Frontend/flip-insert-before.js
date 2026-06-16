/**
 * Move `node` inside `parent` before `child` and animate
 * its movement + size change from old position to new position.
 *
 * Signature matches native insertBefore(parent, node, child)
 * @param {Node} parent
 * @param {Node} node
 * @param {Node} child
 * @returns {Node} The inserted node.
 */
export function flipInsertBefore(parent, node, child) {
  if (!parent || !node) {
    throw new Error('insertBefore(parent, node, child) requires at least parent and node.');
  }

  const prefersReducedMotion =
    typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Respect prefers-reduced-motion: just move, no animation.
  if (prefersReducedMotion) {
    parent.insertBefore(node, child || null);
    return node;
  }

  // 1. FIRST: snapshot positions + inline styles of all current children.
  const firstRects = new Map(); // Element -> DOMRect
  const styleSnapshots = new Map(); // Element -> { transition, transform, transformOrigin }

  const beforeChildren = Array.from(parent.children);
  beforeChildren.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      // Skip elements we can't meaningfully animate.
      return;
    }

    firstRects.set(el, rect);
    styleSnapshots.set(el, {
      transition: el.style.transition,
      transform: el.style.transform,
      transformOrigin: el.style.transformOrigin,
    });
  });

  // Also snapshot the moving node if it lives somewhere else in the DOM
  // (i.e. moving between parents).
  if (node.isConnected && !styleSnapshots.has(node)) {
    const rect = node.getBoundingClientRect();
    if (rect && !(rect.width === 0 && rect.height === 0)) {
      firstRects.set(node, rect);
      styleSnapshots.set(node, {
        transition: node.style.transition,
        transform: node.style.transform,
        transformOrigin: node.style.transformOrigin,
      });
    }
  }

  // 2. DOM CHANGE: perform the actual insertBefore.
  if (child && child.parentNode !== parent) {
    // If `child` doesn't belong to `parent`, fall back to append.
    parent.insertBefore(node, null);
  } else {
    parent.insertBefore(node, child || null);
  }

  // 3. LAST: measure new positions and apply inverted transforms.
  const duration = 300; // ms
  const easing = 'ease-out';
  const elementsToAnimate = [];

  const afterChildren = Array.from(parent.children);
  afterChildren.forEach((el) => {
    const firstRect = firstRects.get(el);
    if (!firstRect) return; // Element didn't exist before (pure enter); skip here.

    const lastRect = el.getBoundingClientRect();
    if (!lastRect || (lastRect.width === 0 && lastRect.height === 0)) {
      return;
    }

    // Compute deltas for FLIP.
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;

    let scaleX = firstRect.width / lastRect.width;
    let scaleY = firstRect.height / lastRect.height;

    if (!isFinite(scaleX) || scaleX === 0) scaleX = 1;
    if (!isFinite(scaleY) || scaleY === 0) scaleY = 1;

    const noTranslate = Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5;
    const noScale = Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01;

    if (noTranslate && noScale) {
      // No meaningful change → no animation needed.
      return;
    }

    const originalStyles =
      styleSnapshots.get(el) || {
        transition: el.style.transition,
        transform: el.style.transform,
        transformOrigin: el.style.transformOrigin,
      };

    // INVERT: visually put the element back where it came from.
    el.style.transition = 'none';
    el.style.transformOrigin = 'top left';
    el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;

    elementsToAnimate.push({
      element: el,
      originalStyles,
    });
  });

  // If nothing to animate, we’re done.
  if (!elementsToAnimate.length) {
    return node;
  }

  // Force a reflow so the inverted transforms are applied.
  parent.getBoundingClientRect();

  // 4. PLAY: animate all affected elements back to their new positions/sizes.
  requestAnimationFrame(() => {
    elementsToAnimate.forEach(({element, originalStyles}) => {
      const {transition, transform, transformOrigin} = originalStyles;

      // Animate transform back to the "natural" value.
      element.style.transition = `transform ${duration}ms ${easing}`;
      element.style.transform = transform || '';

      function cleanup() {
        element.style.transition = transition || '';
        element.style.transformOrigin = transformOrigin || '';
        element.style.transform = transform || '';
      }

      function onTransitionEnd(event) {
        if (event.propertyName !== 'transform') return;
        element.removeEventListener('transitionend', onTransitionEnd);
        cleanup();
      }

      element.addEventListener('transitionend', onTransitionEnd);

      // Fallback in case transitionend never fires (e.g., element removed mid-animation).
      setTimeout(() => {
        element.removeEventListener('transitionend', onTransitionEnd);
        cleanup();
      }, duration + 100);
    });
  });

  return node;
}

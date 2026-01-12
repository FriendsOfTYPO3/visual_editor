// sortNodes.js
//
// Sort HTMLElements by *composed tree* order (aka “what you see” order),
// taking Shadow DOM boundaries + slot distribution into account.
//
// Example you gave:
// shadow:  [Above] [slot] [Below]
// light:          [Main]  (assigned into slot)
// result: Above, Main, Below

/**
 * @param {HTMLElement[]} nodes
 * @return {HTMLElement[]}
 */
export function sortTheNodesThroughTheShadowRootsAndSlots(nodes) {
  // filter out none visible nodes:
  const list = nodes.filter(node => {
    const style = window.getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) !== 0;
  })

  const indexed = list.map((node, index) => ({ node, index }));

  // Cache composed-ancestor chains + composed-children lists for this call.
  const chainCache = new WeakMap();
  const childrenCache = new WeakMap();

  indexed.sort((a, b) => {
    const cmp = compareComposedPosition(a.node, b.node, chainCache, childrenCache);
    return cmp !== 0 ? cmp : a.index - b.index; // stable tie-breaker
  });

  return indexed.map((x) => x.node);
}

function compareComposedPosition(a, b, chainCache, childrenCache) {
  if (a === b) return 0;
  if (!a || !b) return a ? -1 : b ? 1 : 0;

  const chainA = getComposedChain(a, chainCache);
  const chainB = getComposedChain(b, chainCache);

  const rootA = chainA[chainA.length - 1];
  const rootB = chainB[chainB.length - 1];

  // Different roots (disconnected fragments, different documents, etc.)
  // => best-effort fallback.
  if (rootA !== rootB) {
    return fallbackDomOrder(a, b);
  }

  // Find LCA (lowest common ancestor) in composed-parent space.
  let i = chainA.length - 1;
  let j = chainB.length - 1;
  while (i >= 0 && j >= 0 && chainA[i] === chainB[j]) {
    i--;
    j--;
  }

  // One is ancestor of the other in composed tree => ancestor comes first.
  if (i < 0) return -1;
  if (j < 0) return 1;

  const lca = chainA[i + 1];
  const childA = chainA[i];
  const childB = chainB[j];

  const siblings = getComposedChildren(lca, childrenCache);

  let idxA = -1;
  let idxB = -1;

  for (let k = 0; k < siblings.length && (idxA === -1 || idxB === -1); k++) {
    const n = siblings[k];
    if (n === childA) idxA = k;
    if (n === childB) idxB = k;
  }

  if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
    return idxA < idxB ? -1 : 1;
  }

  // If we couldn't locate one/both in composed-children, fall back.
  return fallbackDomOrder(childA, childB) || fallbackDomOrder(a, b);
}

function getComposedChain(node, chainCache) {
  const cached = chainCache.get(node);
  if (cached) return cached;

  const chain = [];
  const seen = new Set();
  let cur = node;

  while (cur && typeof cur === "object" && !seen.has(cur)) {
    chain.push(cur);
    seen.add(cur);
    cur = getComposedParent(cur);
  }

  chainCache.set(node, chain);
  return chain;
}

function getComposedParent(node) {
  // Slotting: assigned nodes behave as children of their assigned slot.
  if (node && node.nodeType === Node.ELEMENT_NODE) {
    const slot = /** @type {Element} */ (node).assignedSlot;
    if (slot) return slot;
  }

  const parent = node.parentNode;
  if (!parent) return null;

  // Shadow boundary: children of a ShadowRoot have the host as composed parent.
  if (parent instanceof ShadowRoot) return parent.host;

  return parent;
}

function getComposedChildren(node, childrenCache) {
  const cached = childrenCache.get(node);
  if (cached) return cached;

  let out = [];

  // Slot: its “composed children” are its assigned nodes (flattened), or fallback content.
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true });
    out = assigned.length ? assigned : Array.from(node.childNodes);
    childrenCache.set(node, out);
    return out;
  }

  // Document / fragments
  if (node instanceof Document || node instanceof DocumentFragment) {
    out = Array.from(node.childNodes);
    childrenCache.set(node, out);
    return out;
  }

  // Elements
  if (node instanceof Element) {
    // Host with shadowRoot: primary children come from shadow root.
    // To keep deterministic ordering even if someone passes *un-slotted* light DOM children,
    // we append unassigned light children after the shadow tree.
    const sr = node.shadowRoot;
    if (sr) {
      const shadowKids = Array.from(sr.childNodes);

      const lightKids = Array.from(node.childNodes);
      if (lightKids.length) {
        const assigned = new Set();
        // Collect nodes assigned into *any* slot in this shadow root (flattened).
        // Those are represented under their slots, not as direct children of the host.
        const slots = sr.querySelectorAll("slot");
        for (const s of slots) {
          for (const n of s.assignedNodes({ flatten: true })) assigned.add(n);
        }
        const unassignedLight = lightKids.filter((n) => !assigned.has(n));
        out = shadowKids.concat(unassignedLight);
      } else {
        out = shadowKids;
      }

      childrenCache.set(node, out);
      return out;
    }

    // Regular element: light DOM children.
    out = Array.from(node.childNodes);
    childrenCache.set(node, out);
    return out;
  }

  childrenCache.set(node, out);
  return out;
}

function fallbackDomOrder(a, b) {
  if (!a || !b || a === b) return 0;

  // compareDocumentPosition works within a single DOM tree; across shadow boundaries
  // it can report disconnected. Still useful as a fallback.
  try {
    if (typeof a.compareDocumentPosition === "function") {
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    }
  } catch {
    // ignore
  }

  return 0;
}

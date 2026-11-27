/**
 * Mirrors the colors of the TYPO3 backend theme into the frontend iframe as `--ve-*` custom properties,
 * so the visual cues follow the backend theme (accent color, light/dark mode).
 *
 * Without a reachable (same-origin) backend parent the components fall back to their built-in defaults.
 */

const BACKEND_TOKENS = {
  '--ve-accent': '--typo3-state-primary-bg',
  '--ve-accent-contrast': '--typo3-state-primary-color',
  // the default button of the backend, the action bar looks like one
  '--ve-button-bg': '--typo3-state-default-bg',
  '--ve-button-color': '--typo3-state-default-color',
  '--ve-button-hover-bg': '--typo3-state-default-hover-bg',
  '--ve-success': '--typo3-state-success-bg',
  '--ve-danger': '--typo3-state-danger-bg',
};

// These are drawn on the website itself, whose background does not follow the backend color scheme.
// The light variant has enough contrast on light pages and on dark pages (with the white halo).
const PAGE_TOKENS = ['--ve-accent', '--ve-success'];

// The thin outline around the field rings, it keeps them visible on dark and colored pages.
const STATIC_TOKENS = {
  '--ve-halo': '#fff',
};

/**
 * Backend tokens are defined with light-dark() and var(), so the value is only resolved for a real property.
 *
 * @param {Document} backendDocument
 * @returns {Record<string, string>}
 */
function resolveBackendColors(backendDocument) {
  const probe = backendDocument.createElement('span');
  probe.style.display = 'none';
  backendDocument.body.appendChild(probe);

  const colors = {};
  try {
    for (const [property, token] of Object.entries(BACKEND_TOKENS)) {
      probe.style.color = '';
      probe.style.colorScheme = PAGE_TOKENS.includes(property) ? 'light' : '';
      probe.style.color = `var(${token})`;
      const resolved = backendDocument.defaultView.getComputedStyle(probe).color;
      if (resolved) {
        colors[property] = resolved;
      }
    }
  } finally {
    probe.remove();
  }
  return colors;
}

/**
 * The corner radius of a (small) button of the backend. The token is only defined on the buttons themselves,
 * and it is relative to the font size, so the resolved value is read from a button.
 *
 * @param {Document} backendDocument
 * @returns {string|null}
 */
function resolveBackendButtonRadius(backendDocument) {
  const probe = backendDocument.createElement('button');
  probe.className = 'btn btn-sm';
  probe.style.display = 'none';
  backendDocument.body.appendChild(probe);
  try {
    // display: none does not matter for the radius, but a detached style would not resolve
    const radius = backendDocument.defaultView.getComputedStyle(probe).borderTopLeftRadius;
    return radius && parseFloat(radius) > 0 ? radius : null;
  } finally {
    probe.remove();
  }
}

function applyBackendTheme() {
  for (const [property, value] of Object.entries(STATIC_TOKENS)) {
    document.documentElement.style.setProperty(property, value);
  }

  try {
    const backendDocument = window.parent.document;
    const colors = resolveBackendColors(backendDocument);
    for (const [property, value] of Object.entries(colors)) {
      document.documentElement.style.setProperty(property, value);
    }
    const radius = resolveBackendButtonRadius(backendDocument);
    if (radius) {
      document.documentElement.style.setProperty('--ve-button-radius', radius);
    }
  } catch {
    // cross-origin or no backend parent: keep the defaults of the components
  }
}

export function initializeThemeSync() {
  if (window.parent === window) {
    return;
  }

  applyBackendTheme();

  try {
    const backendWindow = window.parent;
    new MutationObserver(applyBackendTheme).observe(backendWindow.document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-scheme', 'data-theme'],
    });
    backendWindow.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyBackendTheme);
  } catch {
    // see above
  }
}

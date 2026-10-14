/**
 * Mirrors the colors of the TYPO3 backend theme into the frontend iframe as `--ve-*` custom properties,
 * so the visual cues follow the backend theme (accent color, light/dark mode).
 *
 * Without a reachable (same-origin) backend parent the components fall back to their built-in defaults.
 */

const BACKEND_TOKENS = {
  '--ve-accent': '--typo3-state-primary-bg',
  '--ve-accent-contrast': '--typo3-state-primary-color',
  '--ve-surface': '--typo3-surface-container-high',
  '--ve-on-surface': '--typo3-text-color-base',
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

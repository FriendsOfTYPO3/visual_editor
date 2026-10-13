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
  // the background of the toolbar of the module (.module-docheader), the action bars use it to look like a part of it
  '--ve-toolbar-bg': '--module-docheader-bg',
  '--ve-success': '--typo3-state-success-bg',
  '--ve-danger': '--typo3-state-danger-bg',
};

// The font size of the buttons and labels of the toolbar of the module, the action bars use it for their texts.
const BACKEND_FONT_SIZE_TOKENS = {
  '--ve-font-size': '--typo3-component-font-size',
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
      probe.style.color = `var(${token})`;
      const resolved = backendDocument.defaultView.getComputedStyle(probe).color;
      if (resolved) {
        colors[property] = resolved;
      }
    }

    for (const [property, token] of Object.entries(BACKEND_FONT_SIZE_TOKENS)) {
      probe.style.fontSize = '';
      probe.style.fontSize = `var(${token})`;
      const resolved = backendDocument.defaultView.getComputedStyle(probe).fontSize;
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

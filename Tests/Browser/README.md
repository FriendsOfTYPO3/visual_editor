# Plain-text editor browser regression checks

These real-DOM checks cover issue #132 using headless Chromium. CI runs them in
`JavaScript browser tests TYPO3: 13` and `JavaScript browser tests TYPO3: 14`;
any failed assertion or page error fails the job. Each job resolves Composer
dependencies for its TYPO3 major and tests that version's actual browser files.
The Node unit tests (`npm test`) cannot reproduce rendered `innerText` or CSS
`text-transform`.

All browser test code lives in `Tests/Browser/`. `run-playwright.mjs` handles
server/browser setup and reporting; all test cases are in
`plain-text.playwright.mjs` and `min-validation.playwright.mjs`. It runs them
through the same Playwright Page. Both suites execute and assert in Node, using
locators and genuine keyboard input. Browser evaluation handles structural DOM
fixtures, store updates, selection identity, and synchronous focus/blur races.

From the repository root, with Docker or Podman installed:

```sh
./Build/Scripts/runTests.sh -s playwright
```

The runner uses the official Playwright image with Chromium and its system
dependencies already installed. It installs the locked npm dependencies in a
temporary `node_modules` mount, preserving any host installation, and caches
npm downloads in `.cache/npm`. When TYPO3's browser dependencies are missing,
it first runs `composer install` in the selected PHP test container (use `-p`
to select the PHP version). Composer plugins and scripts are disabled for this
preparation so installation does not run repository formatting hooks. Existing
dependencies are reused; Composer downloads are cached in `.cache/composer`.
Failed installation or tests return a nonzero exit status.
Use `-b podman` to select Podman explicitly. No local PHP, Node.js or TYPO3 site
setup is needed. The first run downloads the images; CI uses this same command.

Alternatively, use a local Node.js installation:

```sh
composer install
npm ci
npm run test:browser
```

The command uses Playwright's installed Chromium, then looks for `chromium` or
`chromium-browser` on `PATH`. If neither is available, it downloads Chromium
automatically on the first run; subsequent runs reuse it. No TYPO3 installation
or separately started web server is required. Use Node.js 22 or newer.

To download Playwright's pinned browser ahead of time (for example before going
offline), run `npm run test:browser:install`. On minimal Linux installations,
install the required system libraries once with
`npx playwright install-deps chromium` (requires administrator privileges).

The runner starts a temporary server on an ephemeral loopback port and loads
the actual editor component, store, and editing modules with an import map.
TYPO3's translation helper and bundled Lit modules are served directly from
`vendor/typo3/cms-core/Resources/Public/JavaScript/`, installed by Composer.
No external requests are needed during the tests. The browser and server are
closed afterward. To use an existing Chromium installation, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path.

Checks cover inherited case transformations, Unicode, multiline/whitespace
handling, real selections, inline and block shadow-root editors, immediate
focus/blur, focus callback races, store/save/reset synchronization, and absence
of style mutations while reading. Editing styles stay active until blur has
finished storing the raw text, then the frontend's case transformation returns.

The minimum-length suite tests real keyboard input through Lit updates, further
deletion, correction, blur/refocus, and changes to validation rules. These checks
share the component's actual store instance and assert its invalid-field state
and count.

These are component/editing regressions. Full TYPO3 save/reload remains an
integration check on an actual site.

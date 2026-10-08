/**
 * Runs editor JavaScript components directly in headless Chromium using
 * TYPO3's Composer-provided browser modules, without a running TYPO3 instance.
 * Checks text casing, normalization, focus/blur, selections, and store updates.
 * Uses a minimal page and the JavaScript store; PHP DataHandler execution,
 * database persistence, and full TYPO3 save/reload are outside its scope.
 * Browser coverage is limited to Chromium.
 */

import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {existsSync} from 'node:fs';
import {delimiter, join, resolve, sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

function browserExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  if (existsSync(chromium.executablePath())) {
    return chromium.executablePath();
  }

  for (const directory of (process.env.PATH || '').split(delimiter).filter(Boolean)) {
    for (const name of ['chromium', 'chromium-browser', 'chromium.exe']) {
      const executable = join(directory, name);
      if (existsSync(executable)) {
        console.log(`Using installed Chromium: ${executable}`);
        return executable;
      }
    }
  }

  console.log('Installing Playwright Chromium for the first browser test run…');
  const cli = fileURLToPath(new URL('./cli.js', import.meta.resolve('playwright/package.json')));
  const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], {stdio: 'inherit'});

  if (result.error || result.status !== 0) {
    throw new Error('Chromium installation failed. Retry with npm run test:browser:install or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.', {cause: result.error});
  }

  return chromium.executablePath();
}

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const core = '/vendor/typo3/cms-core/Resources/Public/JavaScript/';

if (!existsSync(join(root, core, 'lit-helper.js'))) {
  throw new Error('TYPO3 browser dependencies are missing. Run composer install or ./Build/Scripts/runTests.sh -s playwright first.');
}

// Resolve TYPO3 and Lit from the Composer version being tested.
const imports = {
  '@typo3/visual-editor/': '/Resources/Public/JavaScript/',
  '@typo3/core/': core,
  'lit': `${core}Contrib/lit/index.js`,
  'lit/': `${core}Contrib/lit/`,
  'lit-html': `${core}Contrib/lit-html/lit-html.js`,
  'lit-html/': `${core}Contrib/lit-html/`,
  'lit-element/': `${core}Contrib/lit-element/`,
  '@lit/reactive-element': `${core}Contrib/@lit/reactive-element/reactive-element.js`,
  '@lit/reactive-element/': `${core}Contrib/@lit/reactive-element/`,
};

const html = `<!doctype html><meta charset="utf-8"><h1>Visual Editor #132 regression</h1>
<button id="outside">Outside editor</button>
<script>
window.veInfo = {languageId: 0, allowedOrigins: [location.origin]};
window.TYPO3 = {lang: {'validation.max': 'Max %d', 'inputDenial.noNewlines': 'No line breaks'}};
</script>
<script type="importmap">${JSON.stringify({imports})}</script>
<script type="module">
import {runTests} from '/Resources/Public/JavaScript/Frontend/components/ve-editable-text/plain-text.browser.js';
window.browserTests = await runTests();
</script>`;

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end(html);
    return;
  }

  // TYPO3 import-map module names omit the .js suffix.
  const file = resolve(root, `.${pathname}${pathname.endsWith('.js') ? '' : '.js'}`);

  if (!file.startsWith(root + sep) || !['/Resources/Public/JavaScript/', core].some(prefix => pathname.startsWith(prefix))) {
    response.writeHead(404).end();
    return;
  }

  try {
    const source = await readFile(file);
    response.setHeader('Content-Type', 'text/javascript');
    response.end(source);
  } catch {
    response.writeHead(404).end();
  }
});

const browser = await chromium.launch({
  executablePath: browserExecutable(),
});

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error(error.message);
  });

  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.browserTests !== undefined, undefined, {timeout: 10000});

  const results = await page.evaluate(() => window.browserTests);
  console.log(results.join('\n'));

  const failures = results.filter(result => result.startsWith('FAIL'));
  console.log(`${results.length - failures.length}/${results.length} browser regressions passed`);

  if (results.length === 0 || failures.length > 0 || errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

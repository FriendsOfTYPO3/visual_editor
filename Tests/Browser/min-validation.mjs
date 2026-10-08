import assert from 'node:assert/strict';

async function readState(page) {
  return page.evaluate(async () => {
    const editor = document.getElementById('min-validation-editor');

    // A canonical value update must not clear errors in a later Lit render.
    await editor.updateComplete;
    await new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    await editor.updateComplete;

    // Match the production specifier to share its actual store instance.
    const {dataHandlerStore} = await import(
      '@typo3/visual-editor/Frontend/stores/data-handler-store'
    );
    const slot = editor.shadowRoot.querySelector('.slot');

    return {
      text: slot.innerText,
      value: editor.value,
      storedValue: dataHandlerStore.data.tt_content?.[90140]?.header,
      invalid: editor.invalid,
      invalidField: dataHandlerStore.invalidFields.tt_content?.[90140]?.header,
      invalidCount: dataHandlerStore.invalidCount,
      focused: slot.matches(':focus'),
    };
  });
}

async function createEditor(page) {
  await page.evaluate(async () => {
    const {dataHandlerStore} = await import(
      '@typo3/visual-editor/Frontend/stores/data-handler-store'
    );
    dataHandlerStore.reset();
    window.TYPO3.lang['validation.min'] = 'Minimum %d characters';

    const parent = document.createElement('div');
    parent.id = 'min-validation-fixture';
    parent.style.textTransform = 'none';
    parent.style.whiteSpace = 'pre-wrap';

    const editor = document.createElement('ve-editable-text');
    editor.id = 'min-validation-editor';

    for (const [name, value] of Object.entries({
      value: 'abc',
      table: 'tt_content',
      uid: '90140',
      field: 'header',
    })) {
      editor.setAttribute(name, value);
    }

    parent.append(editor);
    document.body.append(parent);
    await editor.updateComplete;

    editor.validation = {min: 3};
    // Keep the normalized empty field available for the refocus check.
    editor.showEmpty = true;
    await editor.updateComplete;
  });

  const slot = page.locator('#min-validation-editor').locator('.slot');
  await slot.focus();
  await readState(page);
  await slot.press('End');
  await slot.press('Backspace');
  return slot;
}

function assertInvalidInput(state, text) {
  assert.equal(state.focused, true);
  assert.equal(state.text, text);
  assert.equal(state.value, '');
  assert.equal(state.storedValue, '');
  assert.equal(state.invalid, true, `The visible input "${text}" must remain invalid after Lit settles`);
  assert.equal(state.invalidField, true);
  assert.equal(state.invalidCount, 1);
}

function assertValidEmpty(state, focused) {
  assert.deepEqual(state, {
    text: '',
    value: '',
    storedValue: '',
    invalid: false,
    invalidField: undefined,
    invalidCount: 0,
    focused,
  }, 'The normalized optional empty value must agree with DOM and validation');
}

export async function runMinimumLengthTests(page) {
  const results = [];

  async function test(name, run) {
    try {
      const slot = await createEditor(page);
      await run(slot);
      results.push(`PASS ${name}`);
    } catch (error) {
      results.push(`FAIL ${name}: ${error.message}`);
    } finally {
      await page.evaluate(async () => {
        document.getElementById('min-validation-fixture')?.remove();
        const {dataHandlerStore} = await import(
          '@typo3/visual-editor/Frontend/stores/data-handler-store'
        );
        dataHandlerStore.reset();
      });
    }
  }

  await test('keyboard deletion preserves raw minimum-length errors after Lit settles', async slot => {
    assertInvalidInput(await readState(page), 'ab');

    // Correcting the visible input also removes the pending store change.
    await slot.press('c');
    assert.deepEqual(await readState(page), {
      text: 'abc',
      value: 'abc',
      storedValue: undefined,
      invalid: false,
      invalidField: undefined,
      invalidCount: 0,
      focused: true,
    });
  });

  await test('further keyboard deletion validates input with an unchanged canonical value', async slot => {
    await readState(page);
    await slot.press('Backspace');
    assertInvalidInput(await readState(page), 'a');
  });

  await test('blur and refocus keep the normalized optional empty value valid', async slot => {
    await readState(page);
    await page.locator('#outside').focus();
    assertValidEmpty(await readState(page), false);

    await slot.focus();
    assertValidEmpty(await readState(page), true);
  });

  await test('changed validation rules revalidate the visible focused input', async () => {
    await readState(page);
    await page.evaluate(async () => {
      const editor = document.getElementById('min-validation-editor');
      editor.validation = {min: 1};
      await editor.updateComplete;
    });

    assert.deepEqual(await readState(page), {
      text: 'ab',
      value: 'ab',
      storedValue: 'ab',
      invalid: false,
      invalidField: undefined,
      invalidCount: 0,
      focused: true,
    });
  });

  return results;
}

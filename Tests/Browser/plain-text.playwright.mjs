import assert from 'node:assert/strict';

export async function runPlainTextTests(page) {
  const results = [];
  const editor = page.locator('#plain-text-editor');
  const slot = editor.locator('.slot');

  const frames = () => page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const settle = () => editor.evaluate(element => element.updateComplete);

  async function focus() {
    await slot.focus();
    await frames();
    await settle();
  }

  async function blur() {
    await page.locator('#outside').focus();
    await settle();
  }

  async function append(text) {
    await slot.press('End');
    await slot.pressSequentially(text);
  }

  async function assertState(expected) {
    const actual = await editor.evaluate(async (element) => {
      await element.updateComplete;
      // Use the production URL so every assertion sees the component's store.
      const {dataHandlerStore} = await import(
        '@typo3/visual-editor/Frontend/stores/data-handler-store',
      );
      const slot = element.shadowRoot.querySelector('.slot');

      return {
        text: slot.innerText,
        rawText: slot.textContent,
        value: element.value,
        valueInitial: element.valueInitial,
        storedValue: dataHandlerStore.data.tt_content?.[1]?.header,
        invalid: element.invalid,
        editing: slot.classList.contains('editing'),
        transform: getComputedStyle(slot).textTransform,
        focused: slot.matches(':focus'),
        editorFocused: element.matches(':focus-within'),
        activeElementId: document.activeElement.id,
      };
    });

    for (const [key, value] of Object.entries(expected)) {
      assert.equal(actual[key], value, key);
    }
  }

  async function test(name, options, run) {
    try {
      await page.evaluate(async (options) => {
        const {dataHandlerStore} = await import(
          '@typo3/visual-editor/Frontend/stores/data-handler-store',
        );
        dataHandlerStore.reset();

        const parent = document.createElement('div');
        parent.id = 'plain-text-fixture';
        parent.style.textTransform = options.transform || 'uppercase';
        parent.style.whiteSpace = 'pre-wrap';
        if (options.inline) {
          parent.append('Prefix ');
        }

        const editor = document.createElement('ve-editable-text');
        editor.id = 'plain-text-editor';
        for (const [name, value] of Object.entries({
          value: options.value || 'MiXeD Straße text',
          table: 'tt_content',
          uid: '1',
          field: 'header',
        })) {
          editor.setAttribute(name, value);
        }
        parent.append(editor);
        document.body.append(parent);
        await editor.updateComplete;

        editor.validation = options.validation || {};
        editor.allowNewlines = true;
        await editor.updateComplete;
      }, options);

      await run();
      results.push(`PASS ${name}`);
    } catch (error) {
      results.push(`FAIL ${name}: ${error.message}`);
    } finally {
      await page.evaluate(() => {
        document.getElementById('plain-text-fixture')?.remove();
        window.getSelection().removeAllRanges();
      });
    }
  }

  // Inherited frontend casing must never become the stored editor value.
  for (const transform of ['uppercase', 'lowercase', 'capitalize']) {
    await test(`shows raw text while editing and stores it on blur under ${transform}`, {transform}, async () => {
      assert.notEqual(await slot.innerText(), 'MiXeD Straße text');
      await focus();
      await assertState({text: 'MiXeD Straße text', transform: 'none'});

      await append('x');
      await blur();
      await assertState({storedValue: 'MiXeD Straße textx', editing: false, transform});

      await editor.evaluate(element => element.onReset());
      await assertState({rawText: 'MiXeD Straße text', storedValue: undefined});
    });
  }

  await test('applies editing styles to inline editors', {inline: true, value: 'Straße'}, async () => {
    assert.equal(await slot.evaluate(element => element.classList.contains('block')), false);
    await focus();
    await assertState({text: 'Straße'});

    await append('x');
    await blur();
    await assertState({storedValue: 'Straßex'});
  });

  // Cover both unchanged and changed canonical values for each normalizer.
  for (const [evalName, initial, entered, normalized] of [
    ['trim', 'foo', 'foo ', 'foo'],
    ['trim', 'foo', ' bar ', 'bar'],

    ['upper', 'FOO', 'fOo', 'FOO'],
    ['upper', 'BASE', 'miXed', 'MIXED'],

    ['lower', 'foo', 'FOO', 'foo'],
    ['lower', 'base', 'MiXeD', 'mixed'],
  ]) {
    await test(`${evalName} keeps the canonical value after edit, blur and refocus: ${JSON.stringify(entered)}`, {
      value: initial,
      transform: 'none',
      validation: {eval: [evalName]},
    }, async () => {
      await focus();

      if (evalName === 'trim') {
        await slot.fill(entered);
      } else {
        // Deletion tests full-value normalization without beforeinput filtering
        // each inserted character. Seed raw text, then delete the extra marker.
        await slot.evaluate((element, text) => {
          element.innerText = text + 'x';
        }, entered);
        await slot.press('End');
        await slot.press('Backspace');
      }
      await assertState({
        text: entered,
        value: normalized,
        storedValue: normalized === initial ? undefined : normalized,
      });

      await blur();
      await assertState({text: normalized, value: normalized});
      await focus();
      await assertState({text: normalized, value: normalized});
    });
  }

  // Both calls must stay in the same synchronous browser evaluation.
  await test('immediate focus and blur preserves casing before a Lit render', {value: 'Straße'}, async () => {
    await slot.evaluate((element) => {
      element.focus();
      element.blur();
    });
    await assertState({value: 'Straße', storedValue: undefined, editing: false});
    await frames();
  });

  await test('pending focus callback does not pull focus back after blur', {value: 'Straße'}, async () => {
    await slot.evaluate((element) => {
      element.focus();
      document.getElementById('outside').focus();
    });
    await frames();
    await assertState({activeElementId: 'outside', value: 'Straße', storedValue: undefined});
  });

  await test('pending focus callback does not steal focus from editor buttons', {value: 'Straße'}, async () => {
    const keptButtonFocus = await editor.evaluate(async (element) => {
      const button = document.createElement('button');
      element.shadowRoot.append(button);

      element.shadowRoot.querySelector('.slot').focus();
      button.focus();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const focused = element.shadowRoot.activeElement === button;
      button.remove();
      return focused;
    });
    assert.equal(keptButtonFocus, true);
    await assertState({storedValue: undefined});
  });

  await test('Lit updates retain the synchronous editing class', {}, async () => {
    await focus();
    await editor.evaluate((element) => {
      element.hovered = true;
    });
    await assertState({editing: true, transform: 'none'});
    await blur();
    await assertState({editing: false});
  });

  await test('max length counts original ß rather than rendered SS', {value: 'Straße', validation: {max: 7}}, async () => {
    await focus();
    const length = await slot.evaluate(async (element) => {
      const {getEditValue} = await import(
        '@typo3/visual-editor/Frontend/components/ve-editable-text/editing',
      );
      return getEditValue(element, {inputType: 'insertText', data: 'x'}).currentValue.length;
    });
    assert.equal(length, 6);

    await append('x');
    await blur();
    await assertState({storedValue: 'Straßex', invalid: false});
  });

  for (const html of ['First<br>Second', 'First<div>Second</div><div><br></div>', '<p>First</p><p>Second</p>', 'First\n\nSecond\n', '  First  <br> Second\u00a0']) {
    await test(`stores rendered line breaks and whitespace: ${JSON.stringify(html)}`, {}, async () => {
      await focus();
      const expected = await slot.evaluate((element, html) => {
        // Structural fixtures exercise real rendered text, including <br> and blocks.
        element.innerHTML = html;
        return element.innerText.replace(/\n$/, '');
      }, html);

      await blur();
      await assertState({storedValue: expected});
    });
  }

  await test('preserves soft hyphens, non-breaking spaces and literal entity text', {value: 'Straße\u00ad Foo\u00a0 &shy; &nbsp; &amp;'}, async () => {
    const original = await editor.evaluate(element => element.value);
    await focus();
    await blur();
    await assertState({value: original, storedValue: undefined});
  });

  await test('unfocused store validation updates preserve unchanged text nodes', {}, async () => {
    const sameNode = await slot.evaluate(async (element) => {
      const text = element.firstChild;
      const {dataHandlerStore} = await import(
        '@typo3/visual-editor/Frontend/stores/data-handler-store',
      );
      dataHandlerStore.setInvalid('tt_content', 1, 'header', true);
      await element.getRootNode().host.updateComplete;
      return element.firstChild === text;
    });
    assert.equal(sameNode, true);
    await assertState({value: 'MiXeD Straße text'});
  });

  await test('external store updates and save synchronization preserve raw casing', {}, async () => {
    await page.evaluate(async () => {
      const {dataHandlerStore} = await import(
        '@typo3/visual-editor/Frontend/stores/data-handler-store',
      );
      dataHandlerStore.setData('tt_content', 1, 'header', 'NeW Straße');
    });
    await assertState({value: 'NeW Straße', rawText: 'NeW Straße'});

    const sameNode = await slot.evaluate(async (element) => {
      const text = element.firstChild;
      const {dataHandlerStore} = await import(
        '@typo3/visual-editor/Frontend/stores/data-handler-store',
      );
      dataHandlerStore.markSaved();
      await element.getRootNode().host.updateComplete;
      return element.firstChild === text;
    });
    assert.equal(sameNode, true);
    await assertState({valueInitial: 'NeW Straße', storedValue: undefined});
  });

  // A CSS-transformed display can match an update while the raw DOM still differs.
  for (const [initial, transform, updated] of [
    ['foo', 'uppercase', 'FOO'],
    ['FOO', 'lowercase', 'foo'],
    ['Straße', 'uppercase', 'STRASSE'],
  ]) {
    const options = {value: initial, transform};
    const updateStore = () => page.evaluate(async (value) => {
      const {dataHandlerStore} = await import(
        '@typo3/visual-editor/Frontend/stores/data-handler-store',
      );
      dataHandlerStore.setData('tt_content', 1, 'header', value);
    }, updated);

    await test(`external store updates synchronize raw DOM under ${transform}: ${JSON.stringify(initial)}`, options, async () => {
      await assertState({rawText: initial, text: updated});
      await updateStore();
      await assertState({value: updated, storedValue: updated, rawText: updated});
    });

    await test(`immediate focus and blur preserve external store updates under ${transform}: ${JSON.stringify(initial)}`, options, async () => {
      await updateStore();
      await assertState({value: updated, storedValue: updated, rawText: updated});

      // Preserve the race: no await or frame may occur between focus and blur.
      await slot.evaluate((element) => {
        element.focus();
        element.blur();
      });
      await assertState({value: updated, storedValue: updated, rawText: updated});

      await frames();
      await assertState({
        value: updated,
        storedValue: updated,
        rawText: updated,
        editorFocused: false,
        focused: false,
      });
    });
  }

  await test('unfocused value property changes synchronize the displayed text', {value: 'foo', transform: 'none'}, async () => {
    await editor.evaluate((element) => {
      element.value = 'bar';
    });
    await assertState({value: 'bar', storedValue: 'bar', text: 'bar'});
  });

  await test('unfocused validation updates preserve unchanged raw text nodes under uppercase', {value: 'foo'}, async () => {
    const sameNode = await slot.evaluate(async (element) => {
      const text = element.firstChild;
      const editor = element.getRootNode().host;
      editor.validation = {eval: ['trim']};
      await editor.updateComplete;
      return element.firstChild === text;
    });
    assert.equal(sameNode, true);
    await assertState({value: 'foo', storedValue: undefined, rawText: 'foo', editing: false, transform: 'uppercase'});
  });

  await test('unfocused validation updates preserve unchanged rendered line breaks and nodes', {value: 'FIRST\nSECOND'}, async () => {
    const preserved = await slot.evaluate(async (element) => {
      element.innerHTML = '<div>FIRST<br>SECOND</div>';
      const block = element.firstChild;
      const nodes = [...block.childNodes];
      const rendered = element.innerText;

      const editor = element.getRootNode().host;
      editor.validation = {eval: ['trim']};
      await editor.updateComplete;

      return {
        rendered,
        block: element.firstChild === block,
        nodes: nodes.every((node, index) => block.childNodes[index] === node),
      };
    });
    assert.deepEqual(preserved, {rendered: 'FIRST\nSECOND', block: true, nodes: true});
    await assertState({value: 'FIRST\nSECOND', storedValue: undefined, text: 'FIRST\nSECOND', editing: false, transform: 'uppercase'});
  });

  await test('unfocused validation changes synchronize normalized display', {value: 'foo', transform: 'none'}, async () => {
    await editor.evaluate((element) => {
      element.validation = {eval: ['upper']};
    });
    await assertState({value: 'FOO', storedValue: 'FOO', text: 'FOO'});
  });

  await test('unfocused external store updates preserve significant whitespace', {value: 'foo', transform: 'none'}, async () => {
    await page.evaluate(async () => {
      const {dataHandlerStore} = await import(
        '@typo3/visual-editor/Frontend/stores/data-handler-store',
      );
      dataHandlerStore.setData('tt_content', 1, 'header', 'foo ');
    });
    await assertState({value: 'foo ', text: 'foo '});
    await focus();
    await assertState({text: 'foo '});
  });

  await test('store notifications preserve raw input while focused', {value: 'foo', transform: 'none', validation: {eval: ['trim']}}, async () => {
    await focus();
    await append(' ');
    await settle();

    await page.evaluate(async () => {
      const {dataHandlerStore} = await import(
        '@typo3/visual-editor/Frontend/stores/data-handler-store',
      );
      dataHandlerStore.setInvalid('tt_content', 1, 'header', true);
    });
    await assertState({value: 'foo', text: 'foo '});

    await blur();
    await focus();
    await assertState({text: 'foo', storedValue: undefined});
  });

  // DOM references stay inside evaluate; Node receives only observable results.
  await test('editing reads do not mutate root or descendant style attributes', {}, async () => {
    await focus();
    const state = await slot.evaluate(async (element) => {
      const {getEditValue} = await import(
        '@typo3/visual-editor/Frontend/components/ve-editable-text/editing',
      );
      element.innerHTML = 'MiXeD<br><span style="color:blue">Text</span>';
      const before = element.outerHTML;
      const observer = new MutationObserver(() => {});
      observer.observe(element, {attributes: true, attributeFilter: ['style'], subtree: true});

      const value = getEditValue(element, {inputType: 'insertText', data: 'x'}).currentValue;
      const unchanged = element.outerHTML === before;
      const mutations = observer.takeRecords().length;
      observer.disconnect();
      return {value, unchanged, mutations};
    });
    assert.deepEqual(state, {value: 'MiXeD\nText', unchanged: true, mutations: 0});
  });

  await test('selection fallback and insertion use untransformed text', {value: 'Straße'}, async () => {
    await focus();
    const state = await slot.evaluate(async (element) => {
      const {getSelectionOffsets, insertTextAtSelection} = await import(
        '@typo3/visual-editor/Frontend/components/ve-editable-text/editing',
      );
      element.getRootNode().getSelection().removeAllRanges();
      const emptySelectionOffset = getSelectionOffsets(element).start;
      insertTextAtSelection(element, 'x');
      const firstText = element.textContent;

      const outside = document.createRange();
      outside.selectNodeContents(document.querySelector('h1'));
      window.getSelection().addRange(outside);
      const outsideSelectionOffset = getSelectionOffsets(element).start;
      insertTextAtSelection(element, 'y');

      return {emptySelectionOffset, firstText, outsideSelectionOffset, text: element.textContent};
    });
    assert.deepEqual(state, {
      emptySelectionOffset: 6,
      firstText: 'Straßex',
      outsideSelectionOffset: 7,
      text: 'Straßexy',
    });
  });

  await test('selection reads preserve a real shadow-root range and text node', {value: 'Straße'}, async () => {
    await focus();
    const state = await slot.evaluate(async (element) => {
      const {getEditValue} = await import(
        '@typo3/visual-editor/Frontend/components/ve-editable-text/editing',
      );
      const text = element.firstChild;
      const range = document.createRange();
      range.setStart(text, 4);
      range.setEnd(text, 5);

      const selection = element.getRootNode().getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const value = getEditValue(element, {inputType: 'insertText', data: 'x'}).currentValue;

      return {
        value,
        sameNode: element.firstChild === text,
        sameAnchor: selection.anchorNode === text,
        anchorOffset: selection.anchorOffset,
        sameFocus: selection.focusNode === text,
        focusOffset: selection.focusOffset,
      };
    });
    assert.deepEqual(state, {
      value: 'Straße',
      sameNode: true,
      sameAnchor: true,
      anchorOffset: 4,
      sameFocus: true,
      focusOffset: 5,
    });
  });

  return results;
}

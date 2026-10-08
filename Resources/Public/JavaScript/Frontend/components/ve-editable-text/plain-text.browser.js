import '@typo3/visual-editor/Frontend/components/ve-editable-text';
import {dataHandlerStore} from '@typo3/visual-editor/Frontend/stores/data-handler-store';
import {getEditValue, getSelectionOffsets, insertTextAtSelection} from '@typo3/visual-editor/Frontend/components/ve-editable-text/editing';

export async function runTests() {
  const results = [];

  const equal = (actual, expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  };

  // Wait for deferred focus handling and the following Lit render.
  const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const storedValue = () => dataHandlerStore.data.tt_content?.[1]?.header;

  const test = async (name, options, run) => {
    dataHandlerStore.reset();

    const parent = document.createElement('div');
    parent.style.textTransform = options.transform || 'uppercase';
    parent.style.whiteSpace = 'pre-wrap';
    if (options.inline) {
      parent.append('Prefix ');
    }

    const editor = document.createElement('ve-editable-text');
    for (const [name, value] of Object.entries({value: options.value || 'MiXeD Straße text', table: 'tt_content', uid: '1', field: 'header'})) {
      editor.setAttribute(name, value);
    }
    parent.append(editor);
    document.body.append(parent);

    try {
      await editor.updateComplete;
      editor.validation = options.validation || {};
      editor.allowNewlines = true;
      await editor.updateComplete;

      const slot = editor.shadowRoot.querySelector('.slot');
      await run(slot, editor);

      results.push(`PASS ${name}`);
    } catch (error) {
      results.push(`FAIL ${name}: ${error.message}`);
    } finally {
      parent.remove();
      window.getSelection().removeAllRanges();
    }
  };

  const focus = async (slot) => {
    slot.focus();
    await frames();
  };

  const append = (slot, text) => {
    const range = document.createRange();
    range.selectNodeContents(slot);
    range.collapse(false);

    const selection = slot.getRootNode().getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    if (!document.execCommand('insertText', false, text)) {
      throw new Error('Browser insertion failed');
    }
  };

  // Inherited frontend casing must never become the stored editor value.
  for (const transform of ['uppercase', 'lowercase', 'capitalize']) {
    await test(`shows raw text while editing and stores it on blur under ${transform}`, {transform}, async (slot, editor) => {
      const rendered = slot.innerText;
      equal(rendered === editor.value, false);

      await focus(slot);

      equal(slot.innerText, 'MiXeD Straße text');
      equal(getComputedStyle(slot).textTransform, 'none');

      append(slot, 'x');
      slot.blur();
      await editor.updateComplete;

      equal(storedValue(), 'MiXeD Straße textx');
      equal(slot.classList.contains('editing'), false);
      equal(getComputedStyle(slot).textTransform, transform);

      editor.onReset();
      await editor.updateComplete;

      equal(slot.textContent, 'MiXeD Straße text');
      equal(storedValue(), undefined);
    });
  }

  await test('applies editing styles to inline editors', {inline: true, value: 'Straße'}, async (slot, editor) => {
    equal(slot.classList.contains('block'), false);

    await focus(slot);

    equal(slot.innerText, 'Straße');

    append(slot, 'x');
    slot.blur();
    await editor.updateComplete;

    equal(storedValue(), 'Straßex');
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
    }, async (slot, editor) => {
      await focus(slot);

      const range = document.createRange();
      range.selectNodeContents(slot);

      const selection = slot.getRootNode().getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      if (!document.execCommand('insertText', false, entered)) {
        throw new Error('Browser replacement failed');
      }
      await editor.updateComplete;

      // Keep raw input visible while focused, even though the model is normalized.
      equal(slot.innerText, entered);
      equal(editor.value, normalized);
      // An unchanged canonical value produces no pending store change.
      equal(storedValue(), normalized === initial ? undefined : normalized);

      slot.blur();
      await editor.updateComplete;

      equal(slot.innerText, normalized);
      equal(editor.value, normalized);

      await focus(slot);

      equal(slot.innerText, normalized);
      equal(editor.value, normalized);
    });
  }

  // Exercise blur before deferred focus work or Lit rendering can complete.
  await test('immediate focus and blur preserves casing before a Lit render', {value: 'Straße'}, async (slot, editor) => {
    slot.focus();
    slot.blur();
    await editor.updateComplete;

    equal(editor.value, 'Straße');
    equal(storedValue(), undefined);
    equal(slot.classList.contains('editing'), false);

    await frames();
  });

  await test('pending focus callback does not pull focus back after blur', {value: 'Straße'}, async (slot, editor) => {
    slot.focus();
    document.querySelector('#outside').focus();
    await frames();

    equal(document.activeElement.id, 'outside');
    equal(editor.value, 'Straße');
    equal(storedValue(), undefined);
  });

  await test('pending focus callback does not steal focus from editor buttons', {value: 'Straße'}, async (slot, editor) => {
    const button = document.createElement('button');
    editor.shadowRoot.append(button);

    slot.focus();
    button.focus();
    await frames();

    equal(editor.shadowRoot.activeElement, button);
    equal(storedValue(), undefined);

    button.remove();
  });

  await test('Lit updates retain the synchronous editing class', {}, async (slot, editor) => {
    await focus(slot);
    editor.hovered = true;
    await editor.updateComplete;

    equal(slot.classList.contains('editing'), true);
    equal(getComputedStyle(slot).textTransform, 'none');

    slot.blur();

    equal(slot.classList.contains('editing'), false);
  });

  await test('max length counts original ß rather than rendered SS', {value: 'Straße', validation: {max: 7}}, async (slot, editor) => {
    await focus(slot);

    equal(getEditValue(slot, {inputType: 'insertText', data: 'x'}).currentValue.length, 6);

    append(slot, 'x');
    slot.blur();
    await editor.updateComplete;

    equal(storedValue(), 'Straßex');
    equal(editor.invalid, false);
  });

  for (const html of ['First<br>Second', 'First<div>Second</div><div><br></div>', '<p>First</p><p>Second</p>', 'First\n\nSecond\n', '  First  <br> Second\u00a0']) {
    await test(`stores rendered line breaks and whitespace: ${JSON.stringify(html)}`, {}, async (slot, editor) => {
      await focus(slot);
      slot.innerHTML = html;
      const expected = slot.innerText.replace(/\n$/, '');

      slot.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText'}));
      slot.blur();
      await editor.updateComplete;

      equal(storedValue(), expected);
    });
  }

  await test('preserves soft hyphens, non-breaking spaces and literal entity text', {value: 'Straße\u00ad Foo\u00a0 &shy; &nbsp; &amp;'}, async (slot, editor) => {
    const original = editor.value;

    await focus(slot);
    slot.blur();
    await editor.updateComplete;

    equal(editor.value, original);
    equal(storedValue(), undefined);
  });

  await test('unfocused store validation updates preserve unchanged text nodes', {}, async (slot, editor) => {
    const text = slot.firstChild;

    dataHandlerStore.setInvalid('tt_content', 1, 'header', true);
    await editor.updateComplete;

    equal(slot.firstChild, text);
    equal(editor.value, 'MiXeD Straße text');
  });

  await test('external store updates and save synchronization preserve raw casing', {}, async (slot, editor) => {
    dataHandlerStore.setData('tt_content', 1, 'header', 'NeW Straße');
    await editor.updateComplete;

    equal(editor.value, 'NeW Straße');
    equal(slot.textContent, 'NeW Straße');

    const text = slot.firstChild;
    dataHandlerStore.markSaved();
    await editor.updateComplete;

    equal(slot.firstChild, text);
    equal(editor.valueInitial, 'NeW Straße');
    equal(storedValue(), undefined);
  });

  // The rendered casing can already match an external update while the raw DOM differs.
  for (const [initial, transform, updated] of [
    ['foo', 'uppercase', 'FOO'],
    ['FOO', 'lowercase', 'foo'],
    ['Straße', 'uppercase', 'STRASSE'],
  ]) {
    await test(`external store updates synchronize raw DOM under ${transform}: ${JSON.stringify(initial)}`, {
      value: initial,
      transform,
    }, async (slot, editor) => {
      equal(slot.textContent, initial);
      equal(slot.innerText, updated);

      dataHandlerStore.setData('tt_content', 1, 'header', updated);
      await editor.updateComplete;

      equal(editor.value, updated);
      equal(storedValue(), updated);
      equal(slot.textContent, updated);
    });

    await test(`immediate focus and blur preserve external store updates under ${transform}: ${JSON.stringify(initial)}`, {
      value: initial,
      transform,
    }, async (slot, editor) => {
      dataHandlerStore.setData('tt_content', 1, 'header', updated);
      await editor.updateComplete;

      equal(editor.value, updated);
      equal(storedValue(), updated);

      // Blur synchronously before the deferred focus callback can synchronize the DOM.
      slot.focus();
      slot.blur();
      await editor.updateComplete;

      equal(editor.value, updated);
      equal(storedValue(), updated);
      equal(slot.textContent, updated);

      await frames();
      await editor.updateComplete;

      equal(editor.value, updated);
      equal(storedValue(), updated);
      equal(slot.textContent, updated);
      equal(editor.matches(':focus-within'), false);
      equal(slot.matches(':focus'), false);
    });
  }

  await test('unfocused value property changes synchronize the displayed text', {value: 'foo', transform: 'none'}, async (slot, editor) => {
    editor.value = 'bar';
    await editor.updateComplete;

    equal(editor.value, 'bar');
    equal(storedValue(), 'bar');
    equal(slot.innerText, 'bar');
  });

  await test('unfocused validation updates preserve unchanged raw text nodes under uppercase', {value: 'foo'}, async (slot, editor) => {
    const text = slot.firstChild;

    editor.validation = {eval: ['trim']};
    await editor.updateComplete;

    equal(editor.value, 'foo');
    equal(storedValue(), undefined);
    equal(slot.textContent, 'foo');
    equal(slot.firstChild, text);
    equal(slot.classList.contains('editing'), false);
    equal(getComputedStyle(slot).textTransform, 'uppercase');
  });

  await test('unfocused validation updates preserve unchanged rendered line breaks and nodes', {value: 'FIRST\nSECOND'}, async (slot, editor) => {
    slot.innerHTML = '<div>FIRST<br>SECOND</div>';
    const block = slot.firstChild;
    const first = block.firstChild;
    const second = block.lastChild;
    const lineBreak = block.childNodes[1];

    equal(slot.innerText, 'FIRST\nSECOND');

    editor.validation = {eval: ['trim']};
    await editor.updateComplete;

    equal(editor.value, 'FIRST\nSECOND');
    equal(storedValue(), undefined);
    equal(slot.innerText, 'FIRST\nSECOND');
    equal(slot.firstChild, block);
    equal(block.firstChild, first);
    equal(block.lastChild, second);
    equal(block.childNodes[1], lineBreak);
    equal(slot.classList.contains('editing'), false);
    equal(getComputedStyle(slot).textTransform, 'uppercase');
  });

  await test('unfocused validation changes synchronize normalized display', {value: 'foo', transform: 'none'}, async (slot, editor) => {
    editor.validation = {eval: ['upper']};
    await editor.updateComplete;

    equal(editor.value, 'FOO');
    equal(storedValue(), 'FOO');
    equal(slot.innerText, 'FOO');
  });

  await test('unfocused external store updates preserve significant whitespace', {value: 'foo', transform: 'none'}, async (slot, editor) => {
    dataHandlerStore.setData('tt_content', 1, 'header', 'foo ');
    await editor.updateComplete;

    equal(editor.value, 'foo ');
    equal(slot.innerText, 'foo ');

    await focus(slot);

    equal(slot.innerText, 'foo ');
  });

  await test('store notifications preserve raw input while focused', {value: 'foo', transform: 'none', validation: {eval: ['trim']}}, async (slot, editor) => {
    await focus(slot);
    append(slot, ' ');
    await editor.updateComplete;

    dataHandlerStore.setInvalid('tt_content', 1, 'header', true);
    await editor.updateComplete;

    equal(editor.value, 'foo');
    equal(slot.innerText, 'foo ');

    slot.blur();
    await editor.updateComplete;
    await focus(slot);

    equal(slot.innerText, 'foo');
    equal(storedValue(), undefined);
  });

  // Reading raw text must preserve live styles, text nodes, and shadow selections.
  await test('editing reads do not mutate root or descendant style attributes', {}, async (slot) => {
    await focus(slot);
    slot.innerHTML = 'MiXeD<br><span style="color:blue">Text</span>';
    const before = slot.outerHTML;

    const observer = new MutationObserver(() => {});
    observer.observe(slot, {attributes: true, attributeFilter: ['style'], subtree: true});

    equal(getEditValue(slot, {inputType: 'insertText', data: 'x'}).currentValue, 'MiXeD\nText');
    equal(slot.outerHTML, before);
    equal(observer.takeRecords().length, 0);

    observer.disconnect();
  });

  await test('selection fallback and insertion use untransformed text', {value: 'Straße'}, async (slot) => {
    await focus(slot);
    slot.getRootNode().getSelection().removeAllRanges();

    equal(getSelectionOffsets(slot).start, 6);

    insertTextAtSelection(slot, 'x');

    equal(slot.textContent, 'Straßex');

    const outside = document.createRange();
    outside.selectNodeContents(document.querySelector('h1'));
    window.getSelection().addRange(outside);

    equal(getSelectionOffsets(slot).start, 7);

    insertTextAtSelection(slot, 'y');

    equal(slot.textContent, 'Straßexy');
  });

  await test('selection reads preserve a real shadow-root range and text node', {value: 'Straße'}, async (slot) => {
    await focus(slot);

    const text = slot.firstChild;
    const range = document.createRange();
    range.setStart(text, 4);
    range.setEnd(text, 5);

    const selection = slot.getRootNode().getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    equal(getEditValue(slot, {inputType: 'insertText', data: 'x'}).currentValue, 'Straße');
    equal(slot.firstChild, text);
    equal(selection.anchorNode, text);
    equal(selection.anchorOffset, 4);
    equal(selection.focusNode, text);
    equal(selection.focusOffset, 5);
  });

  return results;
}

import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {removeRuleBySelector} from './remove-rule-by-selector.js';

const originalCSSStyleRule = globalThis.CSSStyleRule;

afterEach(() => {
  globalThis.CSSStyleRule = originalCSSStyleRule;
});

class FakeCSSStyleRule {
  constructor(selectorText, cssText = 'color: red;') {
    this.selectorText = selectorText;
    this.style = {cssText};
  }
}

function createSheet(rules) {
  return {
    cssRules: [...rules],
    deleteRule(index) {
      this.cssRules.splice(index, 1);
    },
    insertRule(rule, index) {
      this.cssRules.splice(index, 0, rule);
    },
  };
}

test('removeRuleBySelector removes a full matching rule', () => {
  globalThis.CSSStyleRule = FakeCSSStyleRule;

  const sheet = createSheet([
    new FakeCSSStyleRule('.match'),
    new FakeCSSStyleRule('.keep'),
  ]);
  const root = {styleSheets: [sheet]};

  const removed = removeRuleBySelector('.match', root);

  assert.equal(removed, 1);
  assert.equal(sheet.cssRules.length, 1);
  assert.equal(sheet.cssRules[0].selectorText, '.keep');
});

test('removeRuleBySelector rewrites grouped rules and preserves declarations', () => {
  globalThis.CSSStyleRule = FakeCSSStyleRule;

  const sheet = createSheet([
    new FakeCSSStyleRule('.match, .keep', 'display: block;'),
  ]);
  const root = {styleSheets: [sheet]};

  const removed = removeRuleBySelector('.match', root);

  assert.equal(removed, 1);
  assert.deepEqual(sheet.cssRules, ['.keep { display: block; }']);
});

test('removeRuleBySelector recurses into grouping rules', () => {
  globalThis.CSSStyleRule = FakeCSSStyleRule;

  const nestedGroup = createSheet([
    new FakeCSSStyleRule('.match'),
    new FakeCSSStyleRule('.other'),
  ]);
  const sheet = createSheet([nestedGroup]);
  const root = {styleSheets: [sheet]};

  const removed = removeRuleBySelector('.match', root);

  assert.equal(removed, 1);
  assert.equal(nestedGroup.cssRules.length, 1);
  assert.equal(nestedGroup.cssRules[0].selectorText, '.other');
});

test('removeRuleBySelector skips unreadable stylesheets', () => {
  globalThis.CSSStyleRule = FakeCSSStyleRule;

  const root = {
    styleSheets: [
      {
        get cssRules() {
          throw new Error('SecurityError');
        },
      },
      createSheet([new FakeCSSStyleRule('.match')]),
    ],
  };

  const removed = removeRuleBySelector('.match', root);

  assert.equal(removed, 1);
});

import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {flipInsertBefore} from './flip-insert-before.js';

const originalWindow = globalThis.window;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
});

function createAnimatedNode(name, rects) {
  let index = 0;
  const node = {
    name,
    style: {},
    isConnected: false,
    listeners: {},
    getBoundingClientRect() {
      const rect = rects[Math.min(index, rects.length - 1)];
      index++;
      return rect;
    },
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    },
    removeEventListener(type, callback) {
      if (this.listeners[type] === callback) {
        delete this.listeners[type];
      }
    },
  };

  return node;
}

function createParent(children = []) {
  const parent = {
    children,
    insertCalls: [],
    insertBefore(node, child) {
      this.insertCalls.push([node, child]);
      const currentIndex = this.children.indexOf(node);
      if (currentIndex !== -1) {
        this.children.splice(currentIndex, 1);
      }

      const insertIndex = child === null ? this.children.length : this.children.indexOf(child);
      if (insertIndex === -1) {
        this.children.push(node);
      } else {
        this.children.splice(insertIndex, 0, node);
      }

      node.parentNode = this;
      return node;
    },
    getBoundingClientRect() {
      return {left: 0, top: 0, width: 100, height: 20};
    },
  };

  for (const child of children) {
    child.parentNode = parent;
  }

  return parent;
}

test('flipInsertBefore throws when parent is missing', () => {
  assert.throws(() => flipInsertBefore(null, {}), /requires at least parent and node/);
});

test('flipInsertBefore uses the reduced-motion fast path', () => {
  globalThis.window = {
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return {matches: true};
    },
  };

  const node = {};
  const child = {};
  const parent = createParent();

  const result = flipInsertBefore(parent, node, child);

  assert.equal(result, node);
  assert.deepEqual(parent.insertCalls, [[node, child]]);
});

test('flipInsertBefore appends when the child does not belong to the parent', () => {
  globalThis.window = {
    matchMedia() {
      return {matches: false};
    },
  };

  const sibling = createAnimatedNode('sibling', [
    {left: 0, top: 0, width: 0, height: 0},
  ]);
  const node = createAnimatedNode('node', [
    {left: 0, top: 0, width: 0, height: 0},
  ]);
  const foreignChild = {parentNode: {}};
  const parent = createParent([sibling]);

  const result = flipInsertBefore(parent, node, foreignChild);

  assert.equal(result, node);
  assert.deepEqual(parent.children, [sibling, node]);
  assert.deepEqual(parent.insertCalls, [[node, null]]);
});

test('flipInsertBefore returns without scheduling animation when nothing moved', () => {
  globalThis.window = {
    matchMedia() {
      return {matches: false};
    },
  };
  globalThis.requestAnimationFrame = () => {
    throw new Error('animation should not be scheduled');
  };

  const first = createAnimatedNode('first', [
    {left: 0, top: 0, width: 100, height: 20},
    {left: 0, top: 0, width: 100, height: 20},
  ]);
  const second = createAnimatedNode('second', [
    {left: 0, top: 30, width: 100, height: 20},
    {left: 0, top: 30, width: 100, height: 20},
  ]);
  const parent = createParent([first, second]);

  const result = flipInsertBefore(parent, first, second);

  assert.equal(result, first);
  assert.deepEqual(parent.children, [first, second]);
});

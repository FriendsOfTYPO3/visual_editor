import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectNearestScrollPositions,
  createStoredScrollPosition,
  getScrollProgress,
  getScrollTargetY,
  getVisibleScrollTargetY,
  parseStoredScrollPosition,
} from './scroll-position-sync-helpers.js';

function createElement(scrollPositionId, top, width = 100, height = 50) {
  return {
    getAttribute(name) {
      return name === 'scrollPositionId' ? scrollPositionId : null;
    },
    getBoundingClientRect() {
      return {top, width, height};
    },
  };
}

test('collectNearestScrollPositions returns the five nearest scroll positions', () => {
  const positions = collectNearestScrollPositions([
    createElement('tt_content:1', -400),
    createElement('tt_content:2', -20),
    createElement('tt_content:3', 120),
    createElement('tt_content:4', -60),
    createElement('tt_content:5', 300),
    createElement('tt_content:6', -10),
    createElement('tt_content:7', 500),
  ]);

  assert.deepEqual(positions, [
    {scrollPositionId: 'tt_content:6', innerOffsetY: 10},
    {scrollPositionId: 'tt_content:2', innerOffsetY: 20},
    {scrollPositionId: 'tt_content:4', innerOffsetY: 60},
    {scrollPositionId: 'tt_content:3', innerOffsetY: -120},
    {scrollPositionId: 'tt_content:5', innerOffsetY: -300},
  ]);
});

test('getScrollProgress returns relative scroll progress', () => {
  assert.equal(getScrollProgress({
    scrollY: 250,
    innerHeight: 500,
    document: {scrollingElement: {scrollHeight: 1500}},
  }), 0.25);
});

test('getScrollProgress clamps when the page cannot scroll', () => {
  assert.equal(getScrollProgress({
    scrollY: 250,
    innerHeight: 500,
    document: {scrollingElement: {scrollHeight: 400}},
  }), 0);
});

test('getScrollTargetY uses the first matching scroll position', () => {
  const documentObject = {
    scrollingElement: {scrollHeight: 3000},
    querySelector(selector) {
      if (selector === 've-content-element[scrollPositionId="tt_content\\:2"]') {
        return createElement('tt_content:2', 100);
      }
      return null;
    },
  };

  assert.equal(getScrollTargetY(documentObject, {scrollY: 500, innerHeight: 800}, {
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 50},
      {scrollPositionId: 'tt_content:2', innerOffsetY: 75},
    ],
    scrollProgress: 0.4,
  }), 675);
});

test('getScrollTargetY falls back to scroll progress when no position matches', () => {
  const documentObject = {
    scrollingElement: {scrollHeight: 3000},
    querySelector() {
      return null;
    },
  };

  assert.equal(getScrollTargetY(documentObject, {scrollY: 500, innerHeight: 1000}, {
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 50},
      {scrollPositionId: 'tt_content:2', innerOffsetY: 75},
    ],
    scrollProgress: 0.25,
  }), 500);
});

test('getVisibleScrollTargetY uses the first visible matching scroll position', () => {
  const documentObject = {
    scrollingElement: {scrollHeight: 3000},
    querySelector(selector) {
      if (selector === 've-content-element[scrollPositionId="tt_content\\:2"]') {
        return createElement('tt_content:2', 100);
      }
      return null;
    },
  };

  assert.equal(getVisibleScrollTargetY(documentObject, {scrollY: 500, innerHeight: 800}, {
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 50},
      {scrollPositionId: 'tt_content:2', innerOffsetY: 75},
    ],
    scrollProgress: 0.4,
  }), 675);
});

test('getVisibleScrollTargetY skips hidden matching scroll positions', () => {
  const documentObject = {
    scrollingElement: {scrollHeight: 3000},
    querySelector(selector) {
      if (selector === 've-content-element[scrollPositionId="tt_content\\:1"]') {
        return createElement('tt_content:1', 100, 0, 50);
      }
      if (selector === 've-content-element[scrollPositionId="tt_content\\:2"]') {
        return createElement('tt_content:2', 200);
      }
      return null;
    },
  };

  assert.equal(getVisibleScrollTargetY(documentObject, {scrollY: 500, innerHeight: 800}, {
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 50},
      {scrollPositionId: 'tt_content:2', innerOffsetY: 75},
    ],
    scrollProgress: 0.4,
  }), 775);
});

test('getVisibleScrollTargetY returns null when no visible position matches', () => {
  const documentObject = {
    scrollingElement: {scrollHeight: 3000},
    querySelector(selector) {
      if (selector === 've-content-element[scrollPositionId="tt_content\\:1"]') {
        return createElement('tt_content:1', 100, 100, 0);
      }
      return null;
    },
  };

  assert.equal(getVisibleScrollTargetY(documentObject, {scrollY: 500, innerHeight: 1000}, {
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 50},
      {scrollPositionId: 'tt_content:2', innerOffsetY: 75},
    ],
    scrollProgress: 0.25,
  }), null);
});

test('createStoredScrollPosition creates a persistable payload', () => {
  assert.deepEqual(createStoredScrollPosition({
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 25},
    ],
    scrollProgress: 0.2,
  }, 'https://example.org/current', 123456), {
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 25},
    ],
    scrollProgress: 0.2,
    page: 'https://example.org/current',
    time: '123456',
  });
});

test('parseStoredScrollPosition returns valid current scroll positions', () => {
  const storedValue = JSON.stringify(createStoredScrollPosition({
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 25},
    ],
    scrollProgress: 0.2,
  }, 'https://example.org/current', 1000));

  assert.deepEqual(parseStoredScrollPosition(storedValue, 'https://example.org/current', 2000), {
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 25},
    ],
    scrollProgress: 0.2,
  });
});

test('parseStoredScrollPosition rejects page mismatches', () => {
  const storedValue = JSON.stringify(createStoredScrollPosition({
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 25},
    ],
    scrollProgress: 0.2,
  }, 'https://example.org/current', 1000));

  assert.equal(parseStoredScrollPosition(storedValue, 'https://example.org/other', 2000), null);
});

test('parseStoredScrollPosition rejects expired positions', () => {
  const storedValue = JSON.stringify(createStoredScrollPosition({
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 25},
    ],
    scrollProgress: 0.2,
  }, 'https://example.org/current', 1000));

  assert.equal(parseStoredScrollPosition(storedValue, 'https://example.org/current', 3601001), null);
});

test('parseStoredScrollPosition rejects old id based positions', () => {
  const storedValue = JSON.stringify({
    positions: [
      {id: 'tt_content:1', innerOffsetY: 25},
    ],
    page: 'https://example.org/current',
    time: '1000',
  });

  assert.equal(parseStoredScrollPosition(storedValue, 'https://example.org/current', 2000), null);
});

test('parseStoredScrollPosition rejects invalid timestamps', () => {
  const storedValue = JSON.stringify({
    positions: [
      {scrollPositionId: 'tt_content:1', innerOffsetY: 25},
    ],
    scrollProgress: 0.2,
    page: 'https://example.org/current',
    time: 'invalid',
  });

  assert.equal(parseStoredScrollPosition(storedValue, 'https://example.org/current', 2000), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getObjectLeafCount } from '@andersundsehr/editara/Shared/get-object-leaf-count.mjs';

// Simple flat object
test('getObjectLeafCount counts leaves in a flat object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = getObjectLeafCount(obj);
    assert.equal(result, 3);
});

// Nested objects
test('getObjectLeafCount counts leaves in nested objects', () => {
    const obj = {
        a: 1,
        b: {
            b1: 2,
            b2: 3,
        },
        c: {
            c1: {
                c11: 4,
            },
        },
    };
    const result = getObjectLeafCount(obj);
    // a, b1, b2, c11 => 4 leaves
    assert.equal(result, 4);
});

// Empty object
test('getObjectLeafCount returns 0 for empty object', () => {
    const obj = {};
    const result = getObjectLeafCount(obj);
    assert.equal(result, 0);
});

// Object with nulls and primitive values
test('getObjectLeafCount treats null and primitives as leaves', () => {
    const obj = {
        a: null,
        b: 0,
        c: false,
        d: '',
    };
    const result = getObjectLeafCount(obj);
    assert.equal(result, 4);
});

// Object with arrays
test('getObjectLeafCount traverses into arrays as objects', () => {
    const obj = {
        a: [1, 2, 3], // array has 3 leaves
        b: {
            c: [4, 5], // array has 2 leaves
        },
    };
    const result = getObjectLeafCount(obj);
    // a[0], a[1], a[2], c[0], c[1] => 5 leaves
    assert.equal(result, 5);
});

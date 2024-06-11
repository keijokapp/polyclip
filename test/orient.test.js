// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import BigNumber from 'bignumber.js';
import { precision } from '../src/precision.js';

describe('compare vector angles', () => {
	test('colinear', () => {
		const pt1 = { x: new BigNumber(1), y: new BigNumber(1) };
		const pt2 = { x: new BigNumber(2), y: new BigNumber(2) };
		const pt3 = { x: new BigNumber(3), y: new BigNumber(3) };

		assert.strictEqual(precision.orient(pt1, pt2, pt3), 0);
		assert.strictEqual(precision.orient(pt2, pt1, pt3), 0);
		assert.strictEqual(precision.orient(pt2, pt3, pt1), 0);
		assert.strictEqual(precision.orient(pt3, pt2, pt1), 0);
	});

	test('offset', () => {
		const pt1 = { x: new BigNumber(0), y: new BigNumber(0) };
		const pt2 = { x: new BigNumber(1), y: new BigNumber(1) };
		const pt3 = { x: new BigNumber(1), y: new BigNumber(0) };

		assert.strictEqual(precision.orient(pt1, pt2, pt3), 1);
		assert.strictEqual(precision.orient(pt2, pt1, pt3), -1);
		assert.strictEqual(precision.orient(pt2, pt3, pt1), 1);
		assert.strictEqual(precision.orient(pt3, pt2, pt1), -1);
	});
});

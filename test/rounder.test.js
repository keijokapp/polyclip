// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import BigNumber from 'bignumber.js';
import { precision } from '../src/precision.js';

describe('rounder.round()', () => {
	test('no overlap', () => {
		precision.set();
		const pt1 = { x: new BigNumber(3), y: new BigNumber(4) };
		const pt2 = { x: new BigNumber(4), y: new BigNumber(5) };
		const pt3 = { x: new BigNumber(5), y: new BigNumber(5) };
		assert.strictEqual(precision.snap(pt1), pt1);
		assert.strictEqual(precision.snap(pt2), pt2);
		assert.strictEqual(precision.snap(pt3), pt3);
	});

	test('exact overlap', () => {
		precision.set();
		const pt1 = { x: new BigNumber(3), y: new BigNumber(4) };
		const pt2 = { x: new BigNumber(4), y: new BigNumber(5) };
		const pt3 = { x: new BigNumber(3), y: new BigNumber(4) };
		assert.strictEqual(precision.snap(pt1), pt1);
		assert.strictEqual(precision.snap(pt2), pt2);
		assert.strictEqual(precision.snap(pt3), pt3);
	});

	test('rounding one coordinate', () => {
		precision.set(Number.EPSILON);
		const pt1 = { x: new BigNumber(3), y: new BigNumber(4) };
		const pt2 = { x: new BigNumber(3).plus(new BigNumber(Number.EPSILON)), y: new BigNumber(4) };
		const pt3 = { x: new BigNumber(3), y: new BigNumber(4).plus(new BigNumber(Number.EPSILON)) };
		assert.deepStrictEqual(precision.snap(pt1), pt1);
		assert.deepStrictEqual(precision.snap(pt2), pt1);
		assert.deepStrictEqual(precision.snap(pt3), pt1);
	});

	test('rounding both coordinates', () => {
		precision.set(Number.EPSILON);
		const pt1 = { x: new BigNumber(3), y: new BigNumber(4) };
		const pt2 = {
			x: new BigNumber(3).plus(new BigNumber(Number.EPSILON)),
			y: new BigNumber(4).plus(new BigNumber(Number.EPSILON))
		};
		assert.deepStrictEqual(precision.snap(pt1), pt1);
		assert.deepStrictEqual(precision.snap(pt2), pt1);
	});

	test('preseed with 0', () => {
		precision.set(Number.EPSILON);
		const pt1 = {
			x: new BigNumber(Number.EPSILON).div(new BigNumber(2)),
			y: new BigNumber(-Number.EPSILON).div(new BigNumber(2))
		};
		assert.notStrictEqual(pt1.x, 0);
		assert.notStrictEqual(pt1.y, 0);
		assert.deepStrictEqual(precision.snap(pt1), { x: new BigNumber(0), y: new BigNumber(0) });
	});
});

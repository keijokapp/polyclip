// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import { BigNumber } from 'bignumber.js';
import { precision } from '../lib/precision.js';

describe('compare', () => {
	precision.set(Number.EPSILON);
	const { compare } = precision;
	test('exactly equal', () => {
		const a = new BigNumber(1);
		const b = new BigNumber(1);
		assert.strictEqual(compare(a, b), 0);
	});

	test('flp equal', () => {
		const a = new BigNumber(1);
		const b = new BigNumber(1).plus(new BigNumber(Number.EPSILON));
		assert.strictEqual(compare(a, b), 0);
	});

	test('barely less than', () => {
		const a = new BigNumber(1);
		const b = new BigNumber(1).plus(new BigNumber(Number.EPSILON).times(new BigNumber(2)));
		assert.strictEqual(compare(a, b), -1);
	});

	test('less than', () => {
		const a = new BigNumber(1);
		const b = new BigNumber(2);
		assert.strictEqual(compare(a, b), -1);
	});

	test('barely more than', () => {
		const a = new BigNumber(1).plus(new BigNumber(Number.EPSILON).times(new BigNumber(2)));
		const b = new BigNumber(1);
		assert.strictEqual(compare(a, b), 1);
	});

	test('more than', () => {
		const a = new BigNumber(2);
		const b = new BigNumber(1);
		assert.strictEqual(compare(a, b), 1);
	});

	test('both flp equal to zero', () => {
		const a = new BigNumber(0.0);
		const b = new BigNumber(Number.EPSILON)
			.minus(new BigNumber(Number.EPSILON).times(new BigNumber(Number.EPSILON)));
		assert.strictEqual(compare(a, b), 0);
	});

	test('really close to zero', () => {
		const a = new BigNumber(Number.EPSILON);
		const b = new BigNumber(Number.EPSILON).plus(
			new BigNumber(Number.EPSILON).times(new BigNumber(Number.EPSILON)).times(new BigNumber(2))
		);
		assert.strictEqual(compare(a, b), 0);
	});
	precision.set();
});

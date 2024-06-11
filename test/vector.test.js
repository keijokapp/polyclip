// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import { BigNumber } from 'bignumber.js';
import {
	crossProduct,
	dotProduct,
	length,
	cosineOfAngle,
	sineOfAngle,
	perpendicular,
	verticalIntersection,
	horizontalIntersection,
	intersection
} from '../src/vector.js';

describe('cross product', () => {
	test('general', () => {
		const pt1 = { x: new BigNumber(1), y: new BigNumber(2) };
		const pt2 = { x: new BigNumber(3), y: new BigNumber(4) };
		assert.deepStrictEqual(crossProduct(pt1, pt2), new BigNumber(-2));
	});
});

describe('dot product', () => {
	test('general', () => {
		const pt1 = { x: new BigNumber(1), y: new BigNumber(2) };
		const pt2 = { x: new BigNumber(3), y: new BigNumber(4) };
		assert.deepStrictEqual(dotProduct(pt1, pt2), new BigNumber(11));
	});
});

describe('length()', () => {
	test('horizontal', () => {
		const v = { x: new BigNumber(3), y: new BigNumber(0) };
		assert.deepStrictEqual(length(v), new BigNumber(3));
	});

	test('vertical', () => {
		const v = { x: new BigNumber(0), y: new BigNumber(-2) };
		assert.deepStrictEqual(length(v), new BigNumber(2));
	});

	test('3-4-5', () => {
		const v = { x: new BigNumber(3), y: new BigNumber(4) };
		assert.deepStrictEqual(length(v), new BigNumber(5));
	});
});

describe('sine and cosine of angle', () => {
	describe('parallel', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(1), y: new BigNumber(0) };
		test('sine', () => {
			assert.deepStrictEqual(sineOfAngle(shared, base, angle), new BigNumber(0));
		});
		test('cosine', () => {
			assert.deepStrictEqual(cosineOfAngle(shared, base, angle), new BigNumber(1));
		});
	});

	describe('45 degrees', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(1), y: new BigNumber(-1) };
		test('sine', () => {
			assert.strictEqual(
				sineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().div(new BigNumber(2)).toNumber()
			);
		});
		test('cosine', () => {
			assert.strictEqual(
				cosineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().div(new BigNumber(2)).toNumber()
			);
		});
	});

	describe('90 degrees', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(0), y: new BigNumber(-1) };
		test('sine', () => {
			assert.deepStrictEqual(sineOfAngle(shared, base, angle), new BigNumber(1));
		});
		test('cosine', () => {
			assert.deepStrictEqual(cosineOfAngle(shared, base, angle), new BigNumber(0));
		});
	});

	describe('135 degrees', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(-1), y: new BigNumber(-1) };
		test('sine', () => {
			assert.strictEqual(
				sineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().div(new BigNumber(2)).toNumber()
			);
		});
		test('cosine', () => {
			assert.strictEqual(
				cosineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().negated().div(new BigNumber(2))
					.toNumber()
			);
		});
	});

	describe('anti-parallel', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(-1), y: new BigNumber(0) };
		test('sine', () => {
			assert.deepStrictEqual(sineOfAngle(shared, base, angle), new BigNumber(-0));
		});
		test('cosine', () => {
			assert.deepStrictEqual(cosineOfAngle(shared, base, angle), new BigNumber(-1));
		});
	});

	describe('225 degrees', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(-1), y: new BigNumber(1) };
		test('sine', () => {
			assert.strictEqual(
				sineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().negated().div(new BigNumber(2))
					.toNumber()
			);
		});
		test('cosine', () => {
			assert.strictEqual(
				cosineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().negated().div(new BigNumber(2))
					.toNumber()
			);
		});
	});

	describe('270 degrees', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(0), y: new BigNumber(1) };
		test('sine', () => {
			assert.deepStrictEqual(sineOfAngle(shared, base, angle), new BigNumber(-1));
		});
		test('cosine', () => {
			assert.deepStrictEqual(cosineOfAngle(shared, base, angle), new BigNumber(0));
		});
	});

	describe('315 degrees', () => {
		const shared = { x: new BigNumber(0), y: new BigNumber(0) };
		const base = { x: new BigNumber(1), y: new BigNumber(0) };
		const angle = { x: new BigNumber(1), y: new BigNumber(1) };
		test('sine', () => {
			assert.strictEqual(
				sineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().negated().div(new BigNumber(2))
					.toNumber()
			);
		});
		test('cosine', () => {
			assert.strictEqual(
				cosineOfAngle(shared, base, angle).toNumber(),
				new BigNumber(2).sqrt().div(new BigNumber(2)).toNumber()
			);
		});
	});
});

describe('perpendicular()', () => {
	test('vertical', () => {
		const v = { x: new BigNumber(0), y: new BigNumber(1) };
		const r = perpendicular(v);
		assert.deepStrictEqual(dotProduct(v, r), new BigNumber(0));
		assert.notStrictEqual(crossProduct(v, r), new BigNumber(0));
	});

	test('horizontal', () => {
		const v = { x: new BigNumber(1), y: new BigNumber(0) };
		const r = perpendicular(v);
		assert.deepStrictEqual(dotProduct(v, r), new BigNumber(0));
		assert.notStrictEqual(crossProduct(v, r), new BigNumber(0));
	});

	test('45 degrees', () => {
		const v = { x: new BigNumber(1), y: new BigNumber(1) };
		const r = perpendicular(v);
		assert.deepStrictEqual(dotProduct(v, r), new BigNumber(0));
		assert.notStrictEqual(crossProduct(v, r), new BigNumber(0));
	});

	test('120 degrees', () => {
		const v = { x: new BigNumber(-1), y: new BigNumber(2) };
		const r = perpendicular(v);
		assert.deepStrictEqual(dotProduct(v, r), new BigNumber(0));
		assert.notStrictEqual(crossProduct(v, r), new BigNumber(0));
	});
});

describe('verticalIntersection()', () => {
	test('horizontal', () => {
		const p = { x: new BigNumber(42), y: new BigNumber(3) };
		const v = { x: new BigNumber(-2), y: new BigNumber(0) };
		const x = new BigNumber(37);
		const i = /** @type {import('../src/vector').Vector} */(verticalIntersection(p, v, x));
		assert.deepStrictEqual(i.x, new BigNumber(37));
		assert.deepStrictEqual(i.y, new BigNumber(3));
	});

	test('vertical', () => {
		const p = { x: new BigNumber(42), y: new BigNumber(3) };
		const v = { x: new BigNumber(0), y: new BigNumber(4) };
		const x = new BigNumber(37);
		assert.strictEqual(verticalIntersection(p, v, x), null);
	});

	test('45 degree', () => {
		const p = { x: new BigNumber(1), y: new BigNumber(1) };
		const v = { x: new BigNumber(1), y: new BigNumber(1) };
		const x = new BigNumber(-2);
		const i = /** @type {import('../src/vector').Vector} */(verticalIntersection(p, v, x));
		assert.deepStrictEqual(i.x, new BigNumber(-2));
		assert.deepStrictEqual(i.y, new BigNumber(-2));
	});

	test('upper left quadrant', () => {
		const p = { x: new BigNumber(-1), y: new BigNumber(1) };
		const v = { x: new BigNumber(-2), y: new BigNumber(1) };
		const x = new BigNumber(-3);
		const i = /** @type {import('../src/vector').Vector} */(verticalIntersection(p, v, x));
		assert.deepStrictEqual(i.x, new BigNumber(-3));
		assert.deepStrictEqual(i.y, new BigNumber(2));
	});
});

describe('horizontalIntersection()', () => {
	test('horizontal', () => {
		const p = { x: new BigNumber(42), y: new BigNumber(3) };
		const v = { x: new BigNumber(-2), y: new BigNumber(0) };
		const y = new BigNumber(37);
		assert.strictEqual(horizontalIntersection(p, v, y), null);
	});

	test('vertical', () => {
		const p = { x: new BigNumber(42), y: new BigNumber(3) };
		const v = { x: new BigNumber(0), y: new BigNumber(4) };
		const y = new BigNumber(37);
		const i = /** @type {import('../src/vector').Vector} */(horizontalIntersection(p, v, y));
		assert.deepStrictEqual(i.x, new BigNumber(42));
		assert.deepStrictEqual(i.y, new BigNumber(37));
	});

	test('45 degree', () => {
		const p = { x: new BigNumber(1), y: new BigNumber(1) };
		const v = { x: new BigNumber(1), y: new BigNumber(1) };
		const y = new BigNumber(4);
		const i = /** @type {import('../src/vector').Vector} */(horizontalIntersection(p, v, y));
		assert.deepStrictEqual(i.x, new BigNumber(4));
		assert.deepStrictEqual(i.y, new BigNumber(4));
	});

	test('bottom left quadrant', () => {
		const p = { x: new BigNumber(-1), y: new BigNumber(-1) };
		const v = { x: new BigNumber(-2), y: new BigNumber(-1) };
		const y = new BigNumber(-3);
		const i = /** @type {import('../src/vector').Vector} */(horizontalIntersection(p, v, y));
		assert.deepStrictEqual(i.x, new BigNumber(-5));
		assert.deepStrictEqual(i.y, new BigNumber(-3));
	});
});

describe('intersection()', () => {
	const p1 = { x: new BigNumber(42), y: new BigNumber(42) };
	const p2 = { x: new BigNumber(-32), y: new BigNumber(46) };

	test('parrallel', () => {
		const v1 = { x: new BigNumber(1), y: new BigNumber(2) };
		const v2 = { x: new BigNumber(-1), y: new BigNumber(-2) };
		const i = intersection(p1, v1, p2, v2);
		assert.strictEqual(i, null);
	});

	test('horizontal and vertical', () => {
		const v1 = { x: new BigNumber(0), y: new BigNumber(2) };
		const v2 = { x: new BigNumber(-1), y: new BigNumber(0) };
		const i = /** @type {import('../src/vector').Vector} */(intersection(p1, v1, p2, v2));
		assert.deepStrictEqual(i.x, new BigNumber(42));
		assert.deepStrictEqual(i.y, new BigNumber(46));
	});

	test('horizontal', () => {
		const v1 = { x: new BigNumber(1), y: new BigNumber(1) };
		const v2 = { x: new BigNumber(-1), y: new BigNumber(0) };
		const i = /** @type {import('../src/vector').Vector} */(intersection(p1, v1, p2, v2));
		assert.deepStrictEqual(i.x, new BigNumber(46));
		assert.deepStrictEqual(i.y, new BigNumber(46));
	});

	test('vertical', () => {
		const v1 = { x: new BigNumber(1), y: new BigNumber(1) };
		const v2 = { x: new BigNumber(0), y: new BigNumber(1) };
		const i = /** @type {import('../src/vector').Vector} */(intersection(p1, v1, p2, v2));
		assert.deepStrictEqual(i.x, new BigNumber(-32));
		assert.deepStrictEqual(i.y, new BigNumber(-32));
	});

	test('45 degree & 135 degree', () => {
		const v1 = { x: new BigNumber(1), y: new BigNumber(1) };
		const v2 = { x: new BigNumber(-1), y: new BigNumber(1) };
		const i = /** @type {import('../src/vector').Vector} */(intersection(p1, v1, p2, v2));
		assert.deepStrictEqual(i.x, new BigNumber(7));
		assert.deepStrictEqual(i.y, new BigNumber(7));
	});

	test('consistency', () => {
		// Taken from https://github.com/mfogel/polygon-clipping/issues/37
		const p1 = { x: new BigNumber(0.523787), y: new BigNumber(51.281453) };
		const v1 = { x: new BigNumber(0.0002729999999999677), y: new BigNumber(0.0002729999999999677) };
		const p2 = { x: new BigNumber(0.523985), y: new BigNumber(51.281651) };
		const v2 = {
			x: new BigNumber(0.000024999999999941735), y: new BigNumber(0.000049000000004184585)
		};
		const i1 = /** @type {import('../src/vector').Vector} */(intersection(p1, v1, p2, v2));
		const i2 = /** @type {import('../src/vector').Vector} */(intersection(p2, v2, p1, v1));
		assert.deepStrictEqual(i1.x, i2.x);
		assert.deepStrictEqual(i1.y, i2.y);
	});
});

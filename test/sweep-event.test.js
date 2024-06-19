/* eslint-disable no-new */
// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import { BigNumber } from 'bignumber.js';
import Segment from '../lib/segment.js';
import SweepEvent from '../lib/sweep-event.js';

/**
 * @param {number} x
 * @param {number} y
 * @returns {import('../lib/sweep-event.js').Point}
 */
function point(x, y) {
	return { x: new BigNumber(x), y: new BigNumber(y), events: [] };
}

describe('sweep event compare', () => {
	test('favor earlier x in point', () => {
		const s1 = new SweepEvent(
			point(-5, 4),
			/** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			point(5, 1),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(s1, s2), -1);
		assert.strictEqual(SweepEvent.compare(s2, s1), 1);
	});

	test('then favor earlier y in point', () => {
		const s1 = new SweepEvent(
			point(5, -4),
			/** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			point(5, 4),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(s1, s2), -1);
		assert.strictEqual(SweepEvent.compare(s2, s1), 1);
	});

	test('then favor right events over left', () => {
		const seg1 = Segment.fromRing(
			point(5, 4),
			point(3, 2),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(5, 4),
			point(6, 5),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(seg1.rightSE, seg2.leftSE), -1);
		assert.strictEqual(SweepEvent.compare(seg2.leftSE, seg1.rightSE), 1);
	});

	test('then favor non-vertical segments for left events', () => {
		const seg1 = Segment.fromRing(
			point(3, 2),
			point(3, 4),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(3, 2),
			point(5, 4),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(seg1.leftSE, seg2.rightSE), -1);
		assert.strictEqual(SweepEvent.compare(seg2.rightSE, seg1.leftSE), 1);
	});

	test('then favor vertical segments for right events', () => {
		const seg1 = Segment.fromRing(
			point(3, 4),
			point(3, 2),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(3, 4),
			point(1, 2),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(seg1.leftSE, seg2.rightSE), -1);
		assert.strictEqual(SweepEvent.compare(seg2.rightSE, seg1.leftSE), 1);
	});

	test('then favor lower segment', () => {
		const seg1 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(0, 0),
			point(5, 6),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(seg1.leftSE, seg2.rightSE), -1);
		assert.strictEqual(SweepEvent.compare(seg2.rightSE, seg1.leftSE), 1);
	});

	// Sometimes from one segment's perspective it appears colinear
	// to another segment, but from that other segment's perspective
	// they aren't colinear. This happens because a longer segment
	// is able to better determine what is and is not colinear.
	test('and favor barely lower segment', () => {
		const seg1 = Segment.fromRing(
			point(-75.725, 45.357),
			point(-75.72484615384616, 45.35723076923077),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(-75.725, 45.357),
			point(-75.723, 45.36),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(seg1.leftSE, seg2.leftSE), 1);
		assert.strictEqual(SweepEvent.compare(seg2.leftSE, seg1.leftSE), -1);
	});

	test('then favor lower ring id', () => {
		const seg1 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */({ id: 1 })
		);
		const seg2 = Segment.fromRing(
			point(0, 0),
			point(5, 5),
			/** @type {any} */({ id: 2 })
		);
		assert.strictEqual(SweepEvent.compare(seg1.leftSE, seg2.leftSE), -1);
		assert.strictEqual(SweepEvent.compare(seg2.leftSE, seg1.leftSE), 1);
	});

	test('identical equal', () => {
		const s1 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const s3 = new SweepEvent(
			point(3, 3),
			/** @type {any} */(undefined)
		);
		new Segment(s1, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		new Segment(s1, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		assert.strictEqual(SweepEvent.compare(s1, s1), 0);
	});

	test('totally equal but not identical events are consistent', () => {
		const s1 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const s3 = new SweepEvent(
			point(3, 3),
			/** @type {any} */(undefined)
		);
		new Segment(s1, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		new Segment(s2, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		const result = SweepEvent.compare(s1, s2);
		assert.strictEqual(SweepEvent.compare(s1, s2), result);
		assert.strictEqual(SweepEvent.compare(s2, s1), result * -1);
	});

	test('events are linked as side effect', () => {
		const s1 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			s1,
			new SweepEvent(
				point(2, 2),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			s2,
			new SweepEvent(
				point(3, 4),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		assert.notStrictEqual(s1.point, s2.point);
		SweepEvent.compare(s1, s2);
		assert.strictEqual(s1.point, s2.point);
	});

	test('consistency edge case', () => {
		// harvested from https://github.com/mfogel/polygon-clipping/issues/62
		const seg1 = Segment.fromRing(
			point(-71.0390933353125, 41.504475),
			point(-71.0389879, 41.5037842),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(-71.0390933353125, 41.504475),
			point(-71.03906280974431, 41.504275),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(SweepEvent.compare(seg1.leftSE, seg2.leftSE), -1);
		assert.strictEqual(SweepEvent.compare(seg2.leftSE, seg1.leftSE), 1);
	});
});

describe('constructor', () => {
	test('events created from same point are already linked', () => {
		const p1 = point(0, 0);
		const s1 = new SweepEvent(p1, /** @type {any} */(undefined));
		const s2 = new SweepEvent(p1, /** @type {any} */(undefined));
		assert.strictEqual(s1.point, p1);
		assert.strictEqual(s1.point.events, s2.point.events);
	});
});

describe('sweep event link', () => {
	test('link events already linked with others', () => {
		const p1 = point(1, 2);
		const p2 = point(1, 2);
		const se1 = new SweepEvent(p1, /** @type {any} */(undefined));
		const se2 = new SweepEvent(p1, /** @type {any} */(undefined));
		const se3 = new SweepEvent(p2, /** @type {any} */(undefined));
		const se4 = new SweepEvent(p2, /** @type {any} */(undefined));
		new Segment(
			se1,
			new SweepEvent(
				point(5, 5),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			se2,
			new SweepEvent(
				point(6, 6),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			se3,
			new SweepEvent(
				point(7, 7),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			se4,
			new SweepEvent(
				point(8, 8),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		se1.link(se3);
		assert.strictEqual(se1.point.events.length, 4);
		assert.strictEqual(se1.point, se2.point);
		assert.strictEqual(se1.point, se3.point);
		assert.strictEqual(se1.point, se4.point);
	});

	test('same event twice', () => {
		const p1 = point(0, 0);
		const s1 = new SweepEvent(p1, /** @type {any} */(undefined));
		const s2 = new SweepEvent(p1, /** @type {any} */(undefined));
		assert.throws(() => s2.link(s1));
		assert.throws(() => s1.link(s2));
	});
});

describe('sweep event get leftmost comparator', () => {
	test('after a segment straight to the right', () => {
		const prevEvent = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const event = new SweepEvent(
			point(1, 0),
			/** @type {any} */(undefined)
		);
		const comparator = event.getLeftmostComparator(prevEvent);

		const e1 = new SweepEvent(
			point(1, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e1,
			new SweepEvent(
				point(0, 1),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e2 = new SweepEvent(
			point(1, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e2,
			new SweepEvent(
				point(1, 1),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e3 = new SweepEvent(
			point(1, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e3,
			new SweepEvent(
				point(2, 0),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e4 = new SweepEvent(
			point(1, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e4,
			new SweepEvent(
				point(1, -1),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e5 = new SweepEvent(
			point(1, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e5,
			new SweepEvent(
				point(0, -1),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		assert.strictEqual(comparator(e1, e2), -1);
		assert.strictEqual(comparator(e2, e3), -1);
		assert.strictEqual(comparator(e3, e4), -1);
		assert.strictEqual(comparator(e4, e5), -1);

		assert.strictEqual(comparator(e2, e1), 1);
		assert.strictEqual(comparator(e3, e2), 1);
		assert.strictEqual(comparator(e4, e3), 1);
		assert.strictEqual(comparator(e5, e4), 1);

		assert.strictEqual(comparator(e1, e3), -1);
		assert.strictEqual(comparator(e1, e4), -1);
		assert.strictEqual(comparator(e1, e5), -1);

		assert.strictEqual(comparator(e1, e1), 0);
	});

	test('after a down and to the left', () => {
		const prevEvent = new SweepEvent(
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const event = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const comparator = event.getLeftmostComparator(prevEvent);

		const e1 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e1,
			new SweepEvent(
				point(0, 1),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e2 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e2,
			new SweepEvent(
				point(1, 0),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e3 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e3,
			new SweepEvent(
				point(0, -1),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e4 = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		new Segment(
			e4,
			new SweepEvent(
				point(-1, 0),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		assert.strictEqual(comparator(e1, e2), 1);
		assert.strictEqual(comparator(e1, e3), 1);
		assert.strictEqual(comparator(e1, e4), 1);

		assert.strictEqual(comparator(e2, e1), -1);
		assert.strictEqual(comparator(e2, e3), -1);
		assert.strictEqual(comparator(e2, e4), -1);

		assert.strictEqual(comparator(e3, e1), -1);
		assert.strictEqual(comparator(e3, e2), 1);
		assert.strictEqual(comparator(e3, e4), -1);

		assert.strictEqual(comparator(e4, e1), -1);
		assert.strictEqual(comparator(e4, e2), 1);
		assert.strictEqual(comparator(e4, e3), 1);
	});
});

/* eslint-disable no-new */
// @ts-check

import { describe, expect, test } from '@jest/globals';
import { BigNumber } from 'bignumber.js';
import Segment from '../src/segment.js';
import SweepEvent from '../src/sweep-event.js';

describe('sweep event compare', () => {
	test('favor earlier x in point', () => {
		const s1 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-5), y: new BigNumber(4) }
			),
			/** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(1) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(s1, s2)).toBe(-1);
		expect(SweepEvent.compare(s2, s1)).toBe(1);
	});

	test('then favor earlier y in point', () => {
		const s1 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(-4) }
			), /** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(4) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(s1, s2)).toBe(-1);
		expect(SweepEvent.compare(s2, s1)).toBe(1);
	});

	test('then favor right events over left', () => {
		const seg1 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(4) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(2) }
			),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(4) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(6), y: new BigNumber(5) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(seg1.rightSE, seg2.leftSE)).toBe(-1);
		expect(SweepEvent.compare(seg2.leftSE, seg1.rightSE)).toBe(1);
	});

	test('then favor non-vertical segments for left events', () => {
		const seg1 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(2) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(4) }
			),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(2) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(4) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(seg1.leftSE, seg2.rightSE)).toBe(-1);
		expect(SweepEvent.compare(seg2.rightSE, seg1.leftSE)).toBe(1);
	});

	test('then favor vertical segments for right events', () => {
		const seg1 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(4) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(2) }
			),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(4) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(2) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(seg1.leftSE, seg2.rightSE)).toBe(-1);
		expect(SweepEvent.compare(seg2.rightSE, seg1.leftSE)).toBe(1);
	});

	test('then favor lower segment', () => {
		const seg1 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(4), y: new BigNumber(4) }
			),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(6) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(seg1.leftSE, seg2.rightSE)).toBe(-1);
		expect(SweepEvent.compare(seg2.rightSE, seg1.leftSE)).toBe(1);
	});

	// Sometimes from one segment's perspective it appears colinear
	// to another segment, but from that other segment's perspective
	// they aren't colinear. This happens because a longer segment
	// is able to better determine what is and is not colinear.
	test('and favor barely lower segment', () => {
		const seg1 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-75.725), y: new BigNumber(45.357) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-75.72484615384616), y: new BigNumber(45.35723076923077) }
			),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-75.725), y: new BigNumber(45.357) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-75.723), y: new BigNumber(45.36) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(seg1.leftSE, seg2.leftSE)).toBe(1);
		expect(SweepEvent.compare(seg2.leftSE, seg1.leftSE)).toBe(-1);
	});

	test('then favor lower ring id', () => {
		const seg1 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(4), y: new BigNumber(4) }
			),
			/** @type {any} */({ id: 1 })
		);
		const seg2 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(5), y: new BigNumber(5) }
			),
			/** @type {any} */({ id: 2 })
		);
		expect(SweepEvent.compare(seg1.leftSE, seg2.leftSE)).toBe(-1);
		expect(SweepEvent.compare(seg2.leftSE, seg1.leftSE)).toBe(1);
	});

	test('identical equal', () => {
		const s1 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		const s3 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(3) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(s1, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		new Segment(s1, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		expect(SweepEvent.compare(s1, s1)).toBe(0);
	});

	test('totally equal but not identical events are consistent', () => {
		const s1 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		const s3 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(3), y: new BigNumber(3) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(s1, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		new Segment(s2, s3, /** @type {any} */({ id: 1 }), /** @type {any} */(undefined));
		const result = SweepEvent.compare(s1, s2);
		expect(SweepEvent.compare(s1, s2)).toBe(result);
		expect(SweepEvent.compare(s2, s1)).toBe(result * -1);
	});

	test('events are linked as side effect', () => {
		const s1 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		const s2 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			s1,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(2), y: new BigNumber(2) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			s2,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(3), y: new BigNumber(4) }
				), /** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		expect(s1.point !== s2.point);
		SweepEvent.compare(s1, s2);
		expect(s1.point === s2.point);
	});

	test('consistency edge case', () => {
		// harvested from https://github.com/mfogel/polygon-clipping/issues/62
		const seg1 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-71.0390933353125), y: new BigNumber(41.504475) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-71.0389879), y: new BigNumber(41.5037842) }
			),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-71.0390933353125), y: new BigNumber(41.504475) }
			),
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(-71.03906280974431), y: new BigNumber(41.504275) }
			),
			/** @type {any} */(undefined)
		);
		expect(SweepEvent.compare(seg1.leftSE, seg2.leftSE)).toBe(-1);
		expect(SweepEvent.compare(seg2.leftSE, seg1.leftSE)).toBe(1);
	});
});

describe('constructor', () => {
	test('events created from same point are already linked', () => {
		const p1 = /** @type {import('../src/sweep-event').Point} */(
			{ x: new BigNumber(0), y: new BigNumber(0) }
		);
		const s1 = new SweepEvent(p1, /** @type {any} */(undefined));
		const s2 = new SweepEvent(p1, /** @type {any} */(undefined));
		expect(s1.point === p1);
		expect(s1.point.events === s2.point.events);
	});
});

describe('sweep event link', () => {
	test('link events already linked with others', () => {
		const p1 = /** @type {import('../src/sweep-event').Point} */(
			{ x: new BigNumber(1), y: new BigNumber(2) }
		);
		const p2 = /** @type {import('../src/sweep-event').Point} */(
			{ x: new BigNumber(1), y: new BigNumber(2) }
		);
		const se1 = new SweepEvent(p1, /** @type {any} */(undefined));
		const se2 = new SweepEvent(p1, /** @type {any} */(undefined));
		const se3 = new SweepEvent(p2, /** @type {any} */(undefined));
		const se4 = new SweepEvent(p2, /** @type {any} */(undefined));
		new Segment(
			se1,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(5), y: new BigNumber(5) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			se2,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(6), y: new BigNumber(6) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			se3,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(7), y: new BigNumber(7) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		new Segment(
			se4,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(8), y: new BigNumber(8) }
				), /** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);
		se1.link(se3);
		expect(se1.point.events.length).toBe(4);
		expect(se1.point).toBe(se2.point);
		expect(se1.point).toBe(se3.point);
		expect(se1.point).toBe(se4.point);
	});

	test('same event twice', () => {
		const p1 = /** @type {import('../src/sweep-event').Point} */(
			{ x: new BigNumber(0), y: new BigNumber(0) }
		);
		const s1 = new SweepEvent(p1, /** @type {any} */(undefined));
		const s2 = new SweepEvent(p1, /** @type {any} */(undefined));
		expect(() => s2.link(s1)).toThrow();
		expect(() => s1.link(s2)).toThrow();
	});
});

describe('sweep event get leftmost comparator', () => {
	test('after a segment straight to the right', () => {
		const prevEvent = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		const event = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		const comparator = event.getLeftmostComparator(prevEvent);

		const e1 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e1,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(0), y: new BigNumber(1) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e2 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e2,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(1), y: new BigNumber(1) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e3 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e3,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(2), y: new BigNumber(0) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e4 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e4,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(1), y: new BigNumber(-1) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e5 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e5,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(0), y: new BigNumber(-1) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		expect(comparator(e1, e2)).toBe(-1);
		expect(comparator(e2, e3)).toBe(-1);
		expect(comparator(e3, e4)).toBe(-1);
		expect(comparator(e4, e5)).toBe(-1);

		expect(comparator(e2, e1)).toBe(1);
		expect(comparator(e3, e2)).toBe(1);
		expect(comparator(e4, e3)).toBe(1);
		expect(comparator(e5, e4)).toBe(1);

		expect(comparator(e1, e3)).toBe(-1);
		expect(comparator(e1, e4)).toBe(-1);
		expect(comparator(e1, e5)).toBe(-1);

		expect(comparator(e1, e1)).toBe(0);
	});

	test('after a down and to the left', () => {
		const prevEvent = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(1), y: new BigNumber(1) }
			),
			/** @type {any} */(undefined)
		);
		const event = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		const comparator = event.getLeftmostComparator(prevEvent);

		const e1 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e1,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(0), y: new BigNumber(1) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e2 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e2,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(1), y: new BigNumber(0) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e3 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e3,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(0), y: new BigNumber(-1) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		const e4 = new SweepEvent(
			/** @type {import('../src/sweep-event').Point} */(
				{ x: new BigNumber(0), y: new BigNumber(0) }
			),
			/** @type {any} */(undefined)
		);
		new Segment(
			e4,
			new SweepEvent(
				/** @type {import('../src/sweep-event').Point} */(
					{ x: new BigNumber(-1), y: new BigNumber(0) }
				),
				/** @type {any} */(undefined)
			),
			/** @type {any} */(undefined),
			/** @type {any} */(undefined)
		);

		expect(comparator(e1, e2)).toBe(1);
		expect(comparator(e1, e3)).toBe(1);
		expect(comparator(e1, e4)).toBe(1);

		expect(comparator(e2, e1)).toBe(-1);
		expect(comparator(e2, e3)).toBe(-1);
		expect(comparator(e2, e4)).toBe(-1);

		expect(comparator(e3, e1)).toBe(-1);
		expect(comparator(e3, e2)).toBe(1);
		expect(comparator(e3, e4)).toBe(-1);

		expect(comparator(e4, e1)).toBe(-1);
		expect(comparator(e4, e2)).toBe(1);
		expect(comparator(e4, e3)).toBe(1);
	});
});

// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import { BigNumber } from 'bignumber.js';
import Segment from '../lib/segment.js';
import SweepEvent from '../lib/sweep-event.js';
import { precision } from '../lib/precision.js';

/**
 * @param {number | BigNumber} x
 * @param {number | BigNumber} y
 * @returns {import('../lib/sweep-event.js').Point}
 */
function point(x, y) {
	return { x: new BigNumber(x), y: new BigNumber(y), events: [] };
}

/**
 * @param {(
 *   | import('../lib/sweep-event.js').Point
 *   | import('../lib/vector.js').Vector
 *   | undefined
 * )} point
 * @returns {import('../lib/vector.js').Vector | undefined}
 */
function toVector(point) {
	if (point != null) {
		return {
			x: point.x,
			y: point.y
		};
	}
}

describe('constructor', () => {
	test('general', () => {
		const leftSE = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const rightSE = new SweepEvent(
			point(1, 1),
			/** @type {any} */(undefined)
		);
		/** @type {import('../lib/geom-in.js').RingIn[]} */
		const rings = [];
		/** @type {import('../lib/segment.js').Winding[]} */
		const windings = [];
		const seg = new Segment(leftSE, rightSE, rings, windings);
		assert.strictEqual(seg.rings, rings);
		assert.strictEqual(seg.windings, windings);
		assert.strictEqual(seg.leftSE, leftSE);
		assert.strictEqual(seg.leftSE.otherSE, rightSE);
		assert.strictEqual(seg.rightSE, rightSE);
		assert.strictEqual(seg.rightSE.otherSE, leftSE);
		assert.strictEqual(seg.prev, undefined);
		assert.strictEqual(seg.consumedBy, undefined);
	});

	test('segment Id increments', () => {
		const leftSE = new SweepEvent(
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const rightSE = new SweepEvent(
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const seg1 = new Segment(leftSE, rightSE, [], /** @type {any} */(undefined));
		const seg2 = new Segment(leftSE, rightSE, [], /** @type {any} */(undefined));
		assert.strictEqual(seg2.id - seg1.id, 1);
	});
});

describe('fromRing', () => {
	test('correct point on left and right 1', () => {
		const p1 = point(0, 0);
		const p2 = point(0, 1);
		const seg = Segment.fromRing(p1, p2, /** @type {any} */(undefined));
		assert.strictEqual(seg.leftSE.point, p1);
		assert.strictEqual(seg.rightSE.point, p2);
	});

	test('correct point on left and right 1', () => {
		const p1 = point(0, 0);
		const p2 = point(-1, 0);
		const seg = Segment.fromRing(p1, p2, /** @type {any} */(undefined));
		assert.strictEqual(seg.leftSE.point, p2);
		assert.strictEqual(seg.rightSE.point, p1);
	});

	test('attempt create segment with same points', () => {
		const p1 = point(0, 0);
		const p2 = point(0, 0);
		assert.throws(() => Segment.fromRing(p1, p2, /** @type {any} */(undefined)));
	});
});

describe('split', () => {
	test('on interior point', () => {
		const seg = Segment.fromRing(
			point(0, 0),
			point(10, 10),
			/** @type {any} */(true)
		);
		const pt = point(5, 5);
		const evts = seg.split(pt);
		assert.strictEqual(evts[0].segment, seg);
		assert.strictEqual(evts[0].point, pt);
		assert.strictEqual(evts[0].isLeft, false);
		assert.strictEqual(evts[0].otherSE.otherSE, evts[0]);
		assert.strictEqual(evts[1].segment.leftSE.segment, evts[1].segment);
		assert.notStrictEqual(evts[1].segment, seg);
		assert.strictEqual(evts[1].point, pt);
		assert.strictEqual(evts[1].isLeft, true);
		assert.strictEqual(evts[1].otherSE.otherSE, evts[1]);
		assert.strictEqual(evts[1].segment.rightSE.segment, evts[1].segment);
	});

	test('on close-to-but-not-exactly interior point', () => {
		const seg = Segment.fromRing(
			point(0, 10),
			point(10, 0),
			/** @type {any} */(false)
		);
		const pt = point(new BigNumber(5).plus(new BigNumber(Number.EPSILON)), 5);
		const evts = seg.split(pt);
		assert.strictEqual(evts[0].segment, seg);
		assert.strictEqual(evts[0].point, pt);
		assert.strictEqual(evts[0].isLeft, false);
		assert.notStrictEqual(evts[1].segment, seg);
		assert.strictEqual(evts[1].point, pt);
		assert.strictEqual(evts[1].isLeft, true);
		assert.strictEqual(evts[1].segment.rightSE.segment, evts[1].segment);
	});

	test('on three interior points', () => {
		const seg = Segment.fromRing(
			point(0, 0),
			point(10, 10),
			/** @type {any} */(true)
		);
		const [sPt1, sPt2, sPt3] = [
			point(2, 2),
			point(4, 4),
			point(6, 6)
		];

		const [orgLeftEvt, orgRightEvt] = [seg.leftSE, seg.rightSE];
		const newEvts3 = seg.split(sPt3);
		const newEvts2 = seg.split(sPt2);
		const newEvts1 = seg.split(sPt1);
		const newEvts = [...newEvts1, ...newEvts2, ...newEvts3];

		assert.strictEqual(newEvts.length, 6);

		assert.strictEqual(seg.leftSE, orgLeftEvt);
		let evt = /** @type {SweepEvent} */(newEvts.find(e => e.point === sPt1 && !e.isLeft));
		assert.strictEqual(seg.rightSE, newEvts.find(e => e.point === sPt1 && !e.isLeft));

		evt = /** @type {SweepEvent} */(newEvts.find(e => e.point === sPt1 && e.isLeft));
		let otherEvt = /** @type {SweepEvent} */(newEvts.find(e => e.point === sPt2 && !e.isLeft));
		assert.strictEqual(evt.segment, otherEvt.segment);

		evt = /** @type {SweepEvent} */(newEvts.find(e => e.point === sPt2 && e.isLeft));
		otherEvt = /** @type {SweepEvent} */(newEvts.find(e => e.point === sPt3 && !e.isLeft));
		assert.strictEqual(evt.segment, otherEvt.segment);

		evt = /** @type {SweepEvent} */(newEvts.find(e => e.point === sPt3 && e.isLeft));
		assert.strictEqual(evt.segment, orgRightEvt.segment);
	});
});

describe('simple properties - bbox, vector', () => {
	test('general', () => {
		const seg = Segment.fromRing(
			point(1, 2),
			point(3, 4),
			/** @type {any} */(undefined)
		);
		assert.deepStrictEqual(seg.bbox(), {
			ll: { x: new BigNumber(1), y: new BigNumber(2) },
			ur: { x: new BigNumber(3), y: new BigNumber(4) }
		});
		assert.deepStrictEqual(seg.vector(), { x: new BigNumber(2), y: new BigNumber(2) });
	});

	test('horizontal', () => {
		const seg = Segment.fromRing(
			point(1, 4),
			point(3, 4),
			/** @type {any} */(undefined)
		);
		assert.deepStrictEqual(seg.bbox(), {
			ll: { x: new BigNumber(1), y: new BigNumber(4) },
			ur: { x: new BigNumber(3), y: new BigNumber(4) }
		});
		assert.deepStrictEqual(seg.vector(), { x: new BigNumber(2), y: new BigNumber(0) });
	});

	test('vertical', () => {
		const seg = Segment.fromRing(
			point(3, 2),
			point(3, 4),
			/** @type {any} */(undefined)
		);
		assert.deepStrictEqual(seg.bbox(), {
			ll: { x: new BigNumber(3), y: new BigNumber(2) },
			ur: { x: new BigNumber(3), y: new BigNumber(4) }
		});
		assert.deepStrictEqual(seg.vector(), { x: new BigNumber(0), y: new BigNumber(2) });
	});
});

describe('consume()', () => {
	test('not automatically consumed', () => {
		const p1 = point(0, 0);
		const p2 = point(1, 0);
		const seg1 = Segment.fromRing(p1, p2, /** @type {any} */({ id: 1 }));
		const seg2 = Segment.fromRing(p1, p2, /** @type {any} */({ id: 2 }));
		assert.strictEqual(seg1.consumedBy, undefined);
		assert.strictEqual(seg2.consumedBy, undefined);
	});

	test('basic case', () => {
		const p1 = point(0, 0);
		const p2 = point(1, 0);
		const seg1 = Segment.fromRing(p1, p2, /** @type {any} */({}));
		const seg2 = Segment.fromRing(p1, p2, /** @type {any} */({}));
		seg1.consume(seg2);
		assert.strictEqual(seg2.consumedBy, seg1);
		assert.strictEqual(seg1.consumedBy, undefined);
	});

	test('ealier in sweep line sorting consumes later', () => {
		const p1 = point(0, 0);
		const p2 = point(1, 0);
		const seg1 = Segment.fromRing(p1, p2, /** @type {any} */({}));
		const seg2 = Segment.fromRing(p1, p2, /** @type {any} */({}));
		seg2.consume(seg1);
		assert.strictEqual(seg2.consumedBy, seg1);
		assert.strictEqual(seg1.consumedBy, undefined);
	});

	test('consuming cascades', () => {
		const p1 = point(0, 0);
		const p2 = point(0, 0);
		const p3 = point(1, 0);
		const p4 = point(1, 0);
		const seg1 = Segment.fromRing(p1, p3, /** @type {any} */({}));
		const seg2 = Segment.fromRing(p1, p3, /** @type {any} */({}));
		const seg3 = Segment.fromRing(p2, p4, /** @type {any} */({}));
		const seg4 = Segment.fromRing(p2, p4, /** @type {any} */({}));
		const seg5 = Segment.fromRing(p2, p4, /** @type {any} */({}));
		seg1.consume(seg2);
		seg4.consume(seg2);
		seg3.consume(seg2);
		seg3.consume(seg5);
		assert.strictEqual(seg1.consumedBy, undefined);
		assert.strictEqual(seg2.consumedBy, seg1);
		assert.strictEqual(seg3.consumedBy, seg1);
		assert.strictEqual(seg4.consumedBy, seg1);
		assert.strictEqual(seg5.consumedBy, seg1);
	});
});

describe('is an endpoint', () => {
	const p1 = point(0, -1);
	const p2 = point(1, 0);
	const seg = Segment.fromRing(p1, p2, /** @type {any} */(undefined));

	test('yup', () => {
		assert.strictEqual(seg.isAnEndpoint(p1), true);
		assert.strictEqual(seg.isAnEndpoint(p2), true);
	});

	test('nope', () => {
		assert.strictEqual(
			seg.isAnEndpoint({ x: new BigNumber(-34), y: new BigNumber(46) }),
			false
		);
		assert.strictEqual(
			seg.isAnEndpoint(point(0, 0)),
			false
		);
	});
});

describe('comparison with point', () => {
	test('general', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(0, 1),
			point(0, 0),
			/** @type {any} */(undefined)
		);

		assert.strictEqual(
			s1.comparePoint(point(0, 1)),
			1
		);
		assert.strictEqual(
			s1.comparePoint(point(1, 2)),
			1
		);
		assert.strictEqual(
			s1.comparePoint(point(0, 0)),
			0
		);
		assert.strictEqual(
			s1.comparePoint(point(5, -1)),
			-1
		);

		assert.strictEqual(
			s2.comparePoint(point(0, 1)),
			0
		);
		assert.strictEqual(
			s2.comparePoint(point(1, 2)),
			-1
		);
		assert.strictEqual(
			s2.comparePoint(point(0, 0)),
			0
		);
		assert.strictEqual(
			s2.comparePoint(point(5, -1)),
			-1
		);
	});

	test('barely above', () => {
		const s1 = Segment.fromRing(
			point(1, 1),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(2), y: new BigNumber(1).minus(new BigNumber(Number.EPSILON)) };
		assert.strictEqual(s1.comparePoint(pt), -1);
	});

	test('barely below', () => {
		const s1 = Segment.fromRing(
			point(1, 1),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = {
			x: new BigNumber(2),
			y: new BigNumber(1)
				.plus(new BigNumber(Number.EPSILON).times(new BigNumber(3)).div(new BigNumber(2)))
		};
		assert.strictEqual(s1.comparePoint(pt), 1);
	});

	test('vertical before', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(1, 3),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(0) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('vertical after', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(1, 3),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(2), y: new BigNumber(0) };
		assert.strictEqual(seg.comparePoint(pt), -1);
	});

	test('vertical on', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(1, 3),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(1), y: new BigNumber(0) };
		assert.strictEqual(seg.comparePoint(pt), 0);
	});

	test('horizontal below', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(0) };
		assert.strictEqual(seg.comparePoint(pt), -1);
	});

	test('horizontal above', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('horizontal on', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(1) };
		assert.strictEqual(seg.comparePoint(pt), 0);
	});

	test('in vertical plane below', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 3),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(2), y: new BigNumber(0) };
		assert.strictEqual(seg.comparePoint(pt), -1);
	});

	test('in vertical plane above', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 3),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(2), y: new BigNumber(4) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('in horizontal plane upward sloping before', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 3),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('in horizontal plane upward sloping after', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 3),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(4), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), -1);
	});

	test('in horizontal plane downward sloping before', () => {
		const seg = Segment.fromRing(
			point(1, 3),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), -1);
	});

	test('in horizontal plane downward sloping after', () => {
		const seg = Segment.fromRing(
			point(1, 3),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(4), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('upward more vertical before', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 6),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('upward more vertical after', () => {
		const seg = Segment.fromRing(
			point(1, 1),
			point(3, 6),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(4), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), -1);
	});

	test('downward more vertical before', () => {
		const seg = Segment.fromRing(
			point(1, 6),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), -1);
	});

	test('downward more vertical after', () => {
		const seg = Segment.fromRing(
			point(1, 6),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(4), y: new BigNumber(2) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('downward-slopping segment with almost touching point - from issue 37', () => {
		const seg = Segment.fromRing(
			point(0.523985, 51.281651),
			point(0.5241, 51.281651000100005),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(0.5239850000000027), y: new BigNumber(51.281651000000004) };
		assert.strictEqual(seg.comparePoint(pt), 1);
	});

	test('avoid splitting loops on near vertical segments - from issue 60-2', () => {
		precision.set(Number.EPSILON);
		const seg = Segment.fromRing(
			point(-45.3269382, -1.4059341),
			point(-45.326737413921656, -1.40635),
			/** @type {any} */(undefined)
		);
		const pt = { x: new BigNumber(-45.326833968900424), y: new BigNumber(-1.40615) };
		assert.strictEqual(seg.comparePoint(pt), 0);
		precision.set();
	});
});

describe('get intersections 2', () => {
	test('colinear full overlap', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(s1.getIntersection(s2), undefined);
		assert.strictEqual(s2.getIntersection(s1), undefined);
	});

	test('colinear partial overlap upward slope', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(2, 2),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(1, 1),
			point(3, 3),
			/** @type {any} */(undefined)
		);
		const inter = { x: new BigNumber(1), y: new BigNumber(1) };
		assert.deepStrictEqual(toVector(s1.getIntersection(s2)), inter);
		assert.deepStrictEqual(toVector(s2.getIntersection(s1)), inter);
	});

	test('colinear partial overlap downward slope', () => {
		const s1 = Segment.fromRing(
			point(0, 2),
			point(2, 0),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(-1, 3),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const inter = { x: new BigNumber(0), y: new BigNumber(2) };
		assert.deepStrictEqual(toVector(s1.getIntersection(s2)), inter);
		assert.deepStrictEqual(toVector(s2.getIntersection(s1)), inter);
	});

	test('colinear partial overlap horizontal', () => {
		const s1 = Segment.fromRing(
			point(0, 1),
			point(2, 1),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(1, 1),
			point(3, 1),
			/** @type {any} */(undefined)
		);
		const inter = { x: new BigNumber(1), y: new BigNumber(1) };
		assert.deepStrictEqual(toVector(s1.getIntersection(s2)), inter);
		assert.deepStrictEqual(toVector(s2.getIntersection(s1)), inter);
	});

	test('colinear partial overlap vertical', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(0, 3),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(0, 2),
			point(0, 4),
			/** @type {any} */(undefined)
		);
		const inter = { x: new BigNumber(0), y: new BigNumber(2) };
		assert.deepStrictEqual(toVector(s1.getIntersection(s2)), inter);
		assert.deepStrictEqual(toVector(s2.getIntersection(s1)), inter);
	});

	test('colinear endpoint overlap', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(1, 1),
			point(2, 2),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(s1.getIntersection(s2), undefined);
		assert.strictEqual(s2.getIntersection(s1), undefined);
	});

	test('colinear no overlap', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(3, 3),
			point(4, 4),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(s1.getIntersection(s2), undefined);
		assert.strictEqual(s2.getIntersection(s1), undefined);
	});

	test('parallel no overlap', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(0, 3),
			point(1, 4),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(s1.getIntersection(s2), undefined);
		assert.strictEqual(s2.getIntersection(s1), undefined);
	});

	test('intersect general', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(2, 2),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(0, 2),
			point(2, 0),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(1), y: new BigNumber(1) };
		assert.deepStrictEqual(s1.getIntersection(s2), inter);
		assert.deepStrictEqual(s2.getIntersection(s1), inter);
	});

	test('T-intersect with an endpoint', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(2, 2),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(1, 1),
			point(5, 4),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(1), y: new BigNumber(1) };
		assert.deepStrictEqual(toVector(s1.getIntersection(s2)), inter);
		assert.deepStrictEqual(toVector(s2.getIntersection(s1)), inter);
	});

	test('intersect with vertical', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(5, 5),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(3, 0),
			point(3, 44),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(3), y: new BigNumber(3) };
		assert.deepStrictEqual(s1.getIntersection(s2), inter);
		assert.deepStrictEqual(s2.getIntersection(s1), inter);
	});

	test('intersect with horizontal', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(5, 5),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(0, 3),
			point(23, 3),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(3), y: new BigNumber(3) };
		assert.deepStrictEqual(toVector(s1.getIntersection(s2)), inter);
		assert.deepStrictEqual(toVector(s2.getIntersection(s1)), inter);
	});

	test('horizontal and vertical T-intersection', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(5, 0),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(3, 0),
			point(3, 5),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(3), y: new BigNumber(0) };
		assert.deepStrictEqual(toVector(s1.getIntersection(s2)), inter);
		assert.deepStrictEqual(toVector(s2.getIntersection(s1)), inter);
	});

	test('horizontal and vertical general intersection', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(5, 0),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(3, -5),
			point(3, 5),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(3), y: new BigNumber(0) };
		assert.deepStrictEqual(s1.getIntersection(s2), inter);
		assert.deepStrictEqual(s2.getIntersection(s1), inter);
	});

	test('no intersection not even close', () => {
		const s1 = Segment.fromRing(
			point(1000, 10002),
			point(2000, 20002),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(-234, -123),
			point(-12, -23),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(s1.getIntersection(s2), undefined);
		assert.strictEqual(s2.getIntersection(s1), undefined);
	});

	test('no intersection kinda close', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(0, 10),
			point(10, 0),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(s1.getIntersection(s2), undefined);
		assert.strictEqual(s2.getIntersection(s1), undefined);
	});

	test('no intersection with vertical touching bbox', () => {
		const s1 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */(undefined)
		);
		const s2 = Segment.fromRing(
			point(2, -5),
			point(2, 0),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(s1.getIntersection(s2), undefined);
		assert.strictEqual(s2.getIntersection(s1), undefined);
	});

	test('shared point 1 (endpoint)', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, 1),
			point(0, 0),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('shared point 2 (endpoint)', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, 1),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('T-crossing left endpoint', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0.5, 0.5),
			point(1, 0),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(0.5), y: new BigNumber(0.5) };
		assert.deepStrictEqual(toVector(a.getIntersection(b)), inter);
		assert.deepStrictEqual(toVector(b.getIntersection(a)), inter);
	});

	test('T-crossing right endpoint', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, 1),
			point(0.5, 0.5),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(0.5), y: new BigNumber(0.5) };
		assert.deepStrictEqual(toVector(a.getIntersection(b)), inter);
		assert.deepStrictEqual(toVector(b.getIntersection(a)), inter);
	});

	test('full overlap', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(10, 10),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(1, 1),
			point(5, 5),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(1), y: new BigNumber(1) };
		assert.deepStrictEqual(toVector(a.getIntersection(b)), inter);
		assert.deepStrictEqual(toVector(b.getIntersection(a)), inter);
	});

	test('shared point + overlap', () => {
		const a = Segment.fromRing(
			point(1, 1),
			point(10, 10),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(1, 1),
			point(5, 5),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(5), y: new BigNumber(5) };
		assert.deepStrictEqual(toVector(a.getIntersection(b)), inter);
		assert.deepStrictEqual(toVector(b.getIntersection(a)), inter);
	});

	test('mutual overlap', () => {
		const a = Segment.fromRing(
			point(3, 3),
			point(10, 10),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, 0),
			point(5, 5),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(3), y: new BigNumber(3) };
		assert.deepStrictEqual(toVector(a.getIntersection(b)), inter);
		assert.deepStrictEqual(toVector(b.getIntersection(a)), inter);
	});

	test('full overlap', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('full overlap, orientation', () => {
		const a = Segment.fromRing(
			point(1, 1),
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('colinear, shared point', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(1, 1),
			point(2, 2),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('colinear, shared other point', () => {
		const a = Segment.fromRing(
			point(1, 1),
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(1, 1),
			point(2, 2),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('colinear, one encloses other', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(1, 1),
			point(2, 2),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(1), y: new BigNumber(1) };
		assert.deepStrictEqual(toVector(a.getIntersection(b)), inter);
		assert.deepStrictEqual(toVector(b.getIntersection(a)), inter);
	});

	test('colinear, one encloses other 2', () => {
		const a = Segment.fromRing(
			point(4, 0),
			point(0, 4),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(3, 1),
			point(1, 3),
			/** @type {any} */(undefined)
		);

		const inter = { x: new BigNumber(1), y: new BigNumber(3) };
		assert.deepStrictEqual(toVector(a.getIntersection(b)), inter);
		assert.deepStrictEqual(toVector(b.getIntersection(a)), inter);
	});

	test('colinear, no overlap', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(2, 2),
			point(4, 4),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('parallel', () => {
		const a = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, -1),
			point(1, 0),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('parallel, orientation', () => {
		const a = Segment.fromRing(
			point(1, 1),
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, -1),
			point(1, 0),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('parallel, position', () => {
		const a = Segment.fromRing(
			point(0, -1),
			point(1, 0),
			/** @type {any} */(undefined)
		);
		const b = Segment.fromRing(
			point(0, 0),
			point(1, 1),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(a.getIntersection(b), undefined);
		assert.strictEqual(b.getIntersection(a), undefined);
	});

	test('endpoint intersections should be consistent - issue 60', () => {
		precision.set(Number.EPSILON);
		// If segment A T-intersects segment B, then the non-intersecting endpoint
		// of segment A should be irrelevant to the intersection of the two segs
		// From https://github.com/mfogel/polygon-clipping/issues/60
		const x = new BigNumber(-91.41360941065206);
		const y = new BigNumber(29.53135);
		const segA1 = Segment.fromRing(
			point(x, y),
			point(-91.4134943, 29.5310677),
			/** @type {any} */(undefined)
		);
		const segA2 = Segment.fromRing(
			point(x, y),
			point(-91.413, 29.5315),
			/** @type {any} */(undefined)
		);
		const segB = Segment.fromRing(
			point(-91.4137213, 29.5316244),
			point(-91.41352785864918, 29.53115),
			/** @type {any} */(undefined)
		);

		assert.deepStrictEqual(toVector(segA1.getIntersection(segB)), { x, y });
		assert.deepStrictEqual(toVector(segA2.getIntersection(segB)), { x, y });
		assert.deepStrictEqual(toVector(segB.getIntersection(segA1)), { x, y });
		assert.deepStrictEqual(toVector(segB.getIntersection(segA2)), { x, y });
		precision.set();
	});

	test('endpoint intersection takes priority - issue 60-5', () => {
		const endX = new BigNumber(55.31);
		const endY = new BigNumber(-0.23544126113);
		const segA = Segment.fromRing(
			point(18.60315316392773, 10.491431056669754),
			point(endX, endY),
			/** @type {any} */(undefined)
		);
		const segB = Segment.fromRing(
			point(-32.42, 55.26),
			point(endX, endY),
			/** @type {any} */(undefined)
		);

		assert.strictEqual(segA.getIntersection(segB), undefined);
		assert.strictEqual(segB.getIntersection(segA), undefined);
	});

	test('endpoint intersection between very short and very vertical segment', () => {
		const segA = Segment.fromRing(
			point(-10.000000000000004, 0),
			point(-9.999999999999995, 0),
			/** @type {any} */(undefined)
		);
		const segB = Segment.fromRing(
			point(-10.000000000000004, 0),
			point(-9.999999999999995, 1000),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(segA.getIntersection(segB), undefined);
		assert.strictEqual(segB.getIntersection(segA), undefined);
	});

	test('avoid intersection - issue 79', () => {
		const segA = Segment.fromRing(
			point(145.854148864746, -41.99816840491791),
			point(145.85421323776, -41.9981723915721),
			/** @type {any} */(undefined)
		);
		const segB = Segment.fromRing(
			point(145.854148864746, -41.998168404918),
			point(145.8543, -41.9982),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(segA.getIntersection(segB), undefined);
		assert.strictEqual(segB.getIntersection(segA), undefined);
	});
});

describe('compare segments', () => {
	describe('non intersecting', () => {
		test('not in same vertical space', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(1, 1),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(4, 3),
				point(6, 7),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('in same vertical space, earlier is below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, -4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(1, 1),
				point(6, 7),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('in same vertical space, later is below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, -4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-5, -5),
				point(6, -7),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('with left points in same vertical line', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, -1),
				point(-5, -5),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('with earlier right point directly under later left point', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-5, -5),
				point(0, -3),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('with eariler right point directly over earlier left point', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-5, 5),
				point(0, 3),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});
	});

	describe('intersecting not on endpoint', () => {
		test('earlier comes up from before & below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-1, -5),
				point(1, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('earlier comes up from directly over & below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, -2),
				point(3, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('earlier comes up from after & below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(1, -2),
				point(3, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('later comes down from before & above', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-1, 5),
				point(1, -2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('later comes up from directly over & above', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, 2),
				point(3, -2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('later comes up from after & above', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(1, 2),
				point(3, -2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('with a vertical', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(1, -2),
				point(1, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});
	});

	describe('intersect but not share on an endpoint', () => {
		test('intersect on right', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(2, -2),
				point(6, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('intersect on left from above', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-2, 2),
				point(2, -2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('intersect on left from below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-2, -2),
				point(2, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('intersect on left from vertical', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, -2),
				point(0, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});
	});

	describe('share right endpoint', () => {
		test('earlier comes up from before & below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-1, -5),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('earlier comes up from directly over & below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, -2),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('earlier comes up from after & below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(1, -2),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('later comes down from before & above', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-1, 5),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('laterjcomes up from directly over & above', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, 2),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});

		test('later comes up from after & above', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(1, 2),
				point(4, 0),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), -1);
			assert.strictEqual(Segment.compare(seg2, seg1), 1);
		});
	});

	describe('share left endpoint but not colinear', () => {
		test('earlier comes up from before & below', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, 0),
				point(4, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('one vertical, other not', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(0, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(0, 0),
				point(4, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('one segment thinks theyre colinear, but the other says no', () => {
			precision.set(Number.EPSILON);
			const seg1 = Segment.fromRing(
				point(-60.6876, -40.83428174062278),
				point(-60.6841701, -40.83491),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-60.6876, -40.83428174062278),
				point(-60.6874, -40.83431837489067),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
			precision.set();
		});
	});

	describe('colinear', () => {
		test('partial mutal overlap', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-1, -1),
				point(2, 2),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('complete overlap', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-1, -1),
				point(5, 5),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('right endpoints match', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			const seg2 = Segment.fromRing(
				point(-1, -1),
				point(4, 4),
				/** @type {any} */(undefined)
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);
		});

		test('left endpoints match - should be length', () => {
			const seg1 = Segment.fromRing(
				point(0, 0),
				point(4, 4),
				/** @type {any} */({ id: 1 })
			);
			const seg2 = Segment.fromRing(
				point(0, 0),
				point(3, 3),
				/** @type {any} */({ id: 2 })
			);
			const seg3 = Segment.fromRing(
				point(0, 0),
				point(5, 5),
				/** @type {any} */({ id: 3 })
			);
			assert.strictEqual(Segment.compare(seg1, seg2), 1);
			assert.strictEqual(Segment.compare(seg2, seg1), -1);

			assert.strictEqual(Segment.compare(seg2, seg3), -1);
			assert.strictEqual(Segment.compare(seg3, seg2), 1);

			assert.strictEqual(Segment.compare(seg1, seg3), -1);
			assert.strictEqual(Segment.compare(seg3, seg1), 1);
		});
	});

	test('exactly equal segments should be sorted by ring id', () => {
		const seg1 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */({ id: 1 })
		);
		const seg2 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */({ id: 2 })
		);
		assert.strictEqual(Segment.compare(seg1, seg2), -1);
		assert.strictEqual(Segment.compare(seg2, seg1), 1);
	});

	test('exactly equal segments (but not identical) are consistent', () => {
		const seg1 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */({ id: 1 })
		);
		const seg2 = Segment.fromRing(
			point(0, 0),
			point(4, 4),
			/** @type {any} */({ id: 1 })
		);
		const result = Segment.compare(seg1, seg2);
		assert.strictEqual(Segment.compare(seg1, seg2), result);
		assert.strictEqual(Segment.compare(seg2, seg1), result * -1);
	});

	test('segment consistency - from #60', () => {
		const seg1 = Segment.fromRing(
			point(-131.57153657554915, 55.01963125),
			point(-131.571478, 55.0187174),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(-131.57153657554915, 55.01963125),
			point(-131.57152375603846, 55.01943125),
			/** @type {any} */(undefined)
		);
		assert.strictEqual(Segment.compare(seg1, seg2), -1);
		assert.strictEqual(Segment.compare(seg2, seg1), 1);
	});

	test('ensure transitive - part of issue 60', () => {
		const seg2 = Segment.fromRing(
			point(-10.000000000000018, -9.17),
			point(-10.000000000000004, -8.79),
			/** @type {any} */(undefined)
		);
		const seg6 = Segment.fromRing(
			point(-10.000000000000016, 1.44),
			point(-9, 1.5),
			/** @type {any} */(undefined)
		);
		const seg4 = Segment.fromRing(
			point(-10.00000000000001, 1.75),
			point(-9, 1.5),
			/** @type {any} */(undefined)
		);

		assert.strictEqual(Segment.compare(seg2, seg6), -1);
		assert.strictEqual(Segment.compare(seg6, seg4), -1);
		assert.strictEqual(Segment.compare(seg2, seg4), -1);

		assert.strictEqual(Segment.compare(seg6, seg2), 1);
		assert.strictEqual(Segment.compare(seg4, seg6), 1);
		assert.strictEqual(Segment.compare(seg4, seg2), 1);
	});

	test('ensure transitive 2 - also part of issue 60', () => {
		const seg1 = Segment.fromRing(
			point(-10.000000000000002, 1.8181818181818183),
			point(-9.999999999999996, -3),
			/** @type {any} */(undefined)
		);
		const seg2 = Segment.fromRing(
			point(-10.000000000000002, 1.8181818181818183),
			point(0, 0),
			/** @type {any} */(undefined)
		);
		const seg3 = Segment.fromRing(
			point(-10.000000000000002, 1.8181818181818183),
			point(-10.000000000000002, 2),
			/** @type {any} */(undefined)
		);

		assert.strictEqual(Segment.compare(seg1, seg2), -1);
		assert.strictEqual(Segment.compare(seg2, seg3), -1);
		assert.strictEqual(Segment.compare(seg1, seg3), -1);

		assert.strictEqual(Segment.compare(seg2, seg1), 1);
		assert.strictEqual(Segment.compare(seg3, seg2), 1);
		assert.strictEqual(Segment.compare(seg3, seg1), 1);
	});
});

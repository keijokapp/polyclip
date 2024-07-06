// @ts-check

import assert from 'node:assert';
import Segment from './segment.js';
import { cosineOfAngle, sineOfAngle } from './vector.js';

/**
 * @typedef {import('./vector.js').Vector & { events: SweepEvent[] }} Point
 */

/**
 * @param {SweepEvent} event
 */
function assertConsistent(event) {
	try {
		assert.strictEqual(event.isLeft ? event.segment._leftSE : event.segment._rightSE, event);
		assert.strictEqual(event._consumedBy?.segment, event.segment._consumedBy);
	} catch (e) {
		console.log(e.stack);
		console.log(event.__consumedBySet);
		debugger;
		// throw e;
	}
}

export default class SweepEvent {
	/**
	 * for ordering sweep events in the sweep event queue
	 * @param {SweepEvent} a
	 * @param {SweepEvent} b
	 * @returns {number}
	 */
	static compare(a, b) {
		// favor event with a point that the sweep line hits first
		const ptCmp = SweepEvent.comparePoints(a.point, b.point);
		if (ptCmp !== 0) return ptCmp;

		// the points are the same, so link them if needed
		if (a.point !== b.point) {
			a.point.events.push(...b.point.events);
			b.point.events.forEach(evt => {
				evt.point = a.point;
			});
			a.checkForConsuming();
		}

		// favor right events over left
		if (a.isLeft !== b.isLeft) return a.isLeft ? 1 : -1;

		// we have two matching left or right endpoints
		// ordering of this case is the same as for their segments
		return Segment.compare(a.segment, b.segment);
	}

	/**
	 * for ordering points in sweep line order
	 * @param {import('./vector.js').Vector} aPt
	 * @param {import('./vector.js').Vector} bPt
	 * @returns {number}
	 */
	static comparePoints(aPt, bPt) {
		if (aPt.x.isLessThan(bPt.x)) return -1;
		if (aPt.x.isGreaterThan(bPt.x)) return 1;

		if (aPt.y.isLessThan(bPt.y)) return -1;
		if (aPt.y.isGreaterThan(bPt.y)) return 1;

		return 0;
	}

	/**
	 * Warning: 'point' input will be modified and re-used (for performance)
	 * @param {Point} point
	 * @param {boolean} isLeft
	 */
	constructor(point, isLeft) {
		point.events.push(this);

		/** @type {Point} */
		this.point = point;
		/** @type {boolean} */
		this.isLeft = isLeft;

		/** @type {SweepEvent | undefined} */
		this._consumedBy = undefined;

		/** @type {Segment} */
		this.segment = /** @type {any} */(undefined); // set by factor
		/** @type {SweepEvent} */
		this.otherSE = /** @type {any} */(undefined); // set by factor
	}

	/** @returns {SweepEvent | undefined} */
	get consumedBy() {
		assertConsistent(this);

		return this._consumedBy;
	}

	/** @type {SweepEvent} */
	set consumedBy(consumedBy) {
		this.__consumedBySet = new Error('Consumed by set').stack.split('\n').slice(2).map(l => l.slice(7)).join('\n');
		this._consumedBy = consumedBy;
	}

	/**
	 * Do a pass over our linked events and check to see if any pair
	 * of segments match, and should be consumed.
	 */
	checkForConsuming() {
		// FIXME: The loops in this method run O(n^2) => no good.
		//        Maintain little ordered sweep event trees?
		//        Can we maintaining an ordering that avoids the need
		//        for the re-sorting with getLeftmostComparator in geom-out?

		// Compare each pair of events to see if other events also match
		const numEvents = this.point.events.length;
		for (let i = 0; i < numEvents; i++) {
			const evt1 = this.point.events[i];
			if (evt1.segment.consumedBy != null) continue;
			for (let j = i + 1; j < numEvents; j++) {
				const evt2 = this.point.events[j];
				if (evt2.consumedBy != null) continue;
				if (evt1.otherSE.point.events !== evt2.otherSE.point.events) continue;
				consumeSegment(evt1.segment, evt2.segment);
			}
		}
	}

	/**
	 * Returns a comparator function for sorting linked events that will
	 * favor the event that will give us the smallest left-side angle.
	 * All ring construction starts as low as possible heading to the right,
	 * so by always turning left as sharp as possible we'll get polygons
	 * without uncessary loops & holes.
	 *
	 * The comparator function has a compute cache such that it avoids
	 * re-computing already-computed values.
	 * @param {SweepEvent} baseEvent
	 */
	getLeftmostComparator(baseEvent) {
		/**
		 * @type {Map<
		 *   SweepEvent,
		 *   { sine: import('bignumber.js').BigNumber, cosine: import('bignumber.js').BigNumber }
		 * >}
		 */
		const cache = new Map();

		/**
		 * @param {SweepEvent} linkedEvent
		 */
		const fillCache = linkedEvent => {
			const nextEvent = linkedEvent.otherSE;
			cache.set(linkedEvent, {
				sine: sineOfAngle(this.point, baseEvent.point, nextEvent.point),
				cosine: cosineOfAngle(this.point, baseEvent.point, nextEvent.point)
			});
		};

		return /** @param {SweepEvent} a @param {SweepEvent} b @returns {number} */(a, b) => {
			if (!cache.has(a)) fillCache(a);
			if (!cache.has(b)) fillCache(b);

			/**
			 * @type {{
			 *   sine: import('bignumber.js').BigNumber,
			 *   cosine: import('bignumber.js').BigNumber
			 * }}
			 */
			const { sine: asine, cosine: acosine } = /** @type {any} */(cache.get(a));
			/**
			 * @type {{
			 *   sine: import('bignumber.js').BigNumber,
			 *   cosine: import('bignumber.js').BigNumber
			 * }}
			 */
			const { sine: bsine, cosine: bcosine } = /** @type {any} */(cache.get(b));

			// both on or above x-axis
			if (asine.isGreaterThanOrEqualTo(0) && bsine.isGreaterThanOrEqualTo(0)) {
				if (acosine.isLessThan(bcosine)) return 1;
				if (acosine.isGreaterThan(bcosine)) return -1;

				return 0;
			}

			// both below x-axis
			if (asine.isLessThan(0) && bsine.isLessThan(0)) {
				if (acosine.isLessThan(bcosine)) return -1;
				if (acosine.isGreaterThan(bcosine)) return 1;

				return 0;
			}

			// one above x-axis, one below
			if (bsine.isLessThan(asine)) return -1;
			if (bsine.isGreaterThan(asine)) return 1;

			return 0;
		};
	}
}

/**
 * Consume another segment. We take their rings under our wing
 * and mark them as consumed. Use for perfectly overlapping segments
 * @param {Segment} consumer
 * @param {Segment} consumee
 */
function consumeSegment(consumer, consumee) {
	/** @type {Segment} */
	while (consumer.consumedBy) consumer = consumer.consumedBy;
	while (consumee.consumedBy) consumee = consumee.consumedBy;

	const cmp = Segment.compare(consumer, consumee);
	if (cmp === 0) return; // already consumed
	// the winner of the consumption is the earlier segment
	// according to sweep line ordering
	if (cmp > 0) {
		[consumer, consumee] = [consumee, consumer];
	}

	// make sure a segment doesn't consume it's prev
	if (consumer.prev === consumee) {
		[consumer, consumee] = [consumee, consumer];
	}

	for (let i = 0, iMax = consumee.rings.length; i < iMax; i++) {
		const ring = consumee.rings[i];
		const winding = consumee.windings[i];
		const index = consumer.rings.indexOf(ring);
		if (index === -1) {
			consumer.rings.push(ring);
			consumer.windings.push(winding);
		} else {
			consumer.windings[index] += winding;
		}
	}
	// TODO: setting these to `undefined` doesn't seem to be necessary
	consumee.rings = /** @type {any} */(undefined);
	consumee.windings = /** @type {any} */(undefined);

	// mark sweep events consumed as to maintain ordering in sweep event queue
	consumee._leftSE.consumedBy = consumer.leftSE;
	consumee._rightSE.consumedBy = consumer.rightSE;
	consumee.consumedBy = consumer;
}

// @ts-check

import Segment from './segment.js';
import { cosineOfAngle, sineOfAngle } from './vector.js';

/**
 * @typedef {import('./vector.js').Vector & { events: SweepEvent[] }} Point
 */

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

		if (ptCmp !== 0) {
			return ptCmp;
		}

		// the points are the same, so link them if needed
		if (a.point !== b.point) {
			a.point.events.push(...b.point.events);
			b.point.events.forEach(evt => {
				evt.point = a.point;
			});
			a.checkForConsuming();
		}

		// favor right events over left
		if (a.isLeft !== b.isLeft) {
			return a.isLeft ? 1 : -1;
		}

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
		if (aPt.x.isLessThan(bPt.x)) {
			return -1;
		}

		if (aPt.x.isGreaterThan(bPt.x)) {
			return 1;
		}

		if (aPt.y.isLessThan(bPt.y)) {
			return -1;
		}

		if (aPt.y.isGreaterThan(bPt.y)) {
			return 1;
		}

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
		this.consumedBy = undefined;

		/** @type {Segment} */
		this.segment = /** @type {any} */(undefined); // set by factor
		/** @type {SweepEvent} */
		this.otherSE = /** @type {any} */(undefined); // set by factor
	}

	/**
	 * @param {SweepEvent} other
	 */
	link(other) {
		if (other.point === this.point) {
			throw new Error('Tried to link already linked events');
		}

		const otherEvents = other.point.events;

		for (let i = 0, iMax = otherEvents.length; i < iMax; i++) {
			const evt = otherEvents[i];
			this.point.events.push(evt);
			evt.point = this.point;
		}

		this.checkForConsuming();
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

			if (evt1.segment.consumedBy != null) {
				continue;
			}

			for (let j = i + 1; j < numEvents; j++) {
				const evt2 = this.point.events[j];

				if (evt2.consumedBy != null) {
					continue;
				}

				if (evt1.otherSE.point.events !== evt2.otherSE.point.events) {
					continue;
				}

				evt1.segment.consume(evt2.segment);
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
			if (!cache.has(a)) {
				fillCache(a);
			}

			if (!cache.has(b)) {
				fillCache(b);
			}

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
				if (acosine.isLessThan(bcosine)) {
					return 1;
				}

				if (acosine.isGreaterThan(bcosine)) {
					return -1;
				}

				return 0;
			}

			// both below x-axis
			if (asine.isLessThan(0) && bsine.isLessThan(0)) {
				if (acosine.isLessThan(bcosine)) {
					return -1;
				}

				if (acosine.isGreaterThan(bcosine)) {
					return 1;
				}

				return 0;
			}

			// one above x-axis, one below
			if (bsine.isLessThan(asine)) {
				return -1;
			}

			if (bsine.isGreaterThan(asine)) {
				return 1;
			}

			return 0;
		};
	}
}

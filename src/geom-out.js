// @ts-check

import { precision } from './precision.js';
import SweepEvent from './sweep-event.js';

export class RingOut {
	/**
	 * Given the segments from the sweep line pass, compute & return a series
	 * of closed rings from all the segments marked to be part of the result
	 * @param {import('./segment.js').default[]} allSegments
	 * @returns {RingOut[]}
	 */
	static factory(allSegments) {
		const ringsOut = [];

		for (let i = 0, iMax = allSegments.length; i < iMax; i++) {
			const segment = allSegments[i];
			if (!segment.isInResult() || segment.ringOut != null) continue;

			/** @type {SweepEvent} */
			let prevEvent;
			let event = segment.leftSE;
			let nextEvent = segment.rightSE;
			const events = [event];

			const startingPoint = event.point;
			const intersectionLEs = [];

			/* Walk the chain of linked events to form a closed ring */
			for (;;) {
				prevEvent = event;
				event = nextEvent;
				events.push(event);

				/* Is the ring complete? */
				if (event.point === startingPoint) break;

				for (;;) {
					const availableLEs = event.getAvailableLinkedEvents();

					/* Did we hit a dead end? This shouldn't happen. Indicates some earlier
					 * part of the algorithm malfunctioned... please file a bug report. */
					if (availableLEs.length === 0) {
						const firstPt = events[0].point;
						const lastPt = events[events.length - 1].point;
						throw new Error(
							`Unable to complete output ring starting at [${firstPt.x},`
								+ ` ${firstPt.y}]. Last matching segment found ends at`
								+ ` [${lastPt.x}, ${lastPt.y}].`
						);
					}

					/* Only one way to go, so cotinue on the path */
					if (availableLEs.length === 1) {
						nextEvent = availableLEs[0].otherSE;
						break;
					}

					/* We must have an intersection. Check for a completed loop */
					/** @type {number | undefined} */
					let indexLE;
					for (let j = 0, jMax = intersectionLEs.length; j < jMax; j++) {
						if (intersectionLEs[j].point === event.point) {
							indexLE = j;
							break;
						}
					}
					/* Found a completed loop. Cut that off and make a ring */
					if (indexLE != null) {
						const intersectionLE = intersectionLEs.splice(indexLE)[0];
						const ringEvents = events.splice(intersectionLE.index);
						ringEvents.unshift(ringEvents[0].otherSE);
						ringsOut.push(new RingOut(ringEvents.reverse()));
						continue;
					}
					/* register the intersection */
					intersectionLEs.push({
						index: events.length,
						point: event.point
					});
					/* Choose the left-most option to continue the walk */
					const comparator = event.getLeftmostComparator(prevEvent);
					nextEvent = availableLEs.sort(comparator)[0].otherSE;
					break;
				}
			}

			ringsOut.push(new RingOut(events));
		}

		return ringsOut;
	}

	/**
	 * @param {SweepEvent[]} events
	 */
	constructor(events) {
		this.events = events;

		events.forEach(event => {
			event.segment.ringOut = this;
		});

		/** @type {PolyOut | undefined} */
		this.poly = undefined;
	}

	/** @returns {import('./geom-in.js').Ring | undefined} */
	getGeom() {
		// Remove superfluous points (ie extra points along a straight line),
		let prevPt = this.events[0].point;

		const points = [prevPt];

		for (let i = 1; i < this.events.length - 1; i++) {
			const pt = this.events[i].point;
			const nextPt = this.events[i + 1].point;
			if (precision.orient(pt, prevPt, nextPt) !== 0) {
				points.push(pt);
				prevPt = pt;
			}
		}

		// ring was all (within rounding error of angle calc) colinear points
		if (points.length === 1) {
			return;
		}

		// check if the starting point is necessary
		const pt = points[0];
		const nextPt = points[1];
		if (precision.orient(pt, prevPt, nextPt) === 0) {
			points.shift();
		}

		points.push(points[0]);

		const isExteriorRing = this.isExteriorRing();

		if (!isExteriorRing) {
			points.reverse();
		}

		return points.map(point => [point.x.toNumber(), point.y.toNumber()]);
	}

	/**
	 * @returns {boolean}
	 */
	isExteriorRing() {
		let i = 0;
		let enclosing = this.enclosingRing();

		while (enclosing) {
			enclosing = enclosing.enclosingRing();
			i++;
		}

		return (i % 2) === 0;
	}

	/**
	 * @returns {RingOut | undefined}
	 */
	enclosingRing() {
		if (this._enclosingRing === undefined) {
			/** @type {RingOut | null} */
			this._enclosingRing = this._calcEnclosingRing() ?? null;
		}

		return this._enclosingRing ?? undefined;
	}

	/**
	 * Returns the ring that encloses this one, if any
	 * @returns {RingOut | undefined}
	 */
	_calcEnclosingRing() {
		// start with the ealier sweep line event so that the prevSeg
		// chain doesn't lead us inside of a loop of ours
		/** @type {SweepEvent} */
		const leftMostEvt = this.events.reduce(
			(a, b) => SweepEvent.compare(a, b) > 0 ? b : a
		);

		/** @type {import('./segment.js').default | undefined} */
		let prevSeg = leftMostEvt.segment.prevInResult() ?? undefined;
		/** @type {import('./segment.js').default | undefined} */
		let prevPrevSeg = prevSeg?.prevInResult() ?? undefined;

		for (;;) {
			// no segment found, thus no ring can enclose us
			if (prevSeg == null) {
				return;
			}

			// no segments below prev segment found, thus the ring of the prev
			// segment must loop back around and enclose us
			if (prevPrevSeg == null) {
				return prevSeg.ringOut;
			}

			// if the two segments are of different rings, the ring of the prev
			// segment must either loop around us or the ring of the prev prev
			// seg, which would make us and the ring of the prev peers
			if (prevPrevSeg.ringOut !== prevSeg.ringOut) {
				if (prevSeg.ringOut === this) {
					return;
				}

				// @ts-ignore
				return prevPrevSeg.ringOut.enclosingRing() !== prevSeg.ringOut
					? prevSeg.ringOut
					// @ts-ignore
					: prevSeg.ringOut.enclosingRing();
			}

			// two segments are from the same ring, so this was a penisula
			// of that ring. iterate downward, keep searching
			prevSeg = prevPrevSeg.prevInResult() ?? undefined;
			prevPrevSeg = prevSeg?.prevInResult() ?? undefined;
		}
	}
}

export class PolyOut {
	/**
	 * @param {RingOut} exteriorRing
	 */
	constructor(exteriorRing) {
		/** @type {RingOut} */
		this.exteriorRing = exteriorRing;
		exteriorRing.poly = this;
		/** @type {RingOut[]} */
		this.interiorRings = [];
	}

	/**
	 * @param {RingOut} ring
	 */
	addInterior(ring) {
		this.interiorRings.push(ring);
		ring.poly = this;
	}

	/** @return {import('./geom-in.js').Ring[] | undefined} */
	getGeom() {
		const geom0 = this.exteriorRing.getGeom();

		// exterior ring was all (within rounding error of angle calc) colinear points
		if (geom0 == null) {
			return;
		}

		return [geom0].concat(
			this.interiorRings
				.map(ring => ring.getGeom())
				.filter(
					/**
					 * @param {import('./geom-in.js').Ring | undefined} geom
					 * @returns {geom is import('./geom-in.js').Ring}
					 */
					geom => geom != null
				)
		);
	}
}

export class MultiPolyOut {
	/**
	 * @param {RingOut[]} rings
	 */
	constructor(rings) {
		/** @type {RingOut[]} */
		this.rings = rings;
		/** @type {PolyOut[]} */
		this.polys = rings
			.map(ring => {
				if (ring.poly) {
					return;
				}

				if (ring.isExteriorRing()) {
					return new PolyOut(ring);
				}

				// FIXME: can enclosingRing really be nullish?
				const enclosingRing = ring.enclosingRing();
				const poly = !enclosingRing?.poly
					? new PolyOut(/** @type {RingOut} */(enclosingRing))
					: undefined;

				enclosingRing?.poly?.addInterior(ring);

				return poly;
			})
			.filter(
				/**
				 * @param {PolyOut | undefined} ring
				 * @returns {ring is PolyOut}
				 */
				ring => ring != null
			);
	}

	/** @returns {import('./geom-in.js').Poly[]} */
	getGeom() {
		return this.polys
			.map(poly => poly.getGeom())
			.filter(
				/**
				 * @param {import('./geom-in.js').Poly | undefined} polyGeom
				 * @returns {polyGeom is import('./geom-in.js').Poly}
				 */
				polyGeom => polyGeom != null
			);
	}
}

// @ts-check

import assert from 'assert';
import { precision } from './precision.js';
import SweepEvent from './sweep-event.js';

/**
 * @typedef {-1 | 0 | 1} Winding
 * @typedef {{
 *  rings: import('./geom-in.js').RingIn[],
 *  windings: Winding[],
 *  multiPolys: import('./geom-in.js').MultiPolyIn[]
 * }} State
 */

// Give segments unique ID's to get consistent sorting of
// segments and sweep events when all else is identical
let segmentId = 0;

/**
 * @param {Segment} segment
 */
function assertConsistent(segment) {
	try {
		assert(segment._leftSE.isLeft);
		assert(!segment._rightSE.isLeft);
		assert.strictEqual(segment._leftSE.segment, segment);
		assert.strictEqual(segment._rightSE.segment, segment);
		assert.strictEqual(segment._leftSE.otherSE, segment._rightSE);
		assert.strictEqual(segment._rightSE.otherSE, segment._leftSE);
		assert.strictEqual(segment._leftSE._consumedBy?.segment, segment._consumedBy);
		assert.strictEqual(segment._rightSE._consumedBy?.segment, segment._consumedBy);
	} catch (e) {
		console.log(e.stack);
		console.log(segment.__consumedBySet);
		debugger;
		// throw e;
	}
}

export default class Segment {
	/**
	 * This compare() function is for ordering segments in the sweep
	 * line tree, and does so according to the following criteria:
	 *
	 * Consider the vertical line that lies an infinestimal step to the
	 * right of the right-more of the two left endpoints of the input
	 * segments. Imagine slowly moving a point up from negative infinity
	 * in the increasing y direction. Which of the two segments will that
	 * point intersect first? That segment comes 'before' the other one.
	 *
	 * If neither segment would be intersected by such a line, (if one
	 * or more of the segments are vertical) then the line to be considered
	 * is directly on the right-more of the two left inputs.
	 * @param {Segment} a
	 * @param {Segment} b
	 * @returns {number}
	 */
	static compare(a, b) {
		const alx = a.leftSE.point.x;
		const blx = b.leftSE.point.x;
		const arx = a.rightSE.point.x;
		const brx = b.rightSE.point.x;

		// check if they're even in the same vertical plane
		if (brx.isLessThan(alx)) return 1;
		if (arx.isLessThan(blx)) return -1;

		const aly = a.leftSE.point.y;
		const bly = b.leftSE.point.y;
		const ary = a.rightSE.point.y;
		const bry = b.rightSE.point.y;

		// is left endpoint of segment B the right-more?
		if (alx.isLessThan(blx)) {
			// are the two segments in the same horizontal plane?
			if (bly.isLessThan(aly) && bly.isLessThan(ary)) return 1;
			if (bly.isGreaterThan(aly) && bly.isGreaterThan(ary)) return -1;

			// is the B left endpoint colinear to segment A?
			const aCmpBLeft = a.comparePoint(b.leftSE.point);
			if (aCmpBLeft < 0) return 1;
			if (aCmpBLeft > 0) return -1;

			// is the A right endpoint colinear to segment B ?
			const bCmpARight = b.comparePoint(a.rightSE.point);
			if (bCmpARight !== 0) return bCmpARight;

			// colinear segments, consider the one with left-more
			// left endpoint to be first (arbitrary?)
			return -1;
		}

		// is left endpoint of segment A the right-more?
		if (alx.isGreaterThan(blx)) {
			if (aly.isLessThan(bly) && aly.isLessThan(bry)) return -1;
			if (aly.isGreaterThan(bly) && aly.isGreaterThan(bry)) return 1;

			// is the A left endpoint colinear to segment B?
			const bCmpALeft = b.comparePoint(a.leftSE.point);
			if (bCmpALeft !== 0) return bCmpALeft;

			// is the B right endpoint colinear to segment A?
			const aCmpBRight = a.comparePoint(b.rightSE.point);
			if (aCmpBRight < 0) return 1;
			if (aCmpBRight > 0) return -1;

			// colinear segments, consider the one with left-more
			// left endpoint to be first (arbitrary?)
			return 1;
		}

		// if we get here, the two left endpoints are in the same
		// vertical plane, ie alx === blx

		// consider the lower left-endpoint to come first
		if (aly.isLessThan(bly)) return -1;
		if (aly.isGreaterThan(bly)) return 1;

		// left endpoints are identical
		// check for colinearity by using the left-more right endpoint

		// is the A right endpoint more left-more?
		if (arx.isLessThan(brx)) {
			const bCmpARight = b.comparePoint(a.rightSE.point);
			if (bCmpARight !== 0) return bCmpARight;
		}

		// is the B right endpoint more left-more?
		if (arx.isGreaterThan(brx)) {
			const aCmpBRight = a.comparePoint(b.rightSE.point);
			if (aCmpBRight < 0) return 1;
			if (aCmpBRight > 0) return -1;
		}

		if (!arx.eq(brx)) {
			// are these two [almost] vertical segments with opposite orientation?
			// if so, the one with the lower right endpoint comes first
			const ay = ary.minus(aly);
			const ax = arx.minus(alx);
			const by = bry.minus(bly);
			const bx = brx.minus(blx);
			if (ay.isGreaterThan(ax) && by.isLessThan(bx)) return 1;
			if (ay.isLessThan(ax) && by.isGreaterThan(bx)) return -1;
		}

		// we have colinear segments with matching orientation
		// consider the one with more left-more right endpoint to be first
		if (arx.isGreaterThan(brx)) return 1;
		if (arx.isLessThan(brx)) return -1;

		// if we get here, two two right endpoints are in the same
		// vertical plane, ie arx === brx

		// consider the lower right-endpoint to come first
		if (ary.isLessThan(bry)) return -1;
		if (ary.isGreaterThan(bry)) return 1;

		// right endpoints identical as well, so the segments are idential
		// fall back on creation order as consistent tie-breaker
		if (a.id < b.id) return -1;
		if (a.id > b.id) return 1;

		// identical segment, ie a === b
		return 0;
	}

	/**
	 * Warning: a reference to ringWindings input will be stored, and possibly will be later modified
	 * @param {SweepEvent} leftSE
	 * @param {SweepEvent} rightSE
	 * @param {import('./geom-in.js').RingIn[]} rings
	 * @param {Winding[]} windings
	 */
	constructor(leftSE, rightSE, rings, windings) {
		try {
			assert(leftSE.segment == null);
			assert(rightSE.segment == null);
			assert(leftSE.isLeft == null || leftSE.isLeft);
			assert(rightSE.isLeft == null || !rightSE.isLeft);
		} catch (e) {
			debugger;
			throw e;
		}

		this.id = ++segmentId;
		this._leftSE = leftSE;
		leftSE.isLeft = true;
		leftSE.segment = this;
		leftSE.otherSE = rightSE;
		this._rightSE = rightSE;
		rightSE.isLeft = false;
		rightSE.segment = this;
		rightSE.otherSE = leftSE;
		/** @type {import('./geom-in.js').RingIn[]} */
		this.rings = rings;
		/** @type {Winding[]} */
		this.windings = windings;

		/** @type {Segment | undefined} */
		this._consumedBy = undefined;
		/** @type {Segment | undefined} */
		this.prev = undefined;
		/** @type {State | undefined} */
		this._beforeState = undefined;
		/** @type {State | undefined} */
		this._afterState = undefined;
	}

	/** @returns {SweepEvent} */
	get leftSE() {
		// assertConsistent(this);

		return this._leftSE;
	}

	/** @type {SweepEvent} */
	set leftSE(leftSE) {
		this._leftSE = leftSE;
	}

	/** @returns {SweepEvent} */
	get rightSE() {
		// assertConsistent(this);

		return this._rightSE;
	}

	/** @type {SweepEvent} */
	set rightSE(rightSE) {
		this._rightSE = rightSE;
	}

	/** @returns {Segment | undefined} */
	get consumedBy() {
		assertConsistent(this);

		return this._consumedBy;
	}

	/** @type {Segment} */
	set consumedBy(consumedBy) {
		this.__consumedBySet = new Error('Consumed by set').stack.split('\n').slice(2).map((l) => l.slice(7)).join('\n');

		this._consumedBy = consumedBy;

		assertConsistent(this);
	}

	bbox() {
		const y1 = this.leftSE.point.y;
		const y2 = this.rightSE.point.y;

		return {
			ll: { x: this.leftSE.point.x, y: y1.isLessThan(y2) ? y1 : y2 },
			ur: { x: this.rightSE.point.x, y: y1.isGreaterThan(y2) ? y1 : y2 }
		};
	}

	/**
	 * A vector from the left point to the right
	 * @returns {import('./vector.js').Vector}
	 */
	vector() {
		return {
			x: this.rightSE.point.x.minus(this.leftSE.point.x),
			y: this.rightSE.point.y.minus(this.leftSE.point.y)
		};
	}

	/**
	 * @param {import('./vector.js').Vector} pt
	 * @returns {boolean}
	 */
	isAnEndpoint(pt) {
		return (pt.x.eq(this.leftSE.point.x) && pt.y.eq(this.leftSE.point.y))
			|| (pt.x.eq(this.rightSE.point.x) && pt.y.eq(this.rightSE.point.y));
	}

	/**
	 * Compare this segment with a point.
	 *
	 * A point P is considered to be colinear to a segment if there
	 * exists a distance D such that if we travel along the segment
	 * from one * endpoint towards the other a distance D, we find
	 * ourselves at point P.
	 *
	 * Return value indicates:
	 *
	 *   1: point lies above the segment (to the left of vertical)
	 *   0: point is colinear to segment
	 *  -1: point lies below the segment (to the right of vertical)
	 * @param {import('./vector.js').Vector} point
	 * @returns {number}
	 */
	comparePoint(point) {
		return precision.orient(this.leftSE.point, point, this.rightSE.point);
	}

	/**
	 * Split the given segment into multiple segments on the given points.
	 *  * Each existing segment will retain its leftSE and a new rightSE will be
	 *    generated for it.
	 *  * A new segment will be generated which will adopt the original segment's
	 *    rightSE, and a new leftSE will be generated for it.
	 *  * If there are more than two points given to split on, new segments
	 *    in the middle will be generated with new leftSE and rightSE's.
	 *  * An array of the newly generated SweepEvents will be returned.
	 *
	 * Warning: input array of points is modified
	 * @param {import('./vector.js').Vector | import('./sweep-event.js').Point} pointOrVector
	 * @returns {SweepEvent[]}
	 */
	split(pointOrVector) {
		const alreadyLinked = 'events' in pointOrVector;

		const point = 'events' in pointOrVector
			? pointOrVector
			: { ...pointOrVector, events: [] };

		const oldRightSE = this.rightSE;
		const newLeftSE = new SweepEvent(point, true);
		const newRightSE = new SweepEvent(point, false);

		newRightSE.segment = this;
		newRightSE.otherSE = this.leftSE;
		this.leftSE.otherSE = newRightSE;
		this.rightSE = newRightSE;

		oldRightSE.segment = undefined;
		const newSeg = new Segment(
			newLeftSE,
			oldRightSE,
			this.rings.slice(),
			this.windings.slice()
		);

		// when splitting a nearly vertical downward-facing segment,
		// sometimes one of the resulting new segments is vertical, in which
		// case its left and right events may need to be swapped
		if (SweepEvent.comparePoints(newSeg.leftSE.point, newSeg.rightSE.point) > 0) {
			newSeg.swapEvents();
		}
		if (SweepEvent.comparePoints(this.leftSE.point, this.rightSE.point) > 0) {
			this.swapEvents();
		}

		// in the point we just used to create new sweep events with was already
		// linked to other events, we need to check if either of the affected
		// segments should be consumed
		if (alreadyLinked) {
			newLeftSE.checkForConsuming();
			newRightSE.checkForConsuming();
		}

		return [newRightSE, newLeftSE];
	}

	/* Swap which event is left and right */
	swapEvents() {
		[this.rightSE, this.leftSE] = [this.leftSE, this.rightSE];
		this.leftSE.isLeft = true;
		this.rightSE.isLeft = false;
		for (let i = 0, iMax = this.windings.length; i < iMax; i++) {
			this.windings[i] *= -1;
		}
	}

	/**
	 * @returns {State}
	 */
	beforeState() {
		if (this._beforeState == null) {
			if (!this.prev) {
				this._beforeState = {
					rings: [],
					windings: [],
					multiPolys: []
				};
			} else {
				const seg = this.prev.consumedBy || this.prev;
				this._beforeState = seg.afterState();
			}
		}

		return this._beforeState;
	}

	/**
	 * @returns {State}
	 */
	afterState() {
		if (this._afterState != null) return this._afterState;

		const beforeState = this.beforeState();
		this._afterState = {
			rings: beforeState.rings.slice(0),
			windings: beforeState.windings.slice(0),
			multiPolys: []
		};
		const ringsAfter = this._afterState.rings;
		const windingsAfter = this._afterState.windings;
		const mpsAfter = this._afterState.multiPolys;

		// calculate ringsAfter, windingsAfter
		for (let i = 0, iMax = this.rings.length; i < iMax; i++) {
			const ring = this.rings[i];
			const winding = this.windings[i];
			const index = ringsAfter.indexOf(ring);
			if (index === -1) {
				ringsAfter.push(ring);
				windingsAfter.push(winding);
			} else windingsAfter[index] += winding;
		}

		// calcualte polysAfter
		const polysAfter = [];
		const polysExclude = [];
		for (let i = 0, iMax = ringsAfter.length; i < iMax; i++) {
			if (windingsAfter[i] === 0) continue; // non-zero rule
			const ring = ringsAfter[i];
			const { poly } = ring;
			if (polysExclude.indexOf(poly) !== -1) continue;
			if (ring.isExterior) polysAfter.push(poly);
			else {
				if (polysExclude.indexOf(poly) === -1) polysExclude.push(poly);
				const index = polysAfter.indexOf(ring.poly);
				if (index !== -1) polysAfter.splice(index, 1);
			}
		}

		// calculate multiPolysAfter
		for (let i = 0, iMax = polysAfter.length; i < iMax; i++) {
			const mp = polysAfter[i].multiPoly;
			if (mpsAfter.indexOf(mp) === -1) mpsAfter.push(mp);
		}

		return this._afterState;
	}
}

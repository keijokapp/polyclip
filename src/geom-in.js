// @ts-check

import BigNumber from 'bignumber.js';
import { precision } from './precision.js';
import Segment from './segment.js';

/**
 * @typedef {[number, number][]} Ring
 * @typedef {Ring[]} Poly
 * @typedef {Poly[]} MultiPoly
 * @typedef {Poly | MultiPoly} Geom
 */

export class RingIn {
	/**
	 * @param {Ring} geomRing
	 * @param {PolyIn} poly
	 * @param {boolean} isExterior
	 */
	constructor(geomRing, poly, isExterior) {
		if (!Array.isArray(geomRing) || geomRing.length === 0) {
			throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
		}

		/** @type {PolyIn} */
		this.poly = poly;

		/** @type {Boolean} */
		this.isExterior = isExterior;

		/** @type {Segment[]} */
		this.segments = [];

		if (
			typeof geomRing[0][0] !== 'number'
			|| typeof geomRing[0][1] !== 'number'
		) {
			throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
		}

		const firstPoint = /** @type {import('./sweep-event.js').Point} */(
			precision.snap({ x: new BigNumber(geomRing[0][0]), y: new BigNumber(geomRing[0][1]) })
		);

		/** @type {import('./bbox.js').Bbox} */
		this.bbox = {
			ll: { x: firstPoint.x, y: firstPoint.y },
			ur: { x: firstPoint.x, y: firstPoint.y }
		};

		let prevPoint = firstPoint;
		for (let i = 1, iMax = geomRing.length; i < iMax; i++) {
			if (
				typeof geomRing[i][0] !== 'number'
				|| typeof geomRing[i][1] !== 'number'
			) {
				throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
			}

			const point = /** @type {import('./sweep-event.js').Point} */(
				precision.snap({ x: new BigNumber(geomRing[i][0]), y: new BigNumber(geomRing[i][1]) })
			);

			// skip repeated points
			if (point.x.eq(prevPoint.x) && point.y.eq(prevPoint.y)) continue;

			this.segments.push(Segment.fromRing(prevPoint, point, this));

			if (point.x.isLessThan(this.bbox.ll.x)) this.bbox.ll.x = point.x;
			if (point.y.isLessThan(this.bbox.ll.y)) this.bbox.ll.y = point.y;
			if (point.x.isGreaterThan(this.bbox.ur.x)) this.bbox.ur.x = point.x;
			if (point.y.isGreaterThan(this.bbox.ur.y)) this.bbox.ur.y = point.y;

			prevPoint = point;
		}

		// add segment from last to first if last is not the same as first
		if (!firstPoint.x.eq(prevPoint.x) || !firstPoint.y.eq(prevPoint.y)) {
			this.segments.push(Segment.fromRing(prevPoint, firstPoint, this));
		}
	}

	getSweepEvents() {
		return this.segments.flatMap(segment => [segment.leftSE, segment.rightSE]);
	}
}

export class PolyIn {
	/**
	 * @param {Poly} geomPoly
	 * @param {MultiPolyIn} multiPoly
	 */
	constructor(geomPoly, multiPoly) {
		if (!Array.isArray(geomPoly)) {
			throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
		}

		/** @type {RingIn} */
		this.exteriorRing = new RingIn(geomPoly[0], this, true);

		/** @type {import('./bbox.js').Bbox} */
		this.bbox = {
			ll: { x: this.exteriorRing.bbox.ll.x, y: this.exteriorRing.bbox.ll.y },
			ur: { x: this.exteriorRing.bbox.ur.x, y: this.exteriorRing.bbox.ur.y }
		};

		/** @type {RingIn[]} */
		this.interiorRings = [];

		for (let i = 1; i < geomPoly.length; i++) {
			const ring = new RingIn(geomPoly[i], this, false);

			if (ring.bbox.ll.x.isLessThan(this.bbox.ll.x)) this.bbox.ll.x = ring.bbox.ll.x;
			if (ring.bbox.ll.y.isLessThan(this.bbox.ll.y)) this.bbox.ll.y = ring.bbox.ll.y;
			if (ring.bbox.ur.x.isGreaterThan(this.bbox.ur.x)) this.bbox.ur.x = ring.bbox.ur.x;
			if (ring.bbox.ur.y.isGreaterThan(this.bbox.ur.y)) this.bbox.ur.y = ring.bbox.ur.y;

			this.interiorRings.push(ring);
		}

		/** @type {MultiPolyIn} */
		this.multiPoly = multiPoly;
	}

	getSweepEvents() {
		return this.exteriorRing.getSweepEvents()
			.concat(this.interiorRings.flatMap(ring => ring.getSweepEvents()));
	}
}

export class MultiPolyIn {
	/**
	 * @param {Geom} geom
	 * @param {boolean} isSubject
	 */
	constructor(geom, isSubject) {
		if (!Array.isArray(geom)) {
			throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
		}

		try {
			// if the input looks like a polygon, convert it to a multipolygon
			if (typeof geom[0][0][0] === 'number') {
				geom = [/** @type {Poly} */(geom)];
			}
		} catch (ex) {
			// The input is either malformed or has empty arrays.
			// In either case, it will be handled later on.
		}

		/** @type {import('./bbox.js').Bbox} */
		this.bbox = {
			ll: {
				x: new BigNumber(Number.POSITIVE_INFINITY),
				y: new BigNumber(Number.POSITIVE_INFINITY)
			},
			ur: {
				x: new BigNumber(Number.NEGATIVE_INFINITY),
				y: new BigNumber(Number.NEGATIVE_INFINITY)
			}
		};

		/** @type {PolyIn[]} */
		this.polys = geom.map(geom => {
			const poly = new PolyIn(/** @type {Poly} */(geom), this);

			if (poly.bbox.ll.x.isLessThan(this.bbox.ll.x)) this.bbox.ll.x = poly.bbox.ll.x;
			if (poly.bbox.ll.y.isLessThan(this.bbox.ll.y)) this.bbox.ll.y = poly.bbox.ll.y;
			if (poly.bbox.ur.x.isGreaterThan(this.bbox.ur.x)) this.bbox.ur.x = poly.bbox.ur.x;
			if (poly.bbox.ur.y.isGreaterThan(this.bbox.ur.y)) this.bbox.ur.y = poly.bbox.ur.y;

			return poly;
		});

		/** @type {boolean} */
		this.isSubject = isSubject;
	}

	getSweepEvents() {
		return this.polys.flatMap(poly => poly.getSweepEvents());
	}
}

// @ts-check

import BigNumber from 'bignumber.js';
import { precision } from './precision.js';
import Segment from './segment.js';

/**
 * @typedef {{
 *   poly: PolyIn,
 *   isExterior: boolean,
 *   segments: Segment[]
 * }} RingIn
 * @typedef {{
 *   multiPoly: MultiPolyIn,
 *   rings: RingIn[]
 * }} PolyIn
 * @typedef {{
 *   polys: PolyIn[],
 *   isSubject: boolean
 * }} MultiPolyIn
 */

/**
 * @param {import('polyclip').MultiPolygon<import('./vector.js').Vector>} mulitpolygon
 * @param {boolean} isSubject
 * @returns {MultiPolyIn}
 */
export function createInputPolygon(mulitpolygon, isSubject) {
	/** @type {MultiPolyIn} */
	const multipoly = /** @type {any} */({ isSubject });

	multipoly.polys = mulitpolygon.map(polygon => {
		/** @type {PolyIn} */
		const polyin = /** @type {any} */({
			multiPoly: multipoly
		});

		polyin.rings = polygon.map((ring, i) => {
			/** @type {RingIn} */
			const ringin = {
				poly: polyin,
				isExterior: i === 0,
				segments: []
			};

			const firstPoint = ring[0];

			let prevPoint = firstPoint;
			for (let i = 1, iMax = ring.length; i < iMax; i++) {
				const point = ring[i];

				// skip repeated points
				if (!point.x.eq(prevPoint.x) || !point.y.eq(prevPoint.y)) {
					ringin.segments.push(Segment.fromRing(
						/** @type {import('./sweep-event.js').Point} */(prevPoint),
						/** @type {import('./sweep-event.js').Point} */(point),
						ringin
					));

					prevPoint = point;
				}
			}

			// add segment from last to first if last is not the same as first
			if (!firstPoint.x.eq(prevPoint.x) || !firstPoint.y.eq(prevPoint.y)) {
				ringin.segments.push(Segment.fromRing(
					/** @type {import('./sweep-event.js').Point} */(prevPoint),
					/** @type {import('./sweep-event.js').Point} */(firstPoint),
					ringin
				));
			}

			return ringin;
		});

		return polyin;
	});

	return multipoly;
}

/**
 * @param {import('polyclip').Geom<[number, number]>} geom
 * @returns {import('polyclip').MultiPolygon<import('./vector.js').Vector>}
 */
export function normalizePolygon(geom) {
	if (!Array.isArray(geom)) {
		throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
	}

	try {
		// if the input looks like a polygon, convert it to a multipolygon
		if (typeof geom[0][0][0] === 'number') {
			geom = [/** @type {import('polyclip').Polygon} */(geom)];
		}
	} catch (ex) {
		// The input is either malformed or has empty arrays.
		// In either case, it will be handled later on.
	}

	if (!Array.isArray(geom)) {
		throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
	}

	return /** @type {import('polyclip').MultiPolygon} */(geom).map(polygon => {
		if (!Array.isArray(polygon) || polygon.length === 0) {
			throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
		}

		return polygon.map(ring => {
			if (!Array.isArray(ring) || ring.length === 0) {
				throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
			}

			return ring.map(point => {
				if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
					throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
				}

				return precision.snap({
					x: new BigNumber(point[0]),
					y: new BigNumber(point[1])
				});
			});
		});
	});
}

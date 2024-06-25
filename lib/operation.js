// @ts-check

import { BigNumber } from 'bignumber.js';
import { getBboxOverlap } from './bbox.js';
import { createInputPolygon, normalizePolygon } from './geom-in.js';
import renderMultipolygon from './geom-out.js';
import { precision } from './precision.js';
import sweepLine from './sweep-line.js';

/**
 * @typedef {'union' | 'difference' | 'intersection' | 'xor'} OperationType
 */

/**
 * @type {Record<
 *   OperationType,
 *   (multipolygonCount: number) => (
 *     before: import('./geom-in.js').MultiPolyIn[],
 *     after: import('./geom-in.js').MultiPolyIn[]
 *   ) => boolean
 * >}
 */
const selectors = {
	union() {
		// UNION - included iff:
		//  * On one side of us there is 0 poly interiors AND
		//  * On the other side there is 1 or more.
		return (mpsBefore, mpsAfter) => (mpsBefore.length === 0) !== (mpsAfter.length === 0);
	},
	intersection(multipolygonCount) {
		// INTERSECTION - included iff:
		//  * on one side of us all multipolys are rep. with poly interiors AND
		//  * on the other side of us, not all multipolys are repsented
		//    with poly interiors
		return (mpsBefore, mpsAfter) => {
			let least;
			let most;
			if (mpsBefore.length < mpsAfter.length) {
				least = mpsBefore.length;
				most = mpsAfter.length;
			} else {
				least = mpsAfter.length;
				most = mpsBefore.length;
			}

			return most === multipolygonCount && least < most;
		};
	},
	xor() {
		// XOR - included iff:
		//  * the difference between the number of multipolys represented
		//    with poly interiors on our two sides is an odd number
		return (mpsBefore, mpsAfter) => Math.abs(mpsBefore.length - mpsAfter.length) % 2 === 1;
	},
	difference() {
		// DIFFERENCE included iff:
		//  * on exactly one side, we have just the subject
		return (before, after) => (before.length === 1 && before[0].isSubject)
			!== (after.length === 1 && after[0].isSubject);
	}
};

/**
 * @param {OperationType} type
 * @param {import('polyclip').Geometry[]} geometries
 * @returns {import('polyclip').MultiPolygon}
 */
export default function runOperation(type, geometries) {
	const multipolygons = geometries.map(geometry => normalizePolygon(geometry));

	/* BBox optimization for difference operation
	 * If the bbox of a multipolygon that's part of the clipping doesn't
	 * intersect the bbox of the subject at all, we can just drop that
	 * multiploygon. */
	if (type === 'difference') {
		// in place removal
		const subjectBbox = getBoundingBox(multipolygons[0]);
		let i = 1;
		while (i < multipolygons.length) {
			if (getBboxOverlap(getBoundingBox(multipolygons[i]), subjectBbox) != null) i++;
			else multipolygons.splice(i, 1);
		}
	}

	/* BBox optimization for intersection operation
	 * If we can find any pair of multipolygons whose bbox does not overlap,
	 * then the result will be empty. */
	if (type === 'intersection') {
		const boundingBoxes = multipolygons.map(multipolygon => getBoundingBox(multipolygon));
		// TODO: this is O(n^2) in number of polygons. By sorting the bboxes,
		//       it could be optimized to O(n * ln(n))
		for (let i = 0; i < boundingBoxes.length; i++) {
			const boundingBox = boundingBoxes[i];
			for (let j = i + 1; j < boundingBoxes.length; j++) {
				if (getBboxOverlap(boundingBox, boundingBoxes[j]) == null) {
					return [];
				}
			}
		}
	}

	/* Convert inputs to MultiPoly objects */
	const multipolys = multipolygons.map(
		(multipolygon, i) => createInputPolygon(multipolygon, i === 0)
	);

	/* Pass the sweep line over those endpoints */
	const segments = sweepLine(multipolys);

	// free some memory we don't need anymore
	precision.reset();

	const selector = selectors[type](multipolys.length);

	// const segments = multipolys
	// 	.flatMap(({ polys }) => polys)
	// 	.flatMap(({ rings }) => rings)
	// 	.flatMap(({ segments }) => segments);

	return renderMultipolygon(segments, selector);
}

/**
 * @param {import('polyclip').MultiPolygon<import('./vector.js').Vector>} mulitpolygon
 * @returns {import('./bbox.js').Bbox}
 */
function getBoundingBox(mulitpolygon) {
	const xcoords = mulitpolygon.flat(2).map(({ x }) => x);
	const ycoords = mulitpolygon.flat(2).map(({ y }) => y);

	return {
		ll: {
			x: BigNumber.min(...xcoords),
			y: BigNumber.min(...ycoords)
		},
		ur: {
			x: BigNumber.max(...xcoords),
			y: BigNumber.max(...ycoords)
		}
	};
}

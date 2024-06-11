// @ts-check

import BigNumber from 'bignumber.js';
import { getBboxOverlap } from './bbox.js';
import { createInputPolygon, normalizePolygon } from './geom-in.js';
import renderMultipolygon from './geom-out.js';
import { precision } from './precision.js';
import sweepLine from './sweep-line.js';

/**
 * @typedef {'union' | 'difference' | 'intersection' | 'xor'} OperationType
 */

/**
 * @param {OperationType} type
 * @param {import('polyclip').Geometry[]} geoms
 * @returns {import('polyclip').MultiPolygon}
 */
export default function runOperation(type, geoms) {
	const multipolygons = geoms.map(geom => normalizePolygon(geom));

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

	return renderMultipolygon(segments, type, multipolys.length);
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

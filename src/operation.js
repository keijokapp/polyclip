// @ts-check

import { getBboxOverlap } from './bbox.js';
import * as geomIn from './geom-in.js';
import renderMultipolygon from './geom-out.js';
import { precision } from './precision.js';
import sweepLine from './sweep-line.js';

/**
 * @typedef {'union' | 'difference' | 'intersection' | 'xor'} OperationType
 */

/**
 * @param {OperationType} type
 * @param {import('polyclip').Geom} geom
 * @param {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').MultiPolygon}
 */
export default function runOperation(type, geom, moreGeoms) {
	/* Convert inputs to MultiPoly objects */
	const multipolys = [new geomIn.MultiPolyIn(geom, true)];
	for (let i = 0, iMax = moreGeoms.length; i < iMax; i++) {
		multipolys.push(new geomIn.MultiPolyIn(moreGeoms[i], false));
	}

	/* BBox optimization for difference operation
	 * If the bbox of a multipolygon that's part of the clipping doesn't
	 * intersect the bbox of the subject at all, we can just drop that
	 * multiploygon. */
	if (type === 'difference') {
		// in place removal
		const subject = multipolys[0];
		let i = 1;
		while (i < multipolys.length) {
			if (getBboxOverlap(multipolys[i].bbox, subject.bbox) != null) i++;
			else multipolys.splice(i, 1);
		}
	}

	/* BBox optimization for intersection operation
	 * If we can find any pair of multipolygons whose bbox does not overlap,
	 * then the result will be empty. */
	if (type === 'intersection') {
		// TODO: this is O(n^2) in number of polygons. By sorting the bboxes,
		//       it could be optimized to O(n * ln(n))
		for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
			const mpA = multipolys[i];
			for (let j = i + 1, jMax = multipolys.length; j < jMax; j++) {
				if (getBboxOverlap(mpA.bbox, multipolys[j].bbox) == null) return [];
			}
		}
	}

	/* Pass the sweep line over those endpoints */
	const segments = sweepLine(multipolys);

	// free some memory we don't need anymore
	precision.reset();

	return renderMultipolygon(segments, type, multipolys.length);
}

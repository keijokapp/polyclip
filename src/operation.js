// @ts-check

import { SplayTreeSet } from 'splaytree-ts';
import { getBboxOverlap } from './bbox.js';
import * as geomIn from './geom-in.js';
import * as geomOut from './geom-out.js';
import { precision } from './precision.js';
import SweepEvent from './sweep-event.js';
import SweepLine from './sweep-line.js';

/** @type {string} */
let currentOperationType;

/** @type {number} */
let currentOprationMultiPolyCount;

export function getCurrentOperationType() {
	return currentOperationType;
}

export function getCurrentOperationMultiPolyCount() {
	return currentOprationMultiPolyCount;
}

/**
 * @param {string} type
 * @param {import('./geom-in.js').Geom} geom
 * @param {import('./geom-in.js').Geom[]} moreGeoms
 * @returns {import('./geom-in.js').MultiPoly}
 */
export function runOperation(type, geom, moreGeoms) {
	currentOperationType = type;

	/* Convert inputs to MultiPoly objects */
	const multipolys = [new geomIn.MultiPolyIn(geom, true)];
	for (let i = 0, iMax = moreGeoms.length; i < iMax; i++) {
		multipolys.push(new geomIn.MultiPolyIn(moreGeoms[i], false));
	}

	currentOprationMultiPolyCount = multipolys.length;

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

	/* Put segment endpoints in a priority queue */
	const queue = new SplayTreeSet(SweepEvent.compare);
	for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
		const sweepEvents = multipolys[i].getSweepEvents();
		for (let j = 0, jMax = sweepEvents.length; j < jMax; j++) {
			queue.add(sweepEvents[j]);
		}
	}

	/* Pass the sweep line over those endpoints */
	const sweepLine = new SweepLine(queue);
	let evt = null;
	if (queue.size !== 0) {
		evt = queue.first();
		queue.delete(evt);
	}
	while (evt) {
		const newEvents = sweepLine.process(evt);
		for (let i = 0, iMax = newEvents.length; i < iMax; i++) {
			const evt = newEvents[i];
			if (evt.consumedBy === undefined) queue.add(evt);
		}
		if (queue.size !== 0) {
			evt = queue.first();
			queue.delete(evt);
		} else {
			evt = null;
		}
	}

	// free some memory we don't need anymore
	precision.reset();

	/* Collect and compile segments we're keeping into a multipolygon */
	const ringsOut = geomOut.RingOut.factory(sweepLine.segments);
	const result = new geomOut.MultiPolyOut(ringsOut);

	return result.getGeom();
}

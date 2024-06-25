// @ts-check

// @ts-ignore
import { SplayTreeSet } from 'splaytree-ts';
import { getBboxOverlap, isInBbox } from './bbox.js';
import { precision } from './precision.js';
import Segment from './segment.js';
import SweepEvent from './sweep-event.js';
import { intersection } from './vector.js';

/**
 * NOTE:  We must be careful not to change any segments while
 *        they are in the SplayTree. AFAIK, there's no way to tell
 *        the tree to rebalance itself - thus before splitting
 *        a segment that's in the tree, we remove it from the tree,
 *        do the split, then re-insert it. (Even though splitting a
 *        segment *shouldn't* change its correct position in the
 *        sweep line tree, the reality is because of rounding errors,
 *        it sometimes does.)
 */

/**
 * @typedef {{
 *   queue: SplayTreeSet<SweepEvent>,
 *   segments: Segment[],
 *   tree: SplayTreeSet<Segment>
 * }} Context
 */

/**
 * @param {SweepEvent} event
 * @param {Context} context
 * @returns {SweepEvent[]}
 */
function process(event, context) {
	const { queue, tree, segments } = context;
	const { segment } = event;

	if (event.isLeft) tree.add(segment);

	/** @type {Segment | undefined} */
	let prevSeg = segment;
	/** @type {Segment | undefined} */
	let nextSeg = segment;

	// skip consumed segments still in tree
	do {
		prevSeg = tree.lastBefore(prevSeg) ?? undefined;
	} while (prevSeg != null && prevSeg.consumedBy != null);

	// skip consumed segments still in tree
	do {
		nextSeg = tree.firstAfter(nextSeg) ?? undefined;
	} while (nextSeg != null && nextSeg.consumedBy != null);

	/** @type {SweepEvent[]} */
	const newEvents = [];

	if (event.isLeft) {
		// Check for intersections against the previous segment in the sweep line
		let prevMySplitter;
		if (prevSeg) {
			const prevInter = getIntersection(prevSeg, segment);
			if (prevInter != null) {
				if (!segment.isAnEndpoint(prevInter)) prevMySplitter = prevInter;
				if (!prevSeg.isAnEndpoint(prevInter)) {
					newEvents.push(...splitSafely(prevSeg, prevInter, context));
				}
			}
		}

		// Check for intersections against the next segment in the sweep line
		let nextMySplitter;
		if (nextSeg) {
			const nextInter = getIntersection(nextSeg, segment);
			if (nextInter != null) {
				if (!segment.isAnEndpoint(nextInter)) nextMySplitter = nextInter;
				if (!nextSeg.isAnEndpoint(nextInter)) {
					newEvents.push(...splitSafely(nextSeg, nextInter, context));
				}
			}
		}

		// For simplicity, even if we find more than one intersection we only
		// spilt on the 'earliest' (sweep-line style) of the intersections.
		// The other intersection will be handled in a future process().
		const mySplitter = prevMySplitter != null && (nextMySplitter == null
			|| SweepEvent.comparePoints(prevMySplitter, nextMySplitter) <= 0)
			? prevMySplitter
			: nextMySplitter;

		if (mySplitter != null) {
			// Rounding errors can cause changes in ordering,
			// so remove afected segments and right sweep events before splitting
			queue.delete(segment.rightSE);
			newEvents.push(segment.rightSE, ...segment.split(mySplitter));
		}

		if (newEvents.length > 0) {
			// We found some intersections, so re-do the current event to
			// make sure sweep line ordering is totally consistent for later
			// use with the segment 'prev' pointers
			tree.delete(segment);
			newEvents.push(event);
		} else {
			// done with left event
			segments.push(segment);
			segment.prev = prevSeg;
		}
	} else {
		// event.isRight

		// since we're about to be removed from the sweep line, check for
		// intersections between our previous and next segments
		if (prevSeg && nextSeg) {
			const inter = getIntersection(prevSeg, nextSeg);
			if (inter != null) {
				if (!prevSeg.isAnEndpoint(inter)) {
					newEvents.push(...splitSafely(prevSeg, inter, context));
				}
				if (!nextSeg.isAnEndpoint(inter)) {
					newEvents.push(...splitSafely(nextSeg, inter, context));
				}
			}
		}

		tree.delete(segment);
	}

	return newEvents;
}

/**
 * Safely split a segment that is currently in the datastructures
 * IE - a segment other than the one that is currently being processed.
 * @param {Segment} segment
 * @param {import('./sweep-event.js').Point | import('./vector.js').Vector} point
 * @param {Context} context
 * @returns {SweepEvent[]}
 */
function splitSafely(segment, point, { tree, queue }) {
	// Rounding errors can cause changes in ordering,
	// so remove afected segments and right sweep events before splitting
	// removeNode() doesn't work, so have re-find the seg
	// https://github.com/w8r/splay-tree/pull/5
	tree.delete(segment);
	const { rightSE } = segment;
	queue.delete(rightSE);
	const newEvents = segment.split(point);
	newEvents.push(rightSE);

	// splitting can trigger consumption
	if (segment.consumedBy == null) {
		tree.add(segment);
	}

	return newEvents;
}

/**
 * Given another segment, returns the first non-trivial intersection
 * between the two segments (in terms of sweep line ordering), if it exists.
 *
 * A 'non-trivial' intersection is one that will cause one or both of the
 * segments to be split(). As such, 'trivial' vs. 'non-trivial' intersection:
 *
 *   * endpoint of segA with endpoint of segB --> trivial
 *   * endpoint of segA with point along segB --> non-trivial
 *   * endpoint of segB with point along segA --> non-trivial
 *   * point along segA with point along segB --> non-trivial
 *
 * @param {Segment} segment1
 * @param {Segment} segment2
 * @returns {import('./vector.js').Vector | undefined}
 */
function getIntersection(segment1, segment2) {
	// If bboxes don't overlap, there can't be any intersections
	const tBbox = segment1.bbox();
	const oBbox = segment2.bbox();
	const bboxOverlap = getBboxOverlap(tBbox, oBbox);
	if (bboxOverlap == null) return;

	// We first check to see if the endpoints can be considered intersections.
	// This will 'snap' intersections to endpoints if possible, and will
	// handle cases of colinearity.

	const tlp = segment1.leftSE.point;
	const trp = segment1.rightSE.point;
	const olp = segment2.leftSE.point;
	const orp = segment2.rightSE.point;

	// does each endpoint touch the other segment?
	// note that we restrict the 'touching' definition to only allow segments
	// to touch endpoints that lie forward from where we are in the sweep line pass
	const touchesOtherLSE = isInBbox(tBbox, olp) && segment1.comparePoint(olp) === 0;
	const touchesThisLSE = isInBbox(oBbox, tlp) && segment2.comparePoint(tlp) === 0;
	const touchesOtherRSE = isInBbox(tBbox, orp) && segment1.comparePoint(orp) === 0;
	const touchesThisRSE = isInBbox(oBbox, trp) && segment2.comparePoint(trp) === 0;

	// do left endpoints match?
	if (touchesThisLSE && touchesOtherLSE) {
		// these two cases are for colinear segments with matching left
		// endpoints, and one segment being longer than the other
		if (touchesThisRSE && !touchesOtherRSE) return trp;
		if (!touchesThisRSE && touchesOtherRSE) return orp;

		// either the two segments match exactly (two trival intersections)
		// or just on their left endpoint (one trivial intersection
		return;
	}

	// does this left endpoint matches (other doesn't)
	if (touchesThisLSE) {
		// check for segments that just intersect on opposing endpoints
		if (touchesOtherRSE) {
			if (tlp.x.eq(orp.x) && tlp.y.eq(orp.y)) return;
		}

		// t-intersection on left endpoint
		return tlp;
	}

	// does other left endpoint matches (this doesn't)
	if (touchesOtherLSE) {
		// check for segments that just intersect on opposing endpoints
		if (touchesThisRSE) {
			if (trp.x.eq(olp.x) && trp.y.eq(olp.y)) return;
		}

		// t-intersection on left endpoint
		return olp;
	}

	// trivial intersection on right endpoints
	if (touchesThisRSE && touchesOtherRSE) return;

	// t-intersections on just one right endpoint
	if (touchesThisRSE) return trp;
	if (touchesOtherRSE) return orp;

	// None of our endpoints intersect. Look for a general intersection between
	// infinite lines laid over the segments
	const pt = intersection(tlp, segment1.vector(), olp, segment2.vector());

	// are the segments parrallel? Note that if they were colinear with overlap,
	// they would have an endpoint intersection and that case was already handled above
	if (pt == null) return;

	// is the intersection found between the lines not on the segments?
	if (!isInBbox(bboxOverlap, pt)) return;

	// round the the computed point if needed
	return precision.snap(pt);
}

/**
 * @param {import('./geom-in.js').MultiPolyIn[]} multipolys
 * @returns {Segment[]}
 */
export default function sweepLine(multipolys) {
	/** @type {Context} */
	const context = {
		queue: new SplayTreeSet(SweepEvent.compare),
		segments: [],
		tree: new SplayTreeSet(Segment.compare)
	};

	const { queue, segments, tree } = context;

	queue.addAll(
		multipolys
			.flatMap(multipoly => multipoly.polys)
			.flatMap(poly => poly.rings)
			.flatMap(ring => ring.segments)
			.flatMap(segment => [segment.leftSE, segment.rightSE])
	);

	// console.log('points    :',
	// 	multipolys
	// 		.flatMap(multipoly => multipoly.polys)
	// 		.flatMap(poly => poly.rings)
	// 		.flatMap(ring => ring.segments)
	// 		.flatMap(segment => [segment.leftSE, segment.rightSE])
	// 		.map(({ point }) => `${point.x.toFixed(3)}:${point.y.toFixed(3)}`.padStart(12))
	// 		.join(' ')
	// );

	while (queue.size !== 0) {
		// console.log('tree  (%s):', tree.size.toString().padStart(2), [...tree.values()].map(({ id }) => `${id}`.padStart(12)).join(' '));
		// console.log('queue (%s):', queue.size.toString().padStart(2), [...queue.values()].map(({ point }) => `${point.x.toFixed(3)}:${point.y.toFixed(3)}`.padStart(12)).join(' '));
		const event = queue.first();
		queue.delete(event);

		// if we've already been consumed by another segment,
		// clean up our body parts and get out
		if (event.consumedBy) {
			if (event.isLeft) queue.delete(event.otherSE);
			else tree.delete(event.segment);
		} else {
			const newEvents = process(event, context);

			// if (newEvents.length) {
			// 	// console.log('Point:', event.point.x.toNumber(), event.point.y.toNumber())
			// 	console.log('new events:', newEvents.map(({ point }) => `${point.x.toNumber().toFixed(3)}:${point.y.toNumber().toFixed(3)}`.padStart(12)).join(' '));
			// }

			queue.addAll(newEvents.filter(({ consumedBy }) => consumedBy == null));
		}
	}

	return segments;
}

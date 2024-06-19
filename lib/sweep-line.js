// @ts-check

// @ts-ignore
import { SplayTreeSet } from 'splaytree-ts';
import Segment from './segment.js';
import SweepEvent from './sweep-event.js';

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

	/** @type {SweepEvent[]} */
	const newEvents = [];

	// if we've already been consumed by another segment,
	// clean up our body parts and get out
	if (event.consumedBy) {
		if (event.isLeft) queue.delete(event.otherSE);
		else tree.delete(segment);

		return newEvents;
	}

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

	if (event.isLeft) {
		// Check for intersections against the previous segment in the sweep line
		let prevMySplitter;
		if (prevSeg) {
			const prevInter = prevSeg.getIntersection(segment);
			if (prevInter != null) {
				if (!segment.isAnEndpoint(prevInter)) prevMySplitter = prevInter;
				if (!prevSeg.isAnEndpoint(prevInter)) {
					const newEventsFromSplit = splitSafely(prevSeg, prevInter, context);
					for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
						newEvents.push(newEventsFromSplit[i]);
					}
				}
			}
		}

		// Check for intersections against the next segment in the sweep line
		let nextMySplitter;
		if (nextSeg) {
			const nextInter = nextSeg.getIntersection(segment);
			if (nextInter != null) {
				if (!segment.isAnEndpoint(nextInter)) nextMySplitter = nextInter;
				if (!nextSeg.isAnEndpoint(nextInter)) {
					const newEventsFromSplit = splitSafely(nextSeg, nextInter, context);
					for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
						newEvents.push(newEventsFromSplit[i]);
					}
				}
			}
		}

		// For simplicity, even if we find more than one intersection we only
		// spilt on the 'earliest' (sweep-line style) of the intersections.
		// The other intersection will be handled in a future process().
		if (prevMySplitter != null || nextMySplitter != null) {
			let mySplitter;
			if (prevMySplitter == null) mySplitter = nextMySplitter;
			else if (nextMySplitter == null) mySplitter = prevMySplitter;
			else {
				const cmpSplitters = SweepEvent.comparePoints(
					prevMySplitter,
					nextMySplitter
				);
				mySplitter = cmpSplitters <= 0 ? prevMySplitter : nextMySplitter;
			}

			// Rounding errors can cause changes in ordering,
			// so remove afected segments and right sweep events before splitting
			queue.delete(segment.rightSE);
			newEvents.push(segment.rightSE);

			const newEventsFromSplit = segment.split(/** @type {import('./sweep-event.js').Point} */(
				mySplitter
			));
			for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
				newEvents.push(newEventsFromSplit[i]);
			}
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
			const inter = prevSeg.getIntersection(nextSeg);
			if (inter != null) {
				if (!prevSeg.isAnEndpoint(inter)) {
					const newEventsFromSplit = splitSafely(prevSeg, inter, context);
					for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
						newEvents.push(newEventsFromSplit[i]);
					}
				}
				if (!nextSeg.isAnEndpoint(inter)) {
					const newEventsFromSplit = splitSafely(nextSeg, inter, context);
					for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
						newEvents.push(newEventsFromSplit[i]);
					}
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

	const { queue } = context;

	queue.addAll(multipolys.flatMap(multipoly => multipoly.polys.flatMap(
		poly => poly.rings
			.flatMap(ring => ring.segments)
			.flatMap(segment => [segment.leftSE, segment.rightSE])
	)));

	while (queue.size !== 0) {
		const evt = queue.first();
		queue.delete(evt);

		const newEvents = process(evt, context);

		newEvents.forEach(event => {
			if (event.consumedBy == null) {
				queue.add(event);
			}
		});
	}

	return context.segments;
}

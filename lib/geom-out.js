// @ts-check

import { precision } from './precision.js';
import SweepEvent from './sweep-event.js';

/**
 * @typedef {import('./segment.js').default} Segment
 * @typedef {{
 *   enclosingRings: Map<SweepEvent[], SweepEvent[] | undefined>,
 *   isInResultSegments: Map<Segment, boolean>,
 *   prevInResultSegments: Map<Segment, Segment | undefined>,
 *   segmentRings: Map<Segment, SweepEvent[]>,
 *   selector: (
 *     before: import('./geom-in.js').MultiPolyIn[],
 *     after: import('./geom-in.js').MultiPolyIn[]
 *   ) => boolean
 * }} Context
 */

/**
 * Given the segments from the sweep line pass, compute & return a series
 * of closed rings from all the segments marked to be part of the result
 * @param {Segment[]} segments
 * @param {Context} context
 * @returns {SweepEvent[][]}
 */
function segmentsToRings(segments, context) {
	const { segmentRings } = context;

	return segments.flatMap(segment => {
		if (!isInResult(segment, context) || segmentRings.has(segment)) {
			return [];
		}

		/** @type {SweepEvent} */
		let prevEvent;
		let event = segment.leftSE;
		let nextEvent = segment.rightSE;
		const events = [event];

		const startingPoint = event.point;
		const intersectionLEs = [];

		/** @type {SweepEvent[][]} */
		const ringsOut = [];

		/** @param {SweepEvent[]} events */
		function addRing(events) {
			ringsOut.push(events);

			events.forEach(event => {
				segmentRings.set(event.segment, events);
			});
		}

		/* Walk the chain of linked events to form a closed ring */
		for (;;) {
			prevEvent = event;
			event = nextEvent;
			events.push(event);

			/* Is the ring complete? */
			if (event.point === startingPoint) break;

			for (;;) {
				const availableLEs = event.point.events.filter(
					// eslint-disable-next-line no-loop-func
					evt => evt !== event
						&& !segmentRings.has(evt.segment)
						&& isInResult(evt.segment, context)
				);

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
				const indexLE = intersectionLEs.findIndex(
					// eslint-disable-next-line no-loop-func
					intersectionLE => intersectionLE.point === event.point
				);

				/* Found a completed loop. Cut that off and make a ring */
				if (indexLE !== -1) {
					const intersectionLE = intersectionLEs.splice(indexLE)[0];
					const ringEvents = events.splice(intersectionLE.index);
					ringEvents.unshift(ringEvents[0].otherSE);
					ringEvents.reverse();

					addRing(ringEvents);

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

		addRing(events);

		return ringsOut;
	});
}

/**
 * The first segment previous segment chain that is in the result
 * @param {Segment} segment
 * @param {Context} context
 * @returns {Segment | undefined}
 */
function prevInResult(segment, context) {
	const { prevInResultSegments } = context;

	if (prevInResultSegments.has(segment)) {
		return prevInResultSegments.get(segment);
	}

	let result;

	if (segment.prev) {
		if (isInResult(segment.prev, context)) {
			result = segment.prev;
		} else {
			result = prevInResult(segment.prev, context);
		}
	}

	prevInResultSegments.set(segment, result);

	return result;
}

/**
 * Is this segment part of the final result?
 * @param {Segment} segment
 * @param {import('./geom-out.js').Context} context
 * @returns {boolean}
 */
function isInResult(segment, { selector, isInResultSegments }) {
	// if we've been consumed, we're not in the result
	if (segment.consumedBy != null) return false;

	if (isInResultSegments.has(segment)) {
		return /** @type {boolean} */(isInResultSegments.get(segment));
	}

	const mpsBefore = segment.beforeState().multiPolys;
	const mpsAfter = segment.afterState().multiPolys;

	const isInResult = selector(mpsBefore, mpsAfter);

	isInResultSegments.set(segment, isInResult);

	return isInResult;
}

/**
 * @param {SweepEvent[]} events
 * @param {Context} context
 * @returns {SweepEvent[] | undefined}
 */
function enclosingRing(events, context) {
	const { enclosingRings } = context;

	if (!enclosingRings.has(events)) {
		const enclosingRing = calcEnclosingRing(events, context);

		enclosingRings.set(events, enclosingRing);

		return enclosingRing;
	}

	return enclosingRings.get(events);
}

/**
 * @param {SweepEvent[]} events
 * @param {Context} context
 * @returns {SweepEvent[] | undefined}
 */
function calcEnclosingRing(events, context) {
	const { segmentRings } = context;

	// start with the ealier sweep line event so that the prevSeg
	// chain doesn't lead us inside of a loop of ours
	/** @type {SweepEvent} */
	const leftMostEvt = events.reduce(
		(a, b) => SweepEvent.compare(a, b) > 0 ? b : a
	);

	let prevSeg = prevInResult(leftMostEvt.segment, context);
	let prevPrevSeg = prevSeg != null ? prevInResult(prevSeg, context) : undefined;

	for (;;) {
		// no segment found, thus no ring can enclose us
		if (prevSeg == null) {
			return;
		}

		// no segments below prev segment found, thus the ring of the prev
		// segment must loop back around and enclose us
		if (prevPrevSeg == null) {
			return segmentRings.get(prevSeg);
		}

		// if the two segments are of different rings, the ring of the prev
		// segment must either loop around us or the ring of the prev prev
		// seg, which would make us and the ring of the prev peers
		if (segmentRings.get(prevPrevSeg) !== segmentRings.get(prevSeg)) {
			if (segmentRings.get(prevSeg) === events) {
				throw new Error('shit');
			}

			const prevPrevSegRing = /** @type {SweepEvent[]} */(segmentRings.get(prevPrevSeg));
			const prevSegRing = /** @type {SweepEvent[]} */(segmentRings.get(prevSeg));

			return enclosingRing(prevPrevSegRing, context) !== prevSegRing
				? segmentRings.get(prevSeg)
				: enclosingRing(prevSegRing, context);
		}

		// two segments are from the same ring, so this was a penisula
		// of that ring. iterate downward, keep searching
		prevSeg = prevInResult(prevPrevSeg, context);
		prevPrevSeg = prevSeg != null ? prevInResult(prevSeg, context) : undefined;
	}
}

/**
 * @param {SweepEvent[]} events
 * @param {Context} context
 * @returns {boolean}
 */
function isExteriorRing(events, context) {
	let i = 0;
	let enclosing = enclosingRing(events, context);

	while (enclosing) {
		enclosing = enclosingRing(enclosing, context);
		i++;
	}

	return (i % 2) === 0;
}

/**
 * @param {SweepEvent[]} events
 * @param {Context} context
 * @returns {[number, number][] | undefined}
 */
function renderRing(events, context) {
	// Remove superfluous points (ie extra points along a straight line),
	let prevPt = events[0].point;

	const points = [prevPt];

	for (let i = 1; i < events.length - 1; i++) {
		const pt = events[i].point;
		const nextPt = events[i + 1].point;
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

	const isExterior = isExteriorRing(events, context);

	if (!isExterior) {
		points.reverse();
	}

	return points.map(point => [point.x.toNumber(), point.y.toNumber()]);
}

/**
 * @param {Segment[]} segments
 * @param {(
 *   before: import('./geom-in.js').MultiPolyIn[],
 *   after: import('./geom-in.js').MultiPolyIn[]
 * ) => boolean} selector
 * @returns {import('polyclip').MultiPolygon}
 */
export default function renderMultipolygon(segments, selector) {
	/** @type {Context} */
	const context = {
		enclosingRings: new Map(),
		isInResultSegments: new Map(),
		prevInResultSegments: new Map(),
		segmentRings: new Map(),
		selector
	};

	/** @type {Map<SweepEvent[], Array<[number, number][] | undefined>>} */
	const polygons = new Map();

	return segmentsToRings(segments, context)
		.map(ring => {
			if (polygons.has(ring)) {
				return;
			}

			if (isExteriorRing(ring, context)) {
				const poly = [renderRing(ring, context)];

				polygons.set(ring, poly);

				return poly;
			}

			const enclosing = /** @type {SweepEvent[]} */(
				enclosingRing(ring, context)
			);
			const poly = polygons.get(enclosing);

			if (poly == null) {
				const poly = [
					renderRing(enclosing, context),
					renderRing(ring, context)
				];

				polygons.set(enclosing, poly);
				polygons.set(ring, poly);

				return poly;
			}

			polygons.set(ring, poly);
			poly.push(renderRing(ring, context));
		})
		.map(polygon => {
			if (polygon?.[0] != null) {
				return polygon.filter(
					/**
					 * @param {import('polyclip').Ring | undefined} ring
					 * @returns {ring is import('polyclip').Ring}
					 */
					ring => ring != null
				);
			}
		})
		.filter(
			/**
			 * @param {import('polyclip').Polygon | undefined} polygon
			 * @returns {polygon is import('polyclip').Polygon}
			 */
			polygon => polygon != null
		);
}

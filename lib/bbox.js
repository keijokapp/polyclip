// @ts-check

/**
 * @typedef {{
 *   ll: import('./vector.js').Vector,
 *   ur: import('./vector.js').Vector
 * }} Bbox
 */

/**
 * @param {Bbox} bbox
 * @param {import('./vector.js').Vector} point
 * @returns {boolean}
 */
export function isInBbox(bbox, point) {
	return bbox.ll.x.isLessThanOrEqualTo(point.x)
		&& point.x.isLessThanOrEqualTo(bbox.ur.x)
		&& bbox.ll.y.isLessThanOrEqualTo(point.y)
		&& point.y.isLessThanOrEqualTo(bbox.ur.y);
}

/**
 * @param {Bbox} b1
 * @param {Bbox} b2
 * @returns {Bbox | undefined}
 */
export function getBboxOverlap(b1, b2) {
	if (
		b1.ll.x.isLessThanOrEqualTo(b2.ur.x)
		&& b2.ll.x.isLessThanOrEqualTo(b1.ur.x)
		&& b1.ll.y.isLessThanOrEqualTo(b2.ur.y)
		&& b2.ll.y.isLessThanOrEqualTo(b1.ur.y)
	) {
		const lowerX = b1.ll.x.isLessThan(b2.ll.x) ? b2.ll.x : b1.ll.x;
		const upperX = b1.ur.x.isLessThan(b2.ur.x) ? b1.ur.x : b2.ur.x;

		const lowerY = b1.ll.y.isLessThan(b2.ll.y) ? b2.ll.y : b1.ll.y;
		const upperY = b1.ur.y.isLessThan(b2.ur.y) ? b1.ur.y : b2.ur.y;

		return { ll: { x: lowerX, y: lowerY }, ur: { x: upperX, y: upperY } };
	}
}

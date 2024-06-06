// @ts-check

/**
 * @param {number} [eps]
 * @returns {(
 *   a: import('./vector.js').Vector,
 *   b: import('./vector.js').Vector,
 *   c: import('./vector.js').Vector
 * ) => number}
 */
export default function (eps) {
	// eslint-disable-next-line max-len
	return /** @param {import('./vector.js').Vector} a @param {import('./vector.js').Vector} b @param {import('./vector.js').Vector} c */(a, b, c) => {
		const ax = a.x
		const ay = a.y
		const cx = c.x
		const cy = c.y

		const area2 = ay.minus(cy).times(b.x.minus(cx)).minus(ax.minus(cx).times(b.y.minus(cy)))

		if (eps
			&& area2
				.exponentiatedBy(2)
				.isLessThanOrEqualTo(cx.minus(ax).exponentiatedBy(2).plus(cy.minus(ay).exponentiatedBy(2)).times(eps))
		) {
			return 0
		}

		return area2.comparedTo(0)
	}
}

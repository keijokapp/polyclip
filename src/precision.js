// @ts-check

import BigNumber from "bignumber.js"
import { SplayTreeSet } from "splaytree-ts"

/**
 * @param {number} [eps]
 */
const set = eps => ({
	set: /** @param {number} [eps] */eps => { precision = set(eps) },
	reset: () => set(eps),
	compare: compare(eps),
	snap: snap(eps),
	orient: orient(eps)
})

export let precision = set()

/**
 * @param {number} [eps]
 * @returns {(
 *   a: import('./vector.js').Vector,
 *   b: import('./vector.js').Vector,
 *   c: import('./vector.js').Vector
 * ) => number}
 */
function orient(eps) {
	/**
	 * @param {import('./vector.js').Vector} a
	 * @param {import('./vector.js').Vector} b
	 * @param {import('./vector.js').Vector} c
	 * @returns {number}
	 */
	return (a, b, c) => {
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


/**
 * @template T
 * @param {T} a
 * @returns {T}
 */
function identity(a) {
	return a
}

/**
 * @param {number} [eps]
 */
function snap(eps) {
	if (eps) {
		const xTree = new SplayTreeSet(compare(eps))
		const yTree = new SplayTreeSet(compare(eps))

		/**
		 * @param {import('./vector.js').Vector} v
		 * @returns {import('./vector.js').Vector}
		 */
		const snap = v => ({
			x: xTree.addAndReturn(v.x),
			y: yTree.addAndReturn(v.y)
		});

		snap({ x: new BigNumber(0), y: new BigNumber(0)})

		return snap
	}

	return identity
}

/**
 * @param {number} [eps]
 */
function compare(eps) {
	/**
	 * @param {import('bignumber.js').BigNumber} a
	 * @param {import('bignumber.js').BigNumber} b
	 */
	return (a, b) => {
		if (eps && b.minus(a).abs().isLessThanOrEqualTo(eps)) return 0

		return a.comparedTo(b)
	}
}

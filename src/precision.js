// @ts-check

import compare from "./compare.js"
import orient from "./orient.js"
import snap from "./snap.js"

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

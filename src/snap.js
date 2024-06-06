// @ts-check

import BigNumber from "bignumber.js"
import { SplayTreeSet } from "splaytree-ts"
import compare from "./compare.js"

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
export default function(eps) {
  if (eps) {
    const xTree = new SplayTreeSet(compare(eps))
    const yTree = new SplayTreeSet(compare(eps))

    /**
     * @param {BigNumber} coord
     * @param {SplayTreeSet<BigNumber>} tree
     * @returns {BigNumber}
     */
    const snapCoord = (coord, tree) => {
      return tree.addAndReturn(coord)
    }

    /**
     * @param {import('./vector.js').Vector} v
     * @returns {import('./vector.js').Vector}
     */
    const snap = v => ({
      x: snapCoord(v.x, xTree),
      y: snapCoord(v.y, yTree)
    })

    snap({ x: new BigNumber(0), y: new BigNumber(0)})

    return snap
  }

  return identity
}

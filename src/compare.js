// @ts-check

/**
 * @param {number} [eps]
 */
export default function (eps) {
    /**
     * @param {import('bignumber.js').BigNumber} a
     * @param {import('bignumber.js').BigNumber} b
     */
    return (a, b) => {
        if (eps && b.minus(a).abs().isLessThanOrEqualTo(eps)) return 0

        return a.comparedTo(b)
    }
}

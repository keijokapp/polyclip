// @ts-check

import { precision } from "./precision.js"
import operation from "./operation.js"

/**
 * @param {import('polyclip').Geom} geom
 * @param  {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function union(geom, ...moreGeoms) {
	return operation.run("union", geom, moreGeoms)
}

/**
 * @param {import('polyclip').Geom} geom
 * @param  {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function intersection(geom, ...moreGeoms) {
	return operation.run("intersection", geom, moreGeoms)
}

/**
 * @param {import('polyclip').Geom} geom
 * @param  {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function xor(geom, ...moreGeoms) {
	return operation.run("xor", geom, moreGeoms)
}

/**
 * @param {import('polyclip').Geom} geom
 * @param  {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function difference(geom, ...moreGeoms) {
	return operation.run("difference", geom, moreGeoms)
}

export const setPrecision = precision.set

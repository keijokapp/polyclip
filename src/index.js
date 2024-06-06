// @ts-check

import { precision } from "./precision.js"
import operation from "./operation.js"

/**
 * @param {import('polygon-clipping').Geom} geom
 * @param  {import('polygon-clipping').Geom[]} moreGeoms
 * @returns {import('polygon-clipping').Geom}
 */
export function union(geom, ...moreGeoms) {
	return operation.run("union", geom, moreGeoms)
}

/**
 * @param {import('polygon-clipping').Geom} geom
 * @param  {import('polygon-clipping').Geom[]} moreGeoms
 * @returns {import('polygon-clipping').Geom}
 */
export function intersection(geom, ...moreGeoms) {
	return operation.run("intersection", geom, moreGeoms)
}

/**
 * @param {import('polygon-clipping').Geom} geom
 * @param  {import('polygon-clipping').Geom[]} moreGeoms
 * @returns {import('polygon-clipping').Geom}
 */
export function xor(geom, ...moreGeoms) {
	return operation.run("xor", geom, moreGeoms)
}

/**
 * @param {import('polygon-clipping').Geom} geom
 * @param  {import('polygon-clipping').Geom[]} moreGeoms
 * @returns {import('polygon-clipping').Geom}
 */
export function difference(geom, ...moreGeoms) {
	return operation.run("difference", geom, moreGeoms)
}

export const setPrecision = precision.set

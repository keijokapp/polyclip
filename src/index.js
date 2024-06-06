// @ts-check

import { runOperation } from './operation.js';
import { precision } from './precision.js';

/**
 * @param {import('polyclip').Geom} geom
 * @param {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function union(geom, ...moreGeoms) {
	return runOperation('union', geom, moreGeoms);
}

/**
 * @param {import('polyclip').Geom} geom
 * @param {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function intersection(geom, ...moreGeoms) {
	return runOperation('intersection', geom, moreGeoms);
}

/**
 * @param {import('polyclip').Geom} geom
 * @param {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function xor(geom, ...moreGeoms) {
	return runOperation('xor', geom, moreGeoms);
}

/**
 * @param {import('polyclip').Geom} geom
 * @param {import('polyclip').Geom[]} moreGeoms
 * @returns {import('polyclip').Geom}
 */
export function difference(geom, ...moreGeoms) {
	return runOperation('difference', geom, moreGeoms);
}

export const setPrecision = precision.set;

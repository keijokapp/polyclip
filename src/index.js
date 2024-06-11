// @ts-check

import runOperation from './operation.js';
import { precision } from './precision.js';

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geoms
 * @returns {import('polyclip').MultiPolygon}
 */
export function union(...geoms) {
	return runOperation('union', geoms);
}

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geoms
 * @returns {import('polyclip').MultiPolygon}
 */
export function intersection(...geoms) {
	return runOperation('intersection', geoms);
}

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geoms
 * @returns {import('polyclip').MultiPolygon}
 */
export function xor(...geoms) {
	return runOperation('xor', geoms);
}

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geoms
 * @returns {import('polyclip').MultiPolygon}
 */
export function difference(...geoms) {
	return runOperation('difference', geoms);
}

export const setPrecision = precision.set;

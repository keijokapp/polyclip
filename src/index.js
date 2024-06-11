// @ts-check

import runOperation from './operation.js';
import { precision } from './precision.js';

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geometries
 * @returns {import('polyclip').MultiPolygon}
 */
export function union(...geometries) {
	return runOperation('union', geometries);
}

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geometries
 * @returns {import('polyclip').MultiPolygon}
 */
export function intersection(...geometries) {
	return runOperation('intersection', geometries);
}

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geometries
 * @returns {import('polyclip').MultiPolygon}
 */
export function xor(...geometries) {
	return runOperation('xor', geometries);
}

/**
 * @param {[import('polyclip').Geometry, ...import('polyclip').Geometry[]]} geometries
 * @returns {import('polyclip').MultiPolygon}
 */
export function difference(...geometries) {
	return runOperation('difference', geometries);
}

export const setPrecision = precision.set;

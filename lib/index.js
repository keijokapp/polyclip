// @ts-check

import runOperation from './operation.js';
import { precision } from './precision.js';

/**
 * @typedef {[number, number]} Pair
 */
/**
 * @template [C=Pair]
 * @typedef {C[]} Ring
 */
/**
 * @template [C=Pair]
 * @typedef {Ring<C>[]} Polygon
 */
/**
 * @template [C=Pair]
 * @typedef {Polygon<C>[]} MultiPolygon
 */
/**
 * @template [C=Pair]
 * @typedef {Polygon<C> | MultiPolygon<C>} Geometry
 */

/**
 * @param {[Geometry, ...Geometry[]]} geometries
 * @returns {MultiPolygon}
 */
export function union(...geometries) {
	return runOperation('union', geometries);
}

/**
 * @param {[Geometry, ...Geometry[]]} geometries
 * @returns {MultiPolygon}
 */
export function intersection(...geometries) {
	return runOperation('intersection', geometries);
}

/**
 * @param {[Geometry, ...Geometry[]]} geometries
 * @returns {MultiPolygon}
 */
export function xor(...geometries) {
	return runOperation('xor', geometries);
}

/**
 * @param {[Geometry, ...Geometry[]]} geometries
 * @returns {MultiPolygon}
 */
export function difference(...geometries) {
	return runOperation('difference', geometries);
}

export const setPrecision = precision.set;

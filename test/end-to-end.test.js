// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as polyclip from '../lib/index.js';

const directoryName = path.dirname(url.fileURLToPath(import.meta.url));

/** USE ME TO RUN ONLY ONE TEST * */
const targetOnly = '';
const opOnly = '';

/** USE ME TO SKIP TESTS * */
/** @type {string[]} */
const targetsSkip = [];
/** @type {string[]} */
const opsSkip = [];

const endToEndDir = path.join(directoryName, 'end-to-end');

describe('end to end', () => {
	const targets = fs.readdirSync(endToEndDir);

	targets.forEach(target => {
		// ignore dotfiles like .DS_Store
		if (target.startsWith('.')) return;

		describe(target, () => {
			const targetDir = path.join(endToEndDir, target);
			/** @type {{features: {geometry: {coordinates: import('../lib/index.js').Geometry}}[]}} */
			const argsGeojson = JSON.parse(fs.readFileSync(path.join(targetDir, 'args.geojson'), 'utf-8'));
			const args = argsGeojson.features.map(f => f.geometry.coordinates);

			const resultPathsAndOperationTypes = fs
				.readdirSync(targetDir)
				.filter(fn => fn !== 'args.geojson' && fn.endsWith('.geojson'))
				.map(fn => [fn.slice(0, -'.geojson'.length), path.join(targetDir, fn)])
				.map(([opType, p]) => opType === 'all'
					? [
						['union', p],
						['intersection', p],
						['xor', p],
						['difference', p]
					]
					: [[opType, p]])
				.reduce((acc, val) => acc.concat(val), []); // flatten equiv: .flat(1)

			resultPathsAndOperationTypes.forEach(([operationType, resultPath]) => {
				/** @type {typeof test | typeof test.skip} */
				let doTest = test;
				if (targetsSkip.includes(target)) doTest = test.skip;
				if (opsSkip.includes(operationType)) doTest = test.skip;
				if (targetOnly && opOnly) {
					if (target === targetOnly && operationType === opOnly) {
						doTest = test.only;
					}
				} else if (targetOnly && target === targetOnly) doTest = test.only;
				else if (opOnly && operationType === opOnly) doTest = test.only;

				doTest(operationType, () => {
					const resultGeojson = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
					const expected = resultGeojson.geometry.coordinates;
					const options = resultGeojson?.properties?.options;

					polyclip.setPrecision(options?.precision);
					const operation = polyclip[
						/** @type {"union" | "intersection" | "xor" | "difference"} */(operationType)
					];
					if (!operation) {
						throw new Error(`Unknown operation '${operationType}'. Mispelling in filename of ${resultPath} ?`);
					}

					// @ts-ignore
					const result = operation(...args);
					assert.deepStrictEqual(result, expected);
				});
			});
		});
	});
});

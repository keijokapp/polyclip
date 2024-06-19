// @ts-check

import assert from 'node:assert';
import { describe, test } from 'node:test';
import { BigNumber } from 'bignumber.js';
import { getBboxOverlap, isInBbox } from '../lib/bbox.js';

describe('is in bbox', () => {
	test('outside', () => {
		const bbox = {
			ll: { x: new BigNumber(1), y: new BigNumber(2) },
			ur: { x: new BigNumber(5), y: new BigNumber(6) }
		};
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(0), y: new BigNumber(3) }), false);
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(3), y: new BigNumber(30) }), false);
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(3), y: new BigNumber(-30) }), false);
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(9), y: new BigNumber(3) }), false);
	});

	test('inside', () => {
		const bbox = {
			ll: { x: new BigNumber(1), y: new BigNumber(2) },
			ur: { x: new BigNumber(5), y: new BigNumber(6) }
		};
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(1), y: new BigNumber(2) }), true);
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(5), y: new BigNumber(6) }), true);
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(1), y: new BigNumber(6) }), true);
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(5), y: new BigNumber(2) }), true);
		assert.strictEqual(isInBbox(bbox, { x: new BigNumber(3), y: new BigNumber(4) }), true);
	});

	test('barely inside & outside', () => {
		const bbox = {
			ll: { x: new BigNumber(1), y: new BigNumber(0.8) },
			ur: { x: new BigNumber(1.2), y: new BigNumber(6) }
		};
		assert.strictEqual(
			isInBbox(bbox, { x: new BigNumber(1.2).minus(Number.EPSILON), y: new BigNumber(6) }),
			true
		);
		assert.strictEqual(
			isInBbox(bbox, { x: new BigNumber(1.2).plus(Number.EPSILON), y: new BigNumber(6) }),
			false
		);
		assert.strictEqual(
			isInBbox(bbox, { x: new BigNumber(1), y: new BigNumber(0.8).plus(Number.EPSILON) }),
			true
		);
		assert.strictEqual(
			isInBbox(bbox, { x: new BigNumber(1), y: new BigNumber(0.8).minus(Number.EPSILON) }),
			false
		);
	});
});

describe('bbox overlap', () => {
	const b1 = {
		ll: { x: new BigNumber(4), y: new BigNumber(4) },
		ur: { x: new BigNumber(6), y: new BigNumber(6) }
	};
	describe('disjoint - none', () => {
		test('above', () => {
			const b2 = {
				ll: { x: new BigNumber(7), y: new BigNumber(7) },
				ur: { x: new BigNumber(8), y: new BigNumber(8) }
			};
			assert.strictEqual(getBboxOverlap(b1, b2), undefined);
		});
		test('left', () => {
			const b2 = {
				ll: { x: new BigNumber(1), y: new BigNumber(5) },
				ur: { x: new BigNumber(3), y: new BigNumber(8) }
			};
			assert.strictEqual(getBboxOverlap(b1, b2), undefined);
		});
		test('down', () => {
			const b2 = {
				ll: { x: new BigNumber(2), y: new BigNumber(2) },
				ur: { x: new BigNumber(3), y: new BigNumber(3) }
			};
			assert.strictEqual(getBboxOverlap(b1, b2), undefined);
		});
		test('right', () => {
			const b2 = {
				ll: { x: new BigNumber(12), y: new BigNumber(1) },
				ur: { x: new BigNumber(14), y: new BigNumber(9) }
			};
			assert.strictEqual(getBboxOverlap(b1, b2), undefined);
		});
	});

	describe('touching - one point', () => {
		test('upper right corner of 1', () => {
			const b2 = {
				ll: { x: new BigNumber(6), y: new BigNumber(6) },
				ur: { x: new BigNumber(7), y: new BigNumber(8) }
			};
			assert.deepStrictEqual(getBboxOverlap(b1, b2), {
				ll: { x: new BigNumber(6), y: new BigNumber(6) },
				ur: { x: new BigNumber(6), y: new BigNumber(6) }
			});
		});
		test('upper left corner of 1', () => {
			const b2 = {
				ll: { x: new BigNumber(3), y: new BigNumber(6) },
				ur: { x: new BigNumber(4), y: new BigNumber(8) }
			};
			assert.deepStrictEqual(getBboxOverlap(b1, b2), {
				ll: { x: new BigNumber(4), y: new BigNumber(6) },
				ur: { x: new BigNumber(4), y: new BigNumber(6) }
			});
		});
		test('lower left corner of 1', () => {
			const b2 = {
				ll: { x: new BigNumber(0), y: new BigNumber(0) },
				ur: { x: new BigNumber(4), y: new BigNumber(4) }
			};
			assert.deepStrictEqual(getBboxOverlap(b1, b2), {
				ll: { x: new BigNumber(4), y: new BigNumber(4) },
				ur: { x: new BigNumber(4), y: new BigNumber(4) }
			});
		});
		test('lower right corner of 1', () => {
			const b2 = {
				ll: { x: new BigNumber(6), y: new BigNumber(0) },
				ur: { x: new BigNumber(12), y: new BigNumber(4) }
			};
			assert.deepStrictEqual(getBboxOverlap(b1, b2), {
				ll: { x: new BigNumber(6), y: new BigNumber(4) },
				ur: { x: new BigNumber(6), y: new BigNumber(4) }
			});
		});
	});

	describe('overlapping - two points', () => {
		describe('full overlap', () => {
			test('matching bboxes', () => {
				assert.deepStrictEqual(getBboxOverlap(b1, b1), b1);
			});

			test('one side & two corners matching', () => {
				const b2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(4) },
					ur: { x: new BigNumber(5), y: new BigNumber(6) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(4), y: new BigNumber(4) },
					ur: { x: new BigNumber(5), y: new BigNumber(6) }
				});
			});

			test('one corner matching, part of two sides', () => {
				const b2 = {
					ll: { x: new BigNumber(5), y: new BigNumber(4) },
					ur: { x: new BigNumber(6), y: new BigNumber(5) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(5), y: new BigNumber(4) },
					ur: { x: new BigNumber(6), y: new BigNumber(5) }
				});
			});

			test('part of a side matching, no corners', () => {
				const b2 = {
					ll: { x: new BigNumber(4.5), y: new BigNumber(4.5) },
					ur: { x: new BigNumber(5.5), y: new BigNumber(6) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(4.5), y: new BigNumber(4.5) },
					ur: { x: new BigNumber(5.5), y: new BigNumber(6) }
				});
			});

			test('completely enclosed - no side or corner matching', () => {
				const b2 = {
					ll: { x: new BigNumber(4.5), y: new BigNumber(5) },
					ur: { x: new BigNumber(5.5), y: new BigNumber(5.5) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), b2);
			});
		});

		describe('partial overlap', () => {
			test('full side overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(3), y: new BigNumber(4) },
					ur: { x: new BigNumber(5), y: new BigNumber(6) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(4), y: new BigNumber(4) },
					ur: { x: new BigNumber(5), y: new BigNumber(6) }
				});
			});

			test('partial side overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(5), y: new BigNumber(4.5) },
					ur: { x: new BigNumber(7), y: new BigNumber(5.5) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(5), y: new BigNumber(4.5) },
					ur: { x: new BigNumber(6), y: new BigNumber(5.5) }
				});
			});

			test('corner overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(5), y: new BigNumber(5) },
					ur: { x: new BigNumber(7), y: new BigNumber(7) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(5), y: new BigNumber(5) },
					ur: { x: new BigNumber(6), y: new BigNumber(6) }
				});
			});
		});
	});

	describe('line bboxes', () => {
		describe('vertical line & normal', () => {
			test('no overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(7), y: new BigNumber(3) },
					ur: { x: new BigNumber(7), y: new BigNumber(6) }
				};
				assert.strictEqual(getBboxOverlap(b1, b2), undefined);
			});

			test('point overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(6), y: new BigNumber(0) },
					ur: { x: new BigNumber(6), y: new BigNumber(4) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(6), y: new BigNumber(4) },
					ur: { x: new BigNumber(6), y: new BigNumber(4) }
				});
			});

			test('line overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(5), y: new BigNumber(0) },
					ur: { x: new BigNumber(5), y: new BigNumber(9) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(5), y: new BigNumber(4) },
					ur: { x: new BigNumber(5), y: new BigNumber(6) }
				});
			});
		});

		describe('horizontal line & normal', () => {
			test('no overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(3), y: new BigNumber(7) },
					ur: { x: new BigNumber(6), y: new BigNumber(7) }
				};
				assert.strictEqual(getBboxOverlap(b1, b2), undefined);
			});

			test('point overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(1), y: new BigNumber(6) },
					ur: { x: new BigNumber(4), y: new BigNumber(6) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(4), y: new BigNumber(6) }
				});
			});

			test('line overlap', () => {
				const b2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(6), y: new BigNumber(6) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(6), y: new BigNumber(6) }
				});
			});
		});

		describe('two vertical lines', () => {
			const v1 = {
				ll: { x: new BigNumber(4), y: new BigNumber(4) },
				ur: { x: new BigNumber(4), y: new BigNumber(6) }
			};
			test('no overlap', () => {
				const v2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(7) },
					ur: { x: new BigNumber(4), y: new BigNumber(8) }
				};
				assert.strictEqual(getBboxOverlap(v1, v2), undefined);
			});

			test('point overlap', () => {
				const v2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(3) },
					ur: { x: new BigNumber(4), y: new BigNumber(4) }
				};
				assert.deepStrictEqual(getBboxOverlap(v1, v2), {
					ll: { x: new BigNumber(4), y: new BigNumber(4) },
					ur: { x: new BigNumber(4), y: new BigNumber(4) }
				});
			});

			test('line overlap', () => {
				const v2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(3) },
					ur: { x: new BigNumber(4), y: new BigNumber(5) }
				};
				assert.deepStrictEqual(getBboxOverlap(v1, v2), {
					ll: { x: new BigNumber(4), y: new BigNumber(4) },
					ur: { x: new BigNumber(4), y: new BigNumber(5) }
				});
			});
		});

		describe('two horizontal lines', () => {
			const h1 = {
				ll: { x: new BigNumber(4), y: new BigNumber(6) },
				ur: { x: new BigNumber(7), y: new BigNumber(6) }
			};
			test('no overlap', () => {
				const h2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(5) },
					ur: { x: new BigNumber(7), y: new BigNumber(5) }
				};
				assert.strictEqual(getBboxOverlap(h1, h2), undefined);
			});

			test('point overlap', () => {
				const h2 = {
					ll: { x: new BigNumber(7), y: new BigNumber(6) },
					ur: { x: new BigNumber(8), y: new BigNumber(6) }
				};
				assert.deepStrictEqual(getBboxOverlap(h1, h2), {
					ll: { x: new BigNumber(7), y: new BigNumber(6) },
					ur: { x: new BigNumber(7), y: new BigNumber(6) }
				});
			});

			test('line overlap', () => {
				const h2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(7), y: new BigNumber(6) }
				};
				assert.deepStrictEqual(getBboxOverlap(h1, h2), {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(7), y: new BigNumber(6) }
				});
			});
		});

		describe('horizonal and vertical lines', () => {
			test('no overlap', () => {
				const h1 = {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(8), y: new BigNumber(6) }
				};
				const v1 = {
					ll: { x: new BigNumber(5), y: new BigNumber(7) },
					ur: { x: new BigNumber(5), y: new BigNumber(9) }
				};
				assert.strictEqual(getBboxOverlap(h1, v1), undefined);
			});

			test('point overlap', () => {
				const h1 = {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(8), y: new BigNumber(6) }
				};
				const v1 = {
					ll: { x: new BigNumber(5), y: new BigNumber(5) },
					ur: { x: new BigNumber(5), y: new BigNumber(9) }
				};
				assert.deepStrictEqual(getBboxOverlap(h1, v1), {
					ll: { x: new BigNumber(5), y: new BigNumber(6) },
					ur: { x: new BigNumber(5), y: new BigNumber(6) }
				});
			});
		});

		describe('produced line box', () => {
			test('horizontal', () => {
				const b2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(8), y: new BigNumber(8) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(6), y: new BigNumber(6) }
				});
			});

			test('vertical', () => {
				const b2 = {
					ll: { x: new BigNumber(6), y: new BigNumber(2) },
					ur: { x: new BigNumber(8), y: new BigNumber(8) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, b2), {
					ll: { x: new BigNumber(6), y: new BigNumber(4) },
					ur: { x: new BigNumber(6), y: new BigNumber(6) }
				});
			});
		});
	});

	describe('point bboxes', () => {
		describe('point & normal', () => {
			test('no overlap', () => {
				const p = {
					ll: { x: new BigNumber(2), y: new BigNumber(2) },
					ur: { x: new BigNumber(2), y: new BigNumber(2) }
				};
				assert.strictEqual(getBboxOverlap(b1, p), undefined);
			});
			test('point overlap', () => {
				const p = {
					ll: { x: new BigNumber(5), y: new BigNumber(5) },
					ur: { x: new BigNumber(5), y: new BigNumber(5) }
				};
				assert.deepStrictEqual(getBboxOverlap(b1, p), p);
			});
		});

		describe('point & line', () => {
			test('no overlap', () => {
				const p = {
					ll: { x: new BigNumber(2), y: new BigNumber(2) },
					ur: { x: new BigNumber(2), y: new BigNumber(2) }
				};
				const l = {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(4), y: new BigNumber(8) }
				};
				assert.strictEqual(getBboxOverlap(l, p), undefined);
			});
			test('point overlap', () => {
				const p = {
					ll: { x: new BigNumber(5), y: new BigNumber(5) },
					ur: { x: new BigNumber(5), y: new BigNumber(5) }
				};
				const l = {
					ll: { x: new BigNumber(4), y: new BigNumber(5) },
					ur: { x: new BigNumber(6), y: new BigNumber(5) }
				};
				assert.deepStrictEqual(getBboxOverlap(l, p), p);
			});
		});

		describe('point & point', () => {
			test('no overlap', () => {
				const p1 = {
					ll: { x: new BigNumber(2), y: new BigNumber(2) },
					ur: { x: new BigNumber(2), y: new BigNumber(2) }
				};
				const p2 = {
					ll: { x: new BigNumber(4), y: new BigNumber(6) },
					ur: { x: new BigNumber(4), y: new BigNumber(6) }
				};
				assert.strictEqual(getBboxOverlap(p1, p2), undefined);
			});
			test('point overlap', () => {
				const p = {
					ll: { x: new BigNumber(5), y: new BigNumber(5) },
					ur: { x: new BigNumber(5), y: new BigNumber(5) }
				};
				assert.deepStrictEqual(getBboxOverlap(p, p), p);
			});
		});
	});
});

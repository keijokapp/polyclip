declare module "polyclip" {
	export type Pair = [number, number]
	export type Ring<C = Pair> = C[]
	export type Polygon<C = Pair> = Ring<C>[]
	export type MultiPolygon<C = Pair> = Polygon<C>[]
	export type Geom<C = Pair> = Polygon<C> | MultiPolygon<C>
	export function intersection(geom: Geom, ...geoms: Geom[]): MultiPolygon
	export function xor(geom: Geom, ...geoms: Geom[]): MultiPolygon
	export function union(geom: Geom, ...geoms: Geom[]): MultiPolygon
	export function difference(
		subjectGeom: Geom,
		...clipGeoms: Geom[]
	): MultiPolygon
}

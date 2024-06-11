declare module "polyclip" {
	export type Pair = [number, number]
	export type Ring<C = Pair> = C[]
	export type Polygon<C = Pair> = Ring<C>[]
	export type MultiPolygon<C = Pair> = Polygon<C>[]
	export type Geometry<C = Pair> = Polygon<C> | MultiPolygon<C>
	export function intersection(geometry: Geometry, ...geometries: Geometry[]): MultiPolygon
	export function xor(geometry: Geometry, ...geometries: Geometry[]): MultiPolygon
	export function union(geometry: Geometry, ...geometries: Geometry[]): MultiPolygon
	export function difference(
		subjectGeometry: Geometry,
		...clipGeometriess: Geometry[]
	): MultiPolygon
}

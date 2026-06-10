declare module "d3";

declare module "geojson" {
  export type GeoJsonProperties = Record<string, unknown> | null;

  export type Position = number[];

  export interface Polygon {
    type: "Polygon";
    coordinates: Position[][];
  }

  export interface MultiPolygon {
    type: "MultiPolygon";
    coordinates: Position[][][];
  }

  export type Geometry = Polygon | MultiPolygon;

  export interface Feature<G = Geometry, P = GeoJsonProperties> {
    type: "Feature";
    geometry: G;
    properties: P;
  }

  export interface FeatureCollection<G = Geometry, P = GeoJsonProperties> {
    type: "FeatureCollection";
    features: Array<Feature<G, P>>;
  }
}

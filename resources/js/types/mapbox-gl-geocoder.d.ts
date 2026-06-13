declare module '@mapbox/mapbox-gl-geocoder' {
  import mapboxgl from 'mapbox-gl';

  interface GeocoderOptions {
    accessToken: string;
    mapboxgl: typeof mapboxgl;
    placeholder?: string;
    countries?: string;
    bbox?: [number, number, number, number];
    proximity?: { longitude: number; latitude: number };
    types?: string;
    marker?: boolean | mapboxgl.Marker;
    limit?: number;
    language?: string;
    zoom?: number;
    flyTo?: boolean;
    render?: (item: any) => string;
    getItemValue?: (item: any) => string;
  }

  class MapboxGeocoder {
    constructor(options: GeocoderOptions);
    on(type: string, callback: (event: any) => void): this;
    onAdd(map: mapboxgl.Map): HTMLElement;
    remove(): this;
    setInput(input: string): this;
    query(input: string): this;
  }

  export default MapboxGeocoder;
}

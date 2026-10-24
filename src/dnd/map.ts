import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Карта мира DnD: подложка — готовый SVG, координаты — единицы этого SVG (y вниз).

export interface MapLayer {
  id: string;
  title: string;
  kind: 'zones' | 'icons';
  color: string;
  visible: boolean;
}

export interface MapPlace {
  id: string;
  layer: string;
  title: string;
  summary?: string;
  icon?: string;
  color: string;
  point?: [number, number];
  area?: [number, number][];
}

export interface MapData {
  base: { url: string; width: number; height: number };
  layers: MapLayer[];
  places: MapPlace[];
}

// Как CRS.Simple, но ось y идёт вниз, как в SVG: latlng = [y, x].
const SvgCRS = L.extend({}, L.CRS.Simple, { transformation: new L.Transformation(1, 0, 1, 0) });

export const toLatLng = ([x, y]: [number, number]) => L.latLng(y, x);

export function createWorldMap(el: HTMLElement, base: MapData['base']) {
  const bounds = L.latLngBounds([0, 0], [base.height, base.width]);
  const map = L.map(el, {
    crs: SvgCRS,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 120,
    maxBounds: bounds.pad(0.5),
    maxBoundsViscosity: 0.8,
    attributionControl: false,
    minZoom: -10,
  });
  L.imageOverlay(base.url, bounds, { className: 'base-layer' }).addTo(map);
  map.fitBounds(bounds);
  const fit = map.getZoom();
  map.setMinZoom(fit);
  map.setMaxZoom(fit + 6);
  return { map, bounds };
}

export function placeIcon(p: MapPlace) {
  return L.divIcon({
    className: 'place-icon',
    html: `<span style="--c:${p.color}">${p.icon ?? ''}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export { L };

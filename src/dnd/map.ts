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

/** public/dnd/map/map.json — его пишет scripts/dnd-map-tiles.py */
export interface MapBase {
  width: number;
  height: number;
  /** Во сколько раз самый подробный уровень тайлов крупнее холста */
  scale: number;
  levels: number;
  tileSize: number;
}

export interface MapData {
  base: MapBase;
  layers: MapLayer[];
  places: MapPlace[];
}

// Как CRS.Simple, но ось y идёт вниз, как в SVG: latlng = [y, x].
const SvgCRS = L.extend({}, L.CRS.Simple, { transformation: new L.Transformation(1, 0, 1, 0) });

export const toLatLng = ([x, y]: [number, number]) => L.latLng(y, x);

export function createWorldMap(el: HTMLElement, base: MapBase) {
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
  // Зум карты z: 2^z px на единицу холста. Уровень тайлов L = z + offset,
  // последний уровень (levels - 1) — это scale px на единицу.
  const native = Math.log2(base.scale);
  const offset = base.levels - 1 - native;
  L.tileLayer('/dnd/map/tiles/{z}/{x}/{y}.webp', {
    tileSize: base.tileSize,
    zoomOffset: offset,
    minNativeZoom: -offset,
    maxNativeZoom: native,
    minZoom: -10,
    maxZoom: 10,
    bounds,
    noWrap: true,
    className: 'base-layer',
  }).addTo(map);
  map.fitBounds(bounds);
  const fit = map.getZoom();
  map.setMinZoom(fit);
  map.setMaxZoom(native + 2);
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

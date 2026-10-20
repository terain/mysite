import boundary from './gliwice-boundary.json';
import type { MultiPolygon, Polygon } from 'geojson';

// Граница города Гливице: официальная граница из PRG ГУГиК, упрощена до ~4 м.

export const cityBoundary = boundary as Polygon | MultiPolygon;
export const cityRings = (cityBoundary.type === 'Polygon' ? [cityBoundary.coordinates] : cityBoundary.coordinates) as number[][][][];
const outer = cityRings.flatMap((poly) => poly[0]);
const lngs = outer.map((c) => c[0]);
const lats = outer.map((c) => c[1]);

/** [юго-запад, северо-восток] города. */
export const CITY_BOUNDS: [[number, number], [number, number]] = [
  [Math.min(...lngs), Math.min(...lats)],
  [Math.max(...lngs), Math.max(...lats)],
];

/** Точка внутри города (ray casting по внешним контурам). */
export function insideCity(lng: number, lat: number): boolean {
  return cityRings.some((poly) => {
    let inside = false;
    const ring = poly[0];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

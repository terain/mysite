import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CITY_BOUNDS, cityBoundary, cityRings } from './city';

// Всё, что касается вида карты, собрано здесь: подложка, маска вокруг города, граница.

export const MAP_STYLE = {
  base: 'https://tiles.openfreemap.org/styles/liberty',
  // Чем закрыта территория за городом. opacity 1 — снаружи не видно ничего.
  outside: { color: '#e9e6df', opacity: 1 },
  border: { color: '#2f5fd0', width: 2.5 },
};

/** Рамка, за которую нельзя утащить карту: город плюс небольшой запас по краям. */
function padded(pad: number): [[number, number], [number, number]] {
  const [[w, s], [e, n]] = CITY_BOUNDS;
  const dx = (e - w) * pad;
  const dy = (n - s) * pad;
  return [
    [w - dx, s - dy],
    [e + dx, n + dy],
  ];
}

function addCityLayers(map: maplibregl.Map) {
  // Маска: прямоугольник на весь мир с дыркой по форме города. Кладём поверх всех слоёв
  // подложки, чтобы за городом не было видно и подписей.
  const world = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];
  map.addSource('city-mask', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [world, ...cityRings.map((poly) => [...poly[0]].reverse())] },
    },
  });
  map.addLayer({
    id: 'city-mask',
    type: 'fill',
    source: 'city-mask',
    paint: { 'fill-color': MAP_STYLE.outside.color, 'fill-opacity': MAP_STYLE.outside.opacity },
  });
  map.addSource('city-border', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: cityBoundary } });
  map.addLayer({
    id: 'city-border',
    type: 'line',
    source: 'city-border',
    paint: { 'line-color': MAP_STYLE.border.color, 'line-width': MAP_STYLE.border.width },
  });
}

/** Карта Гливице: видно только город, утащить карту за его пределы нельзя. */
export function createCityMap(container: HTMLElement | string, options: Partial<maplibregl.MapOptions> = {}) {
  const map = new maplibregl.Map({
    container,
    style: MAP_STYLE.base,
    bounds: CITY_BOUNDS,
    fitBoundsOptions: { padding: 20 },
    // Запас нужен большой: MapLibre не даёт окну выйти за maxBounds, и на широком экране
    // при маленьком запасе город не помещается целиком.
    maxBounds: padded(0.6),
    attributionControl: { compact: true },
    ...options,
  });
  map.on('load', () => {
    addCityLayers(map);
    // Размер контейнера мог поменяться, пока грузился стиль: заново вписываем город.
    if (!options.center) {
      map.resize();
      map.fitBounds(CITY_BOUNDS, { padding: options.fitBoundsOptions?.padding ?? 20, animate: false });
    }
  });
  return map;
}

export { CITY_BOUNDS, insideCity } from './city';
export { maplibregl };

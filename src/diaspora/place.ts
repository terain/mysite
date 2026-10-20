import { CATEGORY_IDS, LANGUAGES } from './categories';
import { insideCity } from './city';

// Поля места, которые можно задать из формы (предложение посетителя или админка).
export interface PlaceInput {
  name: string;
  kind: string;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  languages: string;
  hours: string | null;
  phone: string | null;
  website: string | null;
  telegram: string | null;
  instagram: string | null;
  facebook: string | null;
  photo: string | null;
  contacts: string | null;
}

const LIMITS: Record<string, number> = { name: 120, description: 2000, contacts: 500 };

function text(form: FormData, key: string): string | null {
  const v = String(form.get(key) ?? '').trim();
  return v ? v.slice(0, LIMITS[key] ?? 300) : null;
}

function url(form: FormData, key: string): string | null {
  const v = text(form, key);
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

/** Разбирает форму места. Возвращает текст ошибки по-украински или данные. */
export function parsePlace(form: FormData): { error: string } | { place: PlaceInput } {
  const name = text(form, 'name');
  if (!name) return { error: 'Вкажіть назву.' };
  const kind = text(form, 'kind') ?? '';
  if (!CATEGORY_IDS.has(kind)) return { error: 'Оберіть категорію.' };
  const lat = Number(form.get('lat'));
  const lng = Number(form.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !insideCity(lng, lat)) {
    return { error: 'Позначте місце на карті Гливиць.' };
  }
  const languages = form
    .getAll('languages')
    .map(String)
    .filter((l) => l in LANGUAGES);
  return {
    place: {
      name,
      kind,
      description: text(form, 'description'),
      address: text(form, 'address'),
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      languages: (languages.length ? languages : ['uk']).join(','),
      hours: text(form, 'hours'),
      phone: text(form, 'phone'),
      website: url(form, 'website'),
      telegram: text(form, 'telegram'),
      instagram: text(form, 'instagram'),
      facebook: url(form, 'facebook'),
      photo: text(form, 'photo')?.replace(/^\/?(media\/)?/, '') ?? null,
      contacts: text(form, 'contacts'),
    },
  };
}

/** Латинский slug из названия; украинские буквы транслитерируются. */
export function slugify(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y', і: 'i',
    ї: 'yi', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya', ы: 'y', э: 'e',
    ё: 'yo', ъ: '', ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  };
  const s = [...name.toLowerCase()]
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'place';
}

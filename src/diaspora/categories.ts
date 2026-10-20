// Категории мест на карте диаспоры. `kind` в таблице places — это `id` отсюда.
export interface Category {
  id: string;
  label: string; // по-украински, как на сайте
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'cafe', label: 'Кафе й ресторани', icon: '☕', color: '#d9822b' },
  { id: 'shop', label: 'Магазини', icon: '🛒', color: '#2e9e5b' },
  { id: 'beauty', label: 'Краса', icon: '💇', color: '#c2418f' },
  { id: 'medical', label: 'Медицина', icon: '🩺', color: '#d64545' },
  { id: 'service', label: 'Послуги', icon: '🛠️', color: '#3d7bd9' },
  { id: 'help', label: 'Документи й допомога', icon: '📄', color: '#7a5af5' },
  { id: 'meetup', label: 'Місця зустрічей', icon: '🤝', color: '#e0b100' },
  { id: 'event', label: 'Події', icon: '📅', color: '#14a3a3' },
];

export const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

export const LANGUAGES: Record<string, string> = {
  uk: 'українська',
  ru: 'російська',
  pl: 'польська',
  en: 'англійська',
};

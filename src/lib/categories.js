import {
  Monitor,
  Car,
  Shirt,
  Home,
  Dumbbell,
  Trophy,
  BookOpen,
  Puzzle,
  Flower2,
  MoreHorizontal,
  Wrench,
  Building2,
} from 'lucide-react';

export const CATEGORY_ALIASES = {
  home: 'home_garden',
  garden: 'home_garden',
  books: 'books_media',
};

export function normalizeCategory(category) {
  if (!category) return 'other';
  const key = String(category).trim().toLowerCase();
  return CATEGORY_ALIASES[key] || key;
}

export function normalizeTextKey(value) {
  if (!value) return '';
  return String(value)
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CATEGORIES = [
  'real_estate',
  'vehicles',
  'electronics',
  'sports',
  'fashion',
  'home_garden',
  'tools',
  'collectibles',
  'other',
];

export const CATEGORY_ICONS = {
  electronics: Monitor,
  vehicles: Car,
  fashion: Shirt,
  home_garden: Home,
  sports: Dumbbell,
  collectibles: Trophy,
  tools: Wrench,
  real_estate: Building2,
  books_media: BookOpen,
  other: MoreHorizontal,
};

export const SUBCATEGORIES = {
  other: ['other', 'free_stuff', 'services', 'tickets', 'miscellaneous'],
  collectibles: ['coins', 'cards', 'antiques', 'art', 'watches', 'memorabilia', 'other_collectibles'],
  tools: ['power_tools', 'hand_tools', 'workshop', 'construction', 'garden_tools', 'other_tools'],
  home_garden: ['furniture', 'kitchen', 'decor', 'appliances', 'garden_tools', 'other_home'],
  fashion: ['men', 'women', 'shoes', 'watches', 'bags', 'jewelry', 'accessories'],
  sports: ['fitness', 'football', 'basketball', 'winter_sports', 'fishing', 'cycling', 'outdoor_gear', 'other_sports'],
  electronics: ['phones', 'computers', 'gaming', 'tv_audio', 'cameras', 'accessories', 'other_electronics'],
  vehicles: ['cars', 'motorcycles', 'scooters_mopeds', 'bicycles', 'parts', 'tires_wheels', 'other_vehicles'],
  real_estate: ['apartments', 'houses', 'land', 'commercial', 'garages', 'rooms', 'rentals', 'other_real_estate'],
  books_media: ['books', 'comics', 'magazines', 'music', 'movies', 'other_books_media'],
};

export const FILTERS = {
  vehicles: ['brand', 'year', 'fuel', 'mileage', 'transmission'],
  electronics: ['brand', 'condition'],
  fashion: ['brand', 'size', 'condition'],
  real_estate: ['area', 'rooms', 'condition'],
  sports: ['brand', 'condition'],
  collectibles: ['condition'],
  tools: ['brand', 'condition'],
  books_media: ['condition'],
  default: ['condition'],
};

export const SUBCATEGORY_FILTER_OVERRIDES = {
  vehicles: {
    cars: ['brand', 'model', 'year', 'fuel', 'mileage', 'transmission'],
    motorcycles: ['brand', 'model', 'year', 'fuel', 'mileage', 'transmission'],
    // Vehicle parts don't need vehicle-specific specs
    parts: ['brand', 'year'],
    tires_wheels: ['brand', 'year'],
    // Bicycles usually don't have fuel/transmission in our model
    bicycles: ['brand', 'year'],
  },
};

export function getActiveFilterKeys(category, subcategory) {
  const base = FILTERS[category] || FILTERS.default || [];
  if (!category || !subcategory) return base;
  const overridesByCat = SUBCATEGORY_FILTER_OVERRIDES[category];
  const override = overridesByCat ? overridesByCat[subcategory] : null;
  return override || base;
}

export const FILTER_FIELD_DEFS = {
  brand: { type: 'text' },
  model: { type: 'text' },
  year: { type: 'number', mode: 'min' },
  fuel: { type: 'text' },
  mileage: { type: 'number', mode: 'max' },
  transmission: { type: 'text' },
  size: { type: 'text' },
  rooms: { type: 'number', mode: 'min' },
  area: { type: 'number', mode: 'min' },
  condition: { type: 'text' },
};

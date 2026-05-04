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
  vehicles: ['brand', 'year', 'mileage', 'transmission'],
  electronics: ['brand', 'condition'],
  fashion: ['brand', 'size', 'condition'],
  home_garden: ['condition'],
  real_estate: ['rooms', 'area'],
  sports: ['brand', 'condition'],
  collectibles: ['condition'],
  tools: ['brand', 'condition'],
  books_media: ['condition'],
  default: ['condition'],
};

export const SUBCATEGORY_FILTER_OVERRIDES = {
  vehicles: {
    cars: ['brand', 'model', 'year', 'mileage', 'transmission'],
    motorcycles: ['brand', 'model', 'year', 'mileage'],
    scooters_mopeds: ['brand', 'year', 'mileage'],
    // Vehicle parts don't need vehicle-specific specs
    parts: ['brand'],
    tires_wheels: ['brand', 'year', 'size'],
    // Bicycles usually don't have fuel/transmission in our model
    bicycles: ['brand', 'year'],
    other_vehicles: ['brand', 'year', 'mileage'],
  },
  electronics: {
    phones: ['brand', 'condition'],
    computers: ['brand', 'condition'],
    gaming: ['brand', 'condition'],
    tv_audio: ['brand', 'condition'],
    cameras: ['brand', 'condition'],
    accessories: ['brand', 'condition'],
    other_electronics: ['brand', 'condition'],
  },
  fashion: {
    men: ['brand', 'size', 'condition'],
    women: ['brand', 'size', 'condition'],
    shoes: ['brand', 'size', 'condition'],
    watches: ['brand', 'condition'],
    bags: ['brand', 'condition'],
    jewelry: ['brand', 'condition'],
    accessories: ['brand', 'condition'],
  },
  home_garden: {
    furniture: ['condition'],
    kitchen: ['condition'],
    decor: ['condition'],
    appliances: ['brand', 'condition'],
    garden_tools: ['brand', 'condition'],
    other_home: ['condition'],
  },
  sports: {
    fitness: ['brand', 'condition'],
    football: ['brand', 'condition'],
    basketball: ['brand', 'condition'],
    winter_sports: ['brand', 'condition'],
    fishing: ['brand', 'condition'],
    cycling: ['brand', 'condition'],
    outdoor_gear: ['brand', 'condition'],
    other_sports: ['brand', 'condition'],
  },
  collectibles: {
    coins: ['condition'],
    cards: ['condition'],
    antiques: ['condition'],
    art: ['condition'],
    watches: ['condition'],
    memorabilia: ['condition'],
    other_collectibles: ['condition'],
  },
  tools: {
    power_tools: ['brand', 'condition'],
    hand_tools: ['brand', 'condition'],
    workshop: ['brand', 'condition'],
    construction: ['brand', 'condition'],
    garden_tools: ['brand', 'condition'],
    other_tools: ['brand', 'condition'],
  },
  real_estate: {
    apartments: ['rooms', 'area'],
    houses: ['rooms', 'area'],
    rentals: ['rooms', 'area'],
    rooms: ['rooms', 'area'],
    commercial: ['rooms', 'area'],
    land: ['area'],
    garages: ['area'],
    other_real_estate: ['rooms', 'area'],
  },
  books_media: {
    books: ['condition'],
    comics: ['condition'],
    magazines: ['condition'],
    music: ['condition'],
    movies: ['condition'],
    other_books_media: ['condition'],
  },
  other: {
    other: ['condition'],
    free_stuff: ['condition'],
    services: ['condition'],
    tickets: ['condition'],
    miscellaneous: ['condition'],
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

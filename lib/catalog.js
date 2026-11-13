import catalog from '@/data/catalog.json';

const IMAGE_MODES = new Set(['text-to-image', 'image-to-image']);
const VIDEO_MODES = new Set([
  'text-to-video',
  'image-to-video',
  'video-to-video',
  'lipsync',
  'recast',
  'motion-control',
]);

export const CATEGORIES = [
  { id: 'all', label: 'Hamısı', short: 'All' },
  { id: 'image', label: 'Şəkil', short: 'Image' },
  { id: 'video', label: 'Video', short: 'Video' },
  { id: 'audio', label: 'Audio', short: 'Audio' },
];

export const MODES = {
  image: [
    { id: 'text-to-image', label: 'Mətndən şəkil' },
    { id: 'image-to-image', label: 'Şəkli dəyiş' },
  ],
  video: [
    { id: 'text-to-video', label: 'Mətndən video' },
    { id: 'image-to-video', label: 'Şəkildən video' },
    { id: 'video-to-video', label: 'Videonu dəyiş' },
    { id: 'lipsync', label: 'Lip Sync' },
    { id: 'motion-control', label: 'Motion Control' },
    { id: 'recast', label: 'Recast' },
  ],
  audio: [{ id: 'audio', label: 'Audio' }],
};

export const categoryCounts = catalog.reduce((acc, model) => {
  acc.all = (acc.all || 0) + 1;
  acc[model.category] = (acc[model.category] || 0) + 1;
  return acc;
}, {});

export const providerCounts = catalog.reduce((acc, model) => {
  acc[model.providerName] = (acc[model.providerName] || 0) + 1;
  return acc;
}, {});

export function getFullCatalog() {
  return catalog;
}

export function getFacets() {
  return {
    categories: categoryCounts,
    providers: Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([name, count]) => ({ name, count })),
    modes: MODES,
  };
}

export function toCard(model) {
  return {
    id: model.id,
    key: `${model.category}:${model.mode}:${model.id}`,
    name: model.name,
    providerName: model.providerName,
    category: model.category,
    mode: model.mode,
    modeLabel: model.modeLabel,
    family: model.family,
    description: model.description,
    aspectRatios: model.aspectRatios,
    resolutions: model.resolutions,
    durations: model.durations,
    cost: model.cost,
  };
}

export function searchModels({ q = '', category = 'all', mode = '', provider = '', page = 1, limit = 48 } = {}) {
  const query = String(q || '').trim().toLowerCase();
  const providerFilter = String(provider || '').trim().toLowerCase();
  const modeFilter = String(mode || '').trim();
  const categoryFilter = String(category || 'all').trim();

  let rows = catalog.filter((model) => {
    if (categoryFilter !== 'all' && model.category !== categoryFilter) return false;
    if (modeFilter && model.mode !== modeFilter) return false;
    if (providerFilter && model.providerName.toLowerCase() !== providerFilter) return false;
    if (!query) return true;
    return (
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query) ||
      model.providerName.toLowerCase().includes(query) ||
      model.modeLabel.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query)
    );
  });

  rows.sort((a, b) => {
    // Prefer mainstream providers first, then alphabetical.
    const priority = (value) => {
      const v = value.toLowerCase();
      if (v.includes('google')) return 0;
      if (v.includes('bytedance') || v.includes('kling') || v.includes('minimax')) return 1;
      if (v.includes('openai') || v.includes('black forest')) return 2;
      return 3;
    };
    return priority(a.providerName) - priority(b.providerName) || a.name.localeCompare(b.name);
  });

  const total = rows.length;
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(96, Math.max(12, Number(limit) || 48));
  const start = (currentPage - 1) * pageSize;
  rows = rows.slice(start, start + pageSize);

  return {
    models: rows.map(toCard),
    total,
    page: currentPage,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

export function getModel(category, mode, id) {
  return (
    catalog.find(
      (model) => model.category === category && model.mode === mode && model.id === id,
    ) || null
  );
}

export function getModeLabel(mode) {
  for (const group of Object.values(MODES)) {
    const found = group.find((item) => item.id === mode);
    if (found) return found.label;
  }
  return mode;
}

export function isImageMode(mode) {
  return IMAGE_MODES.has(mode);
}

export function isVideoMode(mode) {
  return VIDEO_MODES.has(mode);
}

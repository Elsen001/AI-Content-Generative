// Builds the public model catalog from the Open-Generative-AI model registry.
// Source: ../Open-Generative-AI-main/packages/studio/src/models.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', 'Open-Generative-AI-main');
const modelsPath = path.join(repoRoot, 'packages', 'studio', 'src', 'models.js');
const models = await import(pathToFileURL(modelsPath).href);

const GROUPS = [
  ['t2iModels', 'image', 'text-to-image', 'Text → Image'],
  ['i2iModels', 'image', 'image-to-image', 'Image → Image'],
  ['t2vModels', 'video', 'text-to-video', 'Text → Video'],
  ['i2vModels', 'video', 'image-to-video', 'Image → Video'],
  ['v2vModels', 'video', 'video-to-video', 'Video → Video'],
  ['lipsyncModels', 'video', 'lipsync', 'Lip Sync'],
  ['recastModels', 'video', 'recast', 'Motion Control'],
  ['motionControlModels', 'video', 'motion-control', 'Motion Control'],
  ['audioModels', 'audio', 'audio', 'Audio'],
];

const cleanText = (value, max = 180) => {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const publicInput = (input) => {
  if (!input || typeof input !== 'object') return null;
  const out = {
    type: input.type || 'string',
    title: cleanText(input.title || input.name, 60),
    name: input.name,
  };
  if (Array.isArray(input.enum)) out.enum = input.enum.slice(0, 40);
  if (input.default !== undefined) out.default = input.default;
  if (input.minValue !== undefined) out.minValue = input.minValue;
  if (input.maxValue !== undefined) out.maxValue = input.maxValue;
  if (input.step !== undefined) out.step = input.step;
  if (input.minItems !== undefined) out.minItems = input.minItems;
  if (input.maxItems !== undefined) out.maxItems = input.maxItems;
  if (input.required) out.required = true;
  const description = cleanText(input.description, 110);
  if (description) out.description = description;
  return out;
};

const allowed = new Set();
const catalog = [];
for (const [exportName, category, mode, modeLabel] of GROUPS) {
  const list = models[exportName] || [];
  for (const model of list) {
    if (!model?.id) continue;
    const key = `${category}:${mode}:${model.id}`;
    if (allowed.has(key)) continue;
    allowed.add(key);

    const inputs = {};
    for (const [name, input] of Object.entries(model.inputs || {})) {
      if (name === 'prompt') continue;
      const clean = publicInput(input);
      if (clean) inputs[name] = clean;
    }

    const aspect = model.aspectRatios
      || model.inputs?.aspect_ratio?.enum
      || model.inputs?.ratio?.enum
      || [];
    const durations = model.durations
      || (model.inputs?.duration?.enum || [])
      || [];
    const resolutions = model.resolutions
      || model.inputs?.resolution?.enum
      || model.inputs?.quality?.enum
      || [];

    const entry = {
      id: model.id,
      name: cleanText(model.name || model.id, 80),
      endpoint: model.endpoint || model.id,
      provider: model.provider || 'muapi',
      providerName: model.provider_name || model.providerName || model.provider || 'MuAPI',
      category,
      mode,
      modeLabel,
      family: model.family || mode,
      description: cleanText(model.description, 200),
      promptRequired: model.promptRequired !== false,
      hasPrompt: model.hasPrompt !== false,
      imageField: model.imageField || null,
      lastImageField: model.lastImageField || null,
      videoField: model.videoField || 'video_url',
      aspectRatios: Array.from(new Set(aspect)).slice(0, 12),
      durations: Array.from(new Set(durations)).slice(0, 12),
      resolutions: Array.from(new Set(resolutions)).slice(0, 8),
      cost: typeof model.cost === 'number' ? model.cost : null,
      inputs,
    };

    if (!entry.description) {
      entry.description = `${entry.name} — ${modeLabel.toLowerCase()} modeli (${entry.providerName}).`;
    }
    catalog.push(entry);
  }
}

catalog.sort((a, b) => a.name.localeCompare(b.name) || a.mode.localeCompare(b.mode));

const outputDir = path.resolve(here, '..', 'data');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'catalog.json');
fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

const counts = catalog.reduce((acc, model) => {
  acc[model.category] = (acc[model.category] || 0) + 1;
  return acc;
}, {});
console.log(`Wrote ${catalog.length} models to ${outputPath}`);
console.log(counts);

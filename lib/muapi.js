import { getSetting } from './db';

const BASE_URL = process.env.MUAPI_BASE_URL || 'https://api.muapi.ai';
const API = `${BASE_URL}/api/v1`;

const SPECIAL_FIELDS = new Set([
  'prompt',
  'image_url',
  'images_list',
  'last_image',
  'last_image_url',
  'video_url',
  'audio_url',
]);

export class MuapiError extends Error {
  constructor(message, status = 502, requestId = null) {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

export function getMuapiKey() {
  const key = getSetting('muapi_key', '');
  return typeof key === 'string' ? key.trim() : '';
}

export function hasMuapiKey() {
  return Boolean(getMuapiKey());
}

function requireKey() {
  const key = getMuapiKey();
  if (!key) {
    throw new MuapiError(
      'MuAPI açarı qoşulmayıb. Admin paneldən açarı əlavə edin.',
      503,
    );
  }
  return key;
}

function castValue(input, value) {
  if (value === undefined || value === null || value === '') return undefined;
  const type = input?.type || 'string';
  if (type === 'int' || type === 'integer') {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type === 'number' || type === 'float') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
  if (type === 'array') {
    if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && item !== '');
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return value;
}

/**
 * Build the MuAPI payload from the model's input schema.
 * Handles the different media field contracts used by image/video models.
 */
export function buildPayload(model, values = {}) {
  const payload = {};
  const params = values.params && typeof values.params === 'object' ? values.params : {};

  if (values.prompt && model.hasPrompt !== false) {
    payload.prompt = String(values.prompt).trim();
  }

  const images = Array.isArray(values.images_list) && values.images_list.length
    ? values.images_list.filter(Boolean)
    : values.image_url
      ? [values.image_url]
      : [];

  if (images.length) {
    if (model.imageField === 'images_list' || model.inputs?.images_list) {
      payload.images_list = images.slice(0, 16);
    } else if (model.imageField) {
      payload[model.imageField] = images[0];
    } else {
      payload.image_url = images[0];
    }
  }

  if (values.last_image) {
    const field = model.lastImageField || 'last_image';
    if (field === 'images_list') {
      payload.images_list = Array.from(new Set([...(payload.images_list || []), values.last_image]));
    } else {
      payload[field] = values.last_image;
    }
  }

  if (values.video_url) {
    payload[model.videoField || 'video_url'] = values.video_url;
  }

  if (values.audio_url) {
    payload.audio_url = values.audio_url;
  }

  for (const [name, input] of Object.entries(model.inputs || {})) {
    if (SPECIAL_FIELDS.has(name)) continue;
    let raw = params[name];
    if (raw === undefined) raw = values[name];
    const cast = castValue(input, raw);
    if (cast !== undefined) {
      payload[name] = cast;
    } else if (input.required) {
      if (input.default !== undefined) payload[name] = input.default;
      else if (input.type === 'array') payload[name] = [];
    }
  }

  for (const alias of ['aspect_ratio', 'duration', 'resolution', 'quality', 'seed', 'strength', 'mode']) {
    if (values[alias] !== undefined && values[alias] !== null && values[alias] !== '') {
      const input = model.inputs?.[alias];
      const cast = castValue(input, values[alias]);
      if (cast !== undefined) payload[alias] = cast;
    }
  }

  if (model.promptRequired && !payload.prompt) {
    // Some image-edit tools do not need a prompt; leave the key out entirely.
    if (model.hasPrompt !== false) payload.prompt = '';
  }

  return payload;
}

function extractStatus(result) {
  return String(result?.status || result?.data?.status || '').toLowerCase();
}

export function extractOutputUrl(result) {
  if (!result) return null;
  if (typeof result === 'string') return result;
  if (Array.isArray(result)) return extractOutputUrl(result[0]);
  if (result.outputs) {
    const fromOutputs = extractOutputUrl(result.outputs);
    if (fromOutputs) return fromOutputs;
  }
  if (result.output !== undefined) {
    const fromOutput = extractOutputUrl(result.output);
    if (fromOutput) return fromOutput;
  }
  if (result.data?.outputs) {
    const fromData = extractOutputUrl(result.data.outputs);
    if (fromData) return fromData;
  }
  return (
    result.url ||
    result.output_url ||
    result.video_url ||
    result.image_url ||
    result.audio_url ||
    result.data?.url ||
    result.data?.output_url ||
    null
  );
}

export async function submitPrediction(model, values) {
  const key = requireKey();
  const endpoint = model.endpoint || model.id;
  const payload = buildPayload(model, values);

  const response = await fetch(`${API}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(90_000),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || data?.message || text.slice(0, 240);
    throw new MuapiError(`MuAPI: ${detail}`, response.status >= 500 ? 502 : 400);
  }

  const requestId = data.request_id || data.id;
  const directUrl = extractOutputUrl(data);
  const directStatus = extractStatus(data);

  if (directUrl && (!requestId || ['completed', 'succeeded', 'success'].includes(directStatus))) {
    return { requestId: requestId || null, status: 'completed', url: directUrl, raw: data };
  }

  if (!requestId) {
    throw new MuapiError('MuAPI cavabında request_id tapılmadı.', 502);
  }

  return { requestId, status: directStatus || 'processing', url: directUrl, raw: data };
}

export async function pollPrediction(requestId) {
  const key = requireKey();
  const response = await fetch(`${API}/predictions/${requestId}/result`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    signal: AbortSignal.timeout(60_000),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new MuapiError('MuAPI cavabı oxuna bilmədi.', 502, requestId);
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || data?.message || text.slice(0, 200);
    throw new MuapiError(`Poll xətası: ${detail}`, response.status === 404 ? 404 : 502, requestId);
  }

  const status = extractStatus(data) || 'processing';
  const url = extractOutputUrl(data);
  const failed = ['failed', 'error', 'cancelled', 'canceled'].includes(status);
  const completed = ['completed', 'succeeded', 'success'].includes(status) || (!status && Boolean(url));

  return {
    status: completed ? 'completed' : failed ? 'failed' : 'processing',
    url,
    error:
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      data?.message ||
      null,
    raw: data,
  };
}

export async function uploadFile(file) {
  const key = requireKey();
  const form = new FormData();
  form.append('file', file, file.name || 'upload');

  const response = await fetch(`${API}/upload_file`, {
    method: 'POST',
    headers: { 'x-api-key': key },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new MuapiError(`Yükləmə alınmadı: ${text.slice(0, 160)}`, 502);
  }

  const url = data.url || data.file_url || data.data?.url;
  if (!url) throw new MuapiError('Yükləmə cavabında URL yoxdur.', 502);
  return url;
}

export async function getBalance() {
  const key = requireKey();
  const response = await fetch(`${API}/account/balance`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new MuapiError(`Balans oxunmadı: ${text.slice(0, 160)}`, 502);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

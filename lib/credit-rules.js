// Pure credit rules shared by the server and the studio UI.
// Values are retail credits. 1 credit = $0.01 by default.

export const MODE_BASE_CREDITS = {
  'text-to-image': 5,
  'image-to-image': 6,
  'text-to-video': 45,
  'image-to-video': 50,
  'video-to-video': 40,
  lipsync: 55,
  recast: 60,
  'motion-control': 65,
  audio: 15,
};

export const CREDIT_VALUE_CENTS = 1;

const RESOLUTION_FACTORS = {
  '480p': 0.7,
  '540p': 0.75,
  '720p': 0.9,
  '1080p': 1.25,
  '2k': 1.35,
  '2K': 1.35,
  '1440p': 1.4,
  '4k': 1.9,
  '4K': 1.9,
  '2160p': 1.9,
};

const QUALITY_FACTORS = {
  low: 0.8,
  medium: 1,
  standard: 1,
  high: 1.25,
  'high-quality': 1.4,
  ultra: 1.7,
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Estimate the retail credit cost for one generation.
 * @param {object} model catalog entry
 * @param {object} values { duration, resolution, quality, images, count }
 */
export function estimateCredits(model, values = {}) {
  if (!model) return 5;
  let credits = MODE_BASE_CREDITS[model.mode] ?? 10;

  const duration = toNumber(values.duration);
  if (duration) {
    if (model.mode === 'text-to-video' || model.mode === 'image-to-video') {
      credits = credits * Math.max(0.7, Math.min(duration / 5, 3.2));
    } else if (model.mode === 'video-to-video' || model.mode === 'lipsync' || model.mode === 'recast' || model.mode === 'motion-control') {
      credits = credits * Math.max(0.8, Math.min(duration / 6, 2.5));
    }
  }

  const resolution = values.resolution;
  if (resolution && RESOLUTION_FACTORS[resolution]) {
    credits *= RESOLUTION_FACTORS[resolution];
  }

  const quality = values.quality;
  if (quality && QUALITY_FACTORS[quality]) {
    credits *= QUALITY_FACTORS[quality];
  }

  const count = toNumber(values.count);
  if (count && count > 1) {
    credits *= Math.min(count, 4);
  }

  // A provider-reported base cost is a useful sanity signal.
  if (model.cost && Number.isFinite(model.cost)) {
    credits = Math.max(credits, model.cost * 100 * 1.8);
  }

  return Math.max(3, Math.round(credits));
}

// Rough provider cost (in cents) behind a retail credit amount.
// Used for the shared-pool progress bar in the admin dashboard.
export function estimateProviderCostCents(model, credits) {
  const mode = model?.mode || '';
  const ratio = mode.includes('video') || mode === 'lipsync' || mode === 'recast' || mode === 'motion-control'
    ? 0.55
    : 0.45;
  return Math.max(1, Math.round(credits * CREDIT_VALUE_CENTS * ratio));
}

export function creditsToUsd(credits) {
  return ((credits || 0) * CREDIT_VALUE_CENTS) / 100;
}

import { formatNumber } from './format';

export function formatCredits(value) {
  return formatNumber(value);
}

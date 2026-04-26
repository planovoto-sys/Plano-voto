export const GAUGE_PATH = 'M 46 164 A 114 114 0 0 1 274 164';
export const GAUGE_POINTER_LENGTH = 7;

export const GAUGE_SEGMENTS = [
  { offset: 0, length: 12, color: '#ff4d32' },
  { offset: 12, length: 13, color: '#ff9d18' },
  { offset: 25, length: 13, color: '#ffbf17' },
  { offset: 38, length: 19, color: '#ffe500' },
  { offset: 57, length: 12, color: '#b8d600' },
  { offset: 69, length: 7, color: '#a6d400' },
  { offset: 76, length: 10, color: '#7ccd00' },
  { offset: 86, length: 14, color: '#00c21c' }
];

export const normalizeGaugeScore = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.min(Math.max(numericValue, 0), 10) : 0;
};

export const getGaugeProgress = (score) => normalizeGaugeScore(score) * 10;

export const getGaugeSegmentFill = (segment, progress) => (
  Math.min(Math.max(progress - segment.offset, 0), segment.length)
);

export const getGaugePointerOffset = (progress) => (
  Math.min(Math.max(progress - (GAUGE_POINTER_LENGTH / 2), 0), 100 - GAUGE_POINTER_LENGTH)
);

export const normalizeSearch = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

export const normalizeState = (value) => (
  String(value || '')
    .replace(/[\s\u00A0]+/g, '')
    .toUpperCase()
);

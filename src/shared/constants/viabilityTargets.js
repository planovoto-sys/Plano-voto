// Referências fornecidas pelo responsável pelo Bom de Voto; não são garantia de eleição.
// A migração correspondente é validada contra estes 81 valores nos testes.
export const VIABILITY_TARGETS = {
  "PRESIDENTE": {
    "BR": 59276177
  },
  "SENADOR": {
    "AC": 185066,
    "AL": 621562,
    "AP": 128186,
    "AM": 607286,
    "BA": 3927598,
    "CE": 1325786,
    "DF": 403735,
    "ES": 863359,
    "GO": 1557415,
    "MA": 1539942,
    "MG": 3568658,
    "MS": 373712,
    "MT": 490699,
    "PA": 1374956,
    "PB": 831701,
    "PE": 1430802,
    "PI": 812213,
    "PR": 2331740,
    "RJ": 2382265,
    "RN": 660315,
    "RO": 230361,
    "RR": 85366,
    "RS": 1875245,
    "SC": 1179757,
    "SE": 300247,
    "SP": 6513282,
    "TO": 214355
  },
  "DEPUTADO_FEDERAL": {
    "AC": 14522,
    "AL": 58134,
    "AP": 5435,
    "AM": 87876,
    "BA": 53486,
    "CE": 74773,
    "DF": 20923,
    "ES": 42640,
    "GO": 51346,
    "MA": 54547,
    "MG": 31025,
    "MS": 41773,
    "MT": 47479,
    "PA": 62366,
    "PB": 54851,
    "PE": 59686,
    "PI": 79987,
    "PR": 57185,
    "RJ": 33368,
    "RN": 56315,
    "RO": 12607,
    "RR": 8243,
    "RS": 40555,
    "SC": 51824,
    "SE": 38135,
    "SP": 71754,
    "TO": 13668
  },
  "DEPUTADO_ESTADUAL": {
    "AC": 4810,
    "AL": 19714,
    "AP": 3898,
    "AM": 17787,
    "BA": 27338,
    "CE": 17243,
    "ES": 12176,
    "GO": 17484,
    "MA": 24800,
    "MG": 28270,
    "MS": 11650,
    "MT": 20723,
    "PA": 22366,
    "PB": 20602,
    "PE": 24851,
    "PI": 20920,
    "PR": 26884,
    "RJ": 13946,
    "RN": 25143,
    "RO": 7609,
    "RR": 3046,
    "RS": 24946,
    "SC": 12390,
    "SE": 14990,
    "SP": 45094,
    "TO": 8271
  }
};

export const normalizeViabilityOffice = (office = '') => {
  const key = String(office).trim().toUpperCase().replace(/\s+/g, '_');
  return key === 'SENADORES' ? 'SENADOR' : key;
};

export const getViabilityTarget = (office, state) => {
  const key = normalizeViabilityOffice(office);
  const scope = key === 'PRESIDENTE' ? 'BR' : String(state || '').trim().toUpperCase();
  return VIABILITY_TARGETS[key]?.[scope] ?? null;
};


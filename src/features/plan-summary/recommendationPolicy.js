import { compareCandidatesByScorePriority } from '../../shared/utils/candidateMetrics.js';

// Espelha a política do banco somente para a prévia do visitante.
// Contas autenticadas usam as reservas do servidor, não este cálculo local.
export const RECOMMENDATION_POLICY_VERSION = 'selections_v1';

const selectionCount = (candidate) => Math.max(0, Number(
  candidate.active_selections ?? candidate.selected_by_users ?? candidate.selectedByUsers ?? 0
) || 0);

export const compareCandidatesBySelectionPriority = (a, b) => (
  selectionCount(b) - selectionCount(a) || compareCandidatesByScorePriority(a, b)
);

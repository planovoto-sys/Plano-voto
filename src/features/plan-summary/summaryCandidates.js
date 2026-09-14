import { compareCandidatesBySelectionPriority } from './recommendationPolicy.js';

export const getSummaryOfficeCandidates = (candidates, candidatesById, limit, recommendedIds = null) => {
  const resolved = new Map(candidates.map((candidate) => [candidate.id, candidatesById.get(candidate.id) || candidate]));
  // Uma lista vazia do servidor significa SEM reserva, não autoriza fallback
  // local para um candidato que já atingiu o limite. null é apenas a prévia.
  if (recommendedIds !== null) {
    return [...new Set(recommendedIds)].map((id) => resolved.get(id)).filter(Boolean).slice(0, limit);
  }
  return [...resolved.values()].sort(compareCandidatesBySelectionPriority).slice(0, limit);
};

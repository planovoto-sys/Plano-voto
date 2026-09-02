import { compareCandidatesByScorePriority } from '../../shared/utils/candidateMetrics.js';

export const getSummaryOfficeCandidates = (candidates, candidatesById, limit) => (
  candidates
    .map((candidate) => candidatesById.get(candidate.id) || candidate)
    .sort(compareCandidatesByScorePriority)
    .slice(0, limit)
);

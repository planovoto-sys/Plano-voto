import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import { normalizeStateCode } from '@/shared/utils/state';
import { readSharedSelectionSource } from './sharedSelectionModel';
import './SharedSelectionTag.css';

export default function SharedSelectionTag({ candidateId, stateCode }) {
  const { user } = useUser();
  const source = readSharedSelectionSource(user?.uid, ACTIVE_ELECTION_ID);
  const matchesCandidate = candidateId && source?.candidateIds.includes(candidateId);
  const matchesState = stateCode && normalizeStateCode(source?.state) === normalizeStateCode(stateCode);
  if (!matchesCandidate && !matchesState) return null;
  return (
    <span className="shared-selection-tag" title={`Seleção recebida de ${source.state} · versão ${source.revision}. Suas alterações não modificam a referência original.`}>
      Seleção compartilhada
    </span>
  );
}

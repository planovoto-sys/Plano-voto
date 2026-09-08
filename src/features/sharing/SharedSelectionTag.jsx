import { ACTIVE_ELECTION_ID } from '@/shared/constants/ballot';
import { useUser } from '@/shared/hooks/useUser';
import { readSharedSelectionSource } from './sharedSelectionModel';
import './SharedSelectionTag.css';

export default function SharedSelectionTag({ candidateId }) {
  const { user } = useUser();
  const source = readSharedSelectionSource(user?.uid, ACTIVE_ELECTION_ID);
  if (!source?.candidateIds.includes(candidateId)) return null;
  return (
    <span className="shared-selection-tag" title={`Seleção recebida de ${source.state} · versão ${source.revision}. Suas alterações não modificam a referência original.`}>
      Seleção compartilhada
    </span>
  );
}

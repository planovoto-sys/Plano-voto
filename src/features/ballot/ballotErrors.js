export class VotingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VotingError';
    this.code = code;
  }
}

export const getVotingErrorMessage = (error) => {
  const messages = {
    AUTH_REQUIRED: 'Faça login novamente para confirmar seu voto.',
    INCOMPLETE_BALLOT: 'Selecione pelo menos 1 deputado federal e 2 senadores antes de finalizar.',
    DUPLICATED_CANDIDATE: 'O mesmo candidato não pode ser usado mais de uma vez no mesmo voto.',
    TOO_MANY_SELECTIONS: 'Você atingiu o limite técnico de candidatos salvos neste rascunho.',
    INVALID_CANDIDATE_OFFICE: 'Um dos candidatos não pertence ao cargo desta etapa.',
    INVALID_CANDIDATE_STATE: 'Um dos candidatos não pertence ao estado selecionado.',
    STATE_MISMATCH: 'O estado do rascunho mudou. Volte ao início e confirme seu estado.',
    VOTE_ALREADY_CAST: 'Seu voto já foi registrado. Por segurança, ele não pode ser alterado.',
    VOTER_NOT_ELIGIBLE: 'Seu cadastro não está habilitado para votar nesta eleição.',
    VOTER_NOT_ENROLLED: 'Não encontramos sua habilitação para esta eleição.',
    RECEIPT_NOT_RETURNED: 'O voto não retornou um recibo válido. Tente novamente.',
    FUNCTION_UNREACHABLE: 'Não foi possível conectar ao servidor de votação. Verifique a implantação da API e tente novamente.',
    not_found: 'Servidor de votação indisponível. Verifique a implantação da API.',
    internal: 'Servidor de votação indisponível ou sem configuração de acesso.',
    unavailable: 'Servidor de votação temporariamente indisponível. Tente novamente em instantes.',
    unauthenticated: 'Faça login novamente para continuar.',
    already_exists: 'Seu voto já foi registrado. Por segurança, ele não pode ser alterado.',
    permission_denied: 'Você não tem permissão para votar nesta eleição.',
    failed_precondition: 'Não foi possível confirmar sua habilitação para votar.',
    invalid_argument: 'Os dados do voto são inválidos. Revise suas escolhas.'
  };

  const normalizedCode = String(error?.code || '')
    .replace(/^functions\//, '')
    .replace(/-/g, '_');
  return messages[normalizedCode] || messages[error?.message] || 'Não foi possível registrar o voto. Tente novamente.';
};

export const STEP_GUIDANCE_MESSAGES = Object.freeze({
  estado: 'Selecione 1 estado para continuar.',
  presidente: 'Selecione pelo menos 1 candidato a presidente para continuar.',
  deputado: 'Selecione pelo menos 1 candidato para continuar.',
  senador: 'Selecione pelo menos 2 candidatos para continuar.'
});

export const getIncompleteStepMessage = (completedSteps = {}) => {
  if (!completedSteps.estado) return STEP_GUIDANCE_MESSAGES.estado;
  if (!completedSteps.presidente) return STEP_GUIDANCE_MESSAGES.presidente;
  if (!completedSteps.senador) return STEP_GUIDANCE_MESSAGES.senador;
  if (!completedSteps.deputado) return STEP_GUIDANCE_MESSAGES.deputado;
  return 'Todas as etapas já foram concluídas.';
};

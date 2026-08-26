export const ACTIVE_ELECTION_ID = import.meta.env.VITE_ACTIVE_ELECTION_ID || 'congresso-2026';
export const CAST_VOTE_FUNCTION_NAME = import.meta.env.VITE_CAST_VOTE_FUNCTION || 'castAnonymousVote';
export const DELETE_USER_ELECTION_DATA_FUNCTION_NAME = import.meta.env.VITE_DELETE_USER_ELECTION_DATA_FUNCTION || 'deleteUserElectionData';
export const CREATE_PLAN_HANDOFF_TOKEN_FUNCTION_NAME = import.meta.env.VITE_CREATE_PLAN_HANDOFF_TOKEN_FUNCTION || 'createPlanHandoffToken';
export const REDEEM_PLAN_HANDOFF_TOKEN_FUNCTION_NAME = import.meta.env.VITE_REDEEM_PLAN_HANDOFF_TOKEN_FUNCTION || 'redeemPlanHandoffToken';
export const SAVE_BALLOT_STATE_FUNCTION_NAME = import.meta.env.VITE_SAVE_BALLOT_STATE_FUNCTION || 'saveBallotState';
export const SAVE_BALLOT_STEP_FUNCTION_NAME = import.meta.env.VITE_SAVE_BALLOT_STEP_FUNCTION || 'saveBallotStepSelection';
export const SYNC_USER_PROFILE_FUNCTION_NAME = import.meta.env.VITE_SYNC_USER_PROFILE_FUNCTION || 'syncUserProfile';

export const BALLOT_SCHEMA_VERSION = 1;
export const VISITOR_DRAFT_ID = 'visitor';

export const OFFICE_MINIMUM_SELECTIONS = {
  deputado_federal: 1,
  senadores: 2
};

export const OFFICE_DISPLAY_LIMITS = {
  deputado_federal: 1,
  senadores: 2
};

export const BALLOT_ROUTES = {
  estado: '/home',
  deputadoFederal: '/escolher-deputado-federal',
  senadores: '/escolher-senadores',
  senador1: '/escolher-senador-1',
  senador2: '/escolher-senador-2',
  meuPlano: '/resumo',
  continuarPlano: '/continuar-plano',
  continuarPlanoCurto: '/c'
};

export const BALLOT_FLOW_STEPS = [
  {
    id: 'deputado_federal',
    officeKey: 'deputado_federal',
    route: BALLOT_ROUTES.deputadoFederal,
    title: 'Deputado Federal'
  },
  {
    id: 'senadores_1',
    officeKey: 'senadores',
    route: BALLOT_ROUTES.senadores,
    title: 'Senadores'
  },
  {
    id: 'senadores_2',
    officeKey: 'senadores',
    route: BALLOT_ROUTES.senadores,
    title: 'Senadores'
  }
];

export const BALLOT_FLOW_STEP_IDS = BALLOT_FLOW_STEPS.map((step) => step.id);

export const LEGACY_FLOW_STEP_ALIASES = {
  deputado_federal: ['deputado_federal_reeleger', 'deputado_federal_renovar'],
  senadores_1: ['senadores_reeleger'],
  senadores_2: ['senadores_renovar']
};

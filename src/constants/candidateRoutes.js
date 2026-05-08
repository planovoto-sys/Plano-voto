import { BALLOT_ROUTES } from '@/constants/ballot';

export const CANDIDATE_ROUTES = {
  deputadoFederal: {
    cargo: 'Deputado Federal',
    chaveBanco: 'deputado_federal',
    chaveGrupo: 'deputado_federal',
    titulo: 'Deputado Federal',
    subtitulo: 'Escolha 1 candidato.',
    rotaAnterior: BALLOT_ROUTES.estado,
    proximaRota: BALLOT_ROUTES.senadores
  },
  senadores: {
    cargo: 'Senador',
    chaveBanco: 'senadores',
    chaveGrupo: 'senadores_1',
    chaveGrupos: ['senadores_1', 'senadores_2'],
    titulo: 'Senadores',
    subtitulo: 'Escolha 2 candidatos',
    rotaAnterior: BALLOT_ROUTES.deputadoFederal,
    proximaRota: BALLOT_ROUTES.resultado
  }
};

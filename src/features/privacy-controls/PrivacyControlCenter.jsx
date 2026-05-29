import { Link } from 'react-router-dom';
import LocalDataActions from './LocalDataActions';

const CONTROL_LINKS = [
  {
    title: 'Cookies e permissões',
    body: 'Gerencie cookies opcionais, análise, personalização, marketing e estudos agregados.',
    to: '/cookies'
  },
  {
    title: 'Dados deste dispositivo',
    body: 'Apague rascunhos, dados offline, cache de candidatos e permissões locais.',
    to: '/dados-no-dispositivo'
  },
  {
    title: 'Excluir conta e dados',
    body: 'Solicite ou execute exclusão de dados eleitorais salvos na conta.',
    to: '/excluir-dados'
  },
  {
    title: 'Política de Privacidade',
    body: 'Entenda quais dados podem ser tratados e como o app usa essas informações.',
    to: '/politica-de-privacidade'
  },
  {
    title: 'LGPD',
    body: 'Conheça seus direitos e como pedir acesso, correção, exclusão ou oposição.',
    to: '/lgpd'
  },
  {
    title: 'Termos de Uso',
    body: 'Veja as regras do serviço e os limites dos indicadores exibidos.',
    to: '/termos-de-uso'
  },
  {
    title: 'Aviso Eleitoral',
    body: 'Entenda por que o app não é órgão eleitoral nem votação oficial.',
    to: '/aviso-eleitoral'
  }
];

export default function PrivacyControlCenter() {
  return (
    <section className="privacy-control-center" aria-labelledby="privacy-control-center-title">
      <div className="privacy-control-center__heading">
        <span>Central de Privacidade</span>
        <h2 id="privacy-control-center-title">Escolha o que deseja revisar ou controlar</h2>
      </div>

      <div className="privacy-control-links">
        {CONTROL_LINKS.map((item) => (
          <Link className="privacy-control-link" key={item.to} to={item.to}>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </Link>
        ))}
      </div>

      <LocalDataActions compact />
    </section>
  );
}

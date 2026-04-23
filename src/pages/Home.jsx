import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/useUser';
import { db } from '../services/firebaseConfig';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { clearBallotDraft, clearVoteReceipt, hasBallotSelections } from '../services/votingService';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import TourModal from '../components/TourModal'; // IMPORTADO O TOUR MODAL

const LISTA_ESTADOS = [
  { id: 'AC', nome: 'Acre', sigla: 'AC' }, { id: 'AL', nome: 'Alagoas', sigla: 'AL' },
  { id: 'AP', nome: 'Amapá', sigla: 'AP' }, { id: 'AM', nome: 'Amazonas', sigla: 'AM' },
  { id: 'BA', nome: 'Bahia', sigla: 'BA' }, { id: 'CE', nome: 'Ceará', sigla: 'CE' },
  { id: 'DF', nome: 'Distrito Federal', sigla: 'DF' }, { id: 'ES', nome: 'Espírito Santo', sigla: 'ES' },
  { id: 'GO', nome: 'Goiás', sigla: 'GO' }, { id: 'MA', nome: 'Maranhão', sigla: 'MA' },
  { id: 'MT', nome: 'Mato Grosso', sigla: 'MT' }, { id: 'MS', nome: 'Mato Grosso do Sul', sigla: 'MS' },
  { id: 'MG', nome: 'Minas Gerais', sigla: 'MG' }, { id: 'PA', nome: 'Pará', sigla: 'PA' },
  { id: 'PB', nome: 'Paraíba', sigla: 'PB' }, { id: 'PR', nome: 'Paraná', sigla: 'PR' },
  { id: 'PE', nome: 'Pernambuco', sigla: 'PE' }, { id: 'PI', nome: 'Piauí', sigla: 'PI' },
  { id: 'RJ', nome: 'Rio de Janeiro', sigla: 'RJ' }, { id: 'RN', nome: 'Rio Grande do Norte', sigla: 'RN' },
  { id: 'RS', nome: 'Rio Grande do Sul', sigla: 'RS' }, { id: 'RO', nome: 'Rondônia', sigla: 'RO' },
  { id: 'RR', nome: 'Roraima', sigla: 'RR' }, { id: 'SC', nome: 'Santa Catarina', sigla: 'SC' },
  { id: 'SP', nome: 'São Paulo', sigla: 'SP' }, { id: 'SE', nome: 'Sergipe', sigla: 'SE' },
  { id: 'TO', nome: 'Tocantins', sigla: 'TO' }
];

const normalizarBusca = (valor) => (
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

export default function Home() {
  const { user, userData, userEligibility, loading: userLoading, filtroAtivo } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEstado, setPendingEstado] = useState(null);
  const [busca, setBusca] = useState('');
  
  // ESTADO PARA O TOUR NA HOME
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    if (userEligibility?.has_voted) {
      navigate('/finalizacao', { replace: true });
    }
  }, [userEligibility?.has_voted, navigate]);

  // TEXTOS DO TOUR ESPECÍFICOS PARA A HOME (Baseados no PDF)
  const tourSteps = [
    { target: '#tour-busca', title: 'PESQUISA', content: 'Pesquisa o estado em que você vota.' },
    { target: '#tour-lista', title: 'LISTA', content: 'Mostra os estados a serem selecionados.' }
  ];

  const selecaoInicial = userData?.estado ? LISTA_ESTADOS.filter(estado => estado.sigla === userData.estado) : [];

  const listaExibida = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return LISTA_ESTADOS;

    return LISTA_ESTADOS.filter((estado) => {
      const nome = normalizarBusca(estado.nome);
      const sigla = normalizarBusca(estado.sigla);
      const nomeCompleto = normalizarBusca(`${estado.nome} ${estado.sigla}`);

      return nome.includes(termo) || sigla.includes(termo) || nomeCompleto.includes(termo);
    });
  }, [busca]);

  const handleConfirmar = async (selecionados) => {
    if (selecionados.length === 0) return;
    const novoEstado = selecionados[0].sigla;

    if (userData?.estado && userData.estado !== novoEstado) {
      if (hasBallotSelections(user.uid)) {
        setPendingEstado(novoEstado);
        setModalOpen(true);
        return;
      }
    }
    executarMudanca(novoEstado);
  };

  const executarMudanca = async (novoEstado) => {
    setLoading(true); setModalOpen(false);
    try {
      const userRef = doc(db, "users", user.uid);
      if (userData?.estado && userData.estado !== novoEstado) {
        clearBallotDraft(user.uid);
        clearVoteReceipt(user.uid);
        await updateDoc(userRef, { estado: novoEstado, updated_at: serverTimestamp() });
      } else {
        await updateDoc(userRef, { estado: novoEstado, updated_at: serverTimestamp() });
      }
      navigate('/escolher-deputado-federal');
    } catch (e) { console.error("Erro ao salvar estado: ", e); } finally { setLoading(false); }
  };

  return (
    <>
      <Sidebar />
      <TourModal steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />
      
      <SelectBase
        titulo="SELECIONE SEU ESTADO" dados={listaExibida} limiteSelecao={1} selecaoInicial={selecaoInicial}
        carregando={userLoading || loading} mostrarBusca={true} valorBusca={busca} onChangeBusca={setBusca}
        onConfirmar={handleConfirmar} onVoltar={() => navigate(-1)}
        linhasVisiveis={6} 
        abaAtiva={filtroAtivo}
        onHelpClick={() => setIsTourOpen(true)} /* ATIVA O BOTÃO "i" NA TELA DE ESTADOS */
        renderItem={(estado) => (
          <div className="state-centered-name">
            <span className="state-sigla">{estado.sigla}</span>
            <span className="state-full-name">{estado.nome}</span>
          </div>
        )}
      />
      <ConfirmModal isOpen={modalOpen} titulo="MUDANÇA DE ESTADO" mensagem="Ao mudar de estado, suas seleções atuais serão apagadas. Deseja continuar?" textoConfirmar="SIM" textoCancelar="NÃO" tipo="perigo" onConfirm={() => executarMudanca(pendingEstado)} onCancel={() => setModalOpen(false)} />
    </>
  );
}

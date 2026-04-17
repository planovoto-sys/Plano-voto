import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';

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

export default function Home() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingEstado, setPendingEstado] = useState(null);

  const selecaoInicial = userData?.estado 
    ? LISTA_ESTADOS.filter(estado => estado.sigla === userData.estado)
    : [];

  const handleConfirmar = async (selecionados) => {
    if (selecionados.length === 0) return;
    const novoEstado = selecionados[0].sigla;

    if (userData?.estado && userData.estado !== novoEstado) {
      const escolhidos = userData.candidatos_escolhidos || {};
      const temCandidatos = escolhidos.deputado_federal || (escolhidos.senadores && escolhidos.senadores.length > 0);
      
      if (temCandidatos) {
        setPendingEstado(novoEstado);
        setModalOpen(true); 
        return; 
      }
    }

    executarMudanca(novoEstado);
  };

  const executarMudanca = async (novoEstado) => {
    setLoading(true);
    setModalOpen(false);
    
    try {
      const userRef = doc(db, "users", user.uid);

      if (userData?.estado && userData.estado !== novoEstado) {
        const escolhidos = userData.candidatos_escolhidos || {};
        const nomesParaLimpar = [];
        
        if (escolhidos.deputado_federal) nomesParaLimpar.push(escolhidos.deputado_federal);
        if (escolhidos.senadores && Array.isArray(escolhidos.senadores)) {
          nomesParaLimpar.push(...escolhidos.senadores);
        }

        if (nomesParaLimpar.length > 0) {
          const q = query(collection(db, "candidatos"), where("Nome", "in", nomesParaLimpar));
          const snap = await getDocs(q);
          
          const promises = snap.docs.map(d => {
            return updateDoc(doc(db, "candidatos", d.id), { votos_recebidos: increment(-1) });
          });
          await Promise.all(promises);
        }

        await updateDoc(userRef, { 
          estado: novoEstado,
          candidatos_escolhidos: null 
        });
      } else {
        await updateDoc(userRef, { estado: novoEstado });
      }

      navigate('/escolher-deputado-federal');
    } catch (e) {
      console.error("Erro ao salvar estado e limpar votos: ", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <SelectBase
        titulo="SELECIONE SEU ESTADO"
        dados={LISTA_ESTADOS}
        limiteSelecao={1}
        selecaoInicial={selecaoInicial}
        carregando={userLoading || loading}
        mostrarBusca={false}
        onConfirmar={handleConfirmar}
        onVoltar={() => navigate(-1)}
        renderItem={(estado) => (
          <div className="state-centered-name">
            {estado.sigla}
          </div>
        )}
      />

      <ConfirmModal 
        isOpen={modalOpen}
        titulo="MUDAR DE ESTADO?"
        mensagem="Ao escolher um novo estado, os candidatos que você já selecionou serão desmarcados da sua lista. Deseja prosseguir?"
        textoConfirmar="SIM, MUDAR"
        textoCancelar="VOLTAR"
        tipo="perigo"
        onConfirm={() => executarMudanca(pendingEstado)}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
}
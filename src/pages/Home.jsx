import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';

// Uma lista fixa padrão de estados (pode adaptar com a sua se ela vier do banco)
const LISTA_ESTADOS = [
  { id: 'AC', nome: 'Acre', sigla: 'AC' },
  { id: 'AL', nome: 'Alagoas', sigla: 'AL' },
  { id: 'AP', nome: 'Amapá', sigla: 'AP' },
  { id: 'AM', nome: 'Amazonas', sigla: 'AM' },
  { id: 'BA', nome: 'Bahia', sigla: 'BA' },
  { id: 'CE', nome: 'Ceará', sigla: 'CE' },
  { id: 'DF', nome: 'Distrito Federal', sigla: 'DF' },
  { id: 'ES', nome: 'Espírito Santo', sigla: 'ES' },
  { id: 'GO', nome: 'Goiás', sigla: 'GO' },
  { id: 'MA', nome: 'Maranhão', sigla: 'MA' },
  { id: 'MT', nome: 'Mato Grosso', sigla: 'MT' },
  { id: 'MS', nome: 'Mato Grosso do Sul', sigla: 'MS' },
  { id: 'MG', nome: 'Minas Gerais', sigla: 'MG' },
  { id: 'PA', nome: 'Pará', sigla: 'PA' },
  { id: 'PB', nome: 'Paraíba', sigla: 'PB' },
  { id: 'PR', nome: 'Paraná', sigla: 'PR' },
  { id: 'PE', nome: 'Pernambuco', sigla: 'PE' },
  { id: 'PI', nome: 'Piauí', sigla: 'PI' },
  { id: 'RJ', nome: 'Rio de Janeiro', sigla: 'RJ' },
  { id: 'RN', nome: 'Rio Grande do Norte', sigla: 'RN' },
  { id: 'RS', nome: 'Rio Grande do Sul', sigla: 'RS' },
  { id: 'RO', nome: 'Rondônia', sigla: 'RO' },
  { id: 'RR', nome: 'Roraima', sigla: 'RR' },
  { id: 'SC', nome: 'Santa Catarina', sigla: 'SC' },
  { id: 'SP', nome: 'São Paulo', sigla: 'SP' },
  { id: 'SE', nome: 'Sergipe', sigla: 'SE' },
  { id: 'TO', nome: 'Tocantins', sigla: 'TO' }
];

export default function Home() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Controle da Aba na Home
  const [abaAtiva, setAbaAtiva] = useState('geral');

  // Verifica se o usuário já tem um estado salvo para ser a seleção inicial
  const selecaoInicial = userData?.estado 
    ? LISTA_ESTADOS.filter(estado => estado.sigla === userData.estado)
    : [];

  const handleConfirmar = async (selecionados) => {
    if (selecionados.length === 0) return;
    setLoading(true);
    try {
      const estadoEscolhido = selecionados[0].sigla;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { estado: estadoEscolhido });
      navigate('/escolher-deputado-federal'); // Avança para a próxima tela
    } catch (e) {
      console.error("Erro ao salvar estado: ", e);
      setLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <SelectBase
        abas={['mulheres', 'geral', 'partidos']}
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        titulo="SELECIONE SEU ESTADO"
        dados={LISTA_ESTADOS}
        limiteSelecao={1} // Seleciona apenas 1 estado
        selecaoInicial={selecaoInicial}
        carregando={userLoading || loading}
        mostrarBotaoTodos={false} // Não precisa do botão de "Visualizar todos"
        onConfirmar={handleConfirmar}
        onVoltar={() => navigate(-1)} // Volta para tela anterior (login ou intro)
        renderItem={(estado) => (
          <>
            <div className="state-avatar">{estado.sigla}</div>
            <div className="state-full-name">{estado.nome.toUpperCase()}</div>
          </>
        )}
      />
    </>
  );
}
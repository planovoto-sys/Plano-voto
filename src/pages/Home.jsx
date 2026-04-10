import React, { useState, useMemo } from 'react';
import { db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import SelectBase from '../components/SelectBase';
import Sidebar from '../components/Sidebar';

const ESTADOS_BR = [
  { id: "AC", Nome: "Acre" }, { id: "AL", Nome: "Alagoas" }, { id: "AP", Nome: "Amapá" },
  { id: "AM", Nome: "Amazonas" }, { id: "BA", Nome: "Bahia" }, { id: "CE", Nome: "Ceará" },
  { id: "DF", Nome: "Distrito Federal" }, { id: "ES", Nome: "Espírito Santo" }, { id: "GO", Nome: "Goiás" },
  { id: "MA", Nome: "Maranhão" }, { id: "MT", Nome: "Mato Grosso" }, { id: "MS", Nome: "Mato Grosso do Sul" },
  { id: "MG", Nome: "Minas Gerais" }, { id: "PA", Nome: "Pará" }, { id: "PB", Nome: "Paraíba" },
  { id: "PR", Nome: "Paraná" }, { id: "PE", Nome: "Pernambuco" }, { id: "PI", Nome: "Piauí" },
  { id: "RJ", Nome: "Rio de Janeiro" }, { id: "RN", Nome: "Rio Grande do Norte" }, { id: "RS", Nome: "Rio Grande do Sul" },
  { id: "RO", Nome: "Rondônia" }, { id: "RR", Nome: "Roraima" }, { id: "SC", Nome: "Santa Catarina" },
  { id: "SP", Nome: "São Paulo" }, { id: "SE", Nome: "Sergipe" }, { id: "TO", Nome: "Tocantins" }
];

export default function Home() {
  const { user, userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const selecaoInicial = useMemo(() => {
    return userData?.estado ? ESTADOS_BR.filter(e => e.id === userData.estado) : [];
  }, [userData]);

  const handleConfirmar = async (selecionados) => {
    if (!user || selecionados.length === 0) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { estado: selecionados[0].id });
      navigate('/escolher-deputado-federal'); 
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sidebar />
      <SelectBase
        titulo={<>SELECIONE<br/>SEU ESTADO</>}
        dados={ESTADOS_BR}
        limiteSelecao={1}
        selecaoInicial={selecaoInicial}
        carregando={userLoading || loading}
        onVoltar={() => navigate('/')}
        onConfirmar={handleConfirmar}
        renderItem={(estado) => (
          <>
            <div className="state-avatar">{estado.id}</div>
            <span className="state-full-name">{estado.Nome}</span>
          </>
        )}
      />
    </>
  );
}
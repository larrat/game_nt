import React, { useState, useEffect } from 'react';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

// Mapeamento de posições para os prédios no mockup visual
const BUILDING_INFO = {
  'kage': { img: '/images/icons/kage_icon_1782967244288.jpg', name: 'Gabinete do Kage', desc: 'Acesso a Missões Rank-S.', top: '20%', left: '50%' },
  'hospital': { img: '/images/icons/hospital_icon_1782967252280.jpg', name: 'Hospital', desc: 'Recuperar HP.', top: '25%', left: '20%' },
  'historia': { img: '/images/imgi_29_scroll_gold.jpg', name: 'Escritório do Hokage', desc: 'Sagas.', top: '40%', left: '45%' },
  'dojo': { img: '/images/icons/dojo_icon_1782967259930.jpg', name: 'Academia', desc: 'Bônus de XP.', top: '40%', left: '75%' },
  'ichiraku': { img: '/images/icons/ichiraku_icon_1782967269460.jpg', name: 'Restaurante', desc: 'Stamina extra.', top: '60%', left: '35%' },
  'blacksmith': { img: '/images/icons/blacksmith_icon_1782967278110.jpg', name: 'Ferreiro', desc: 'Itens lendários.', top: '60%', left: '65%' },
  'invasao': { img: '/images/icons/gates_icon_1782967286132.jpg', name: 'Alerta de Invasão', desc: 'World Boss.', top: '10%', left: '45%' },
  'gates': { img: '/images/icons/gates_icon_1782967286132.jpg', name: 'Portões', desc: 'Sair para o Mundo.', top: '80%', left: '50%', isGate: true }
};

export default function Vila({ player, updatePlayer }) {
  const [villageData, setVillageData] = useState(null);
  const [selectedBuildingKey, setSelectedBuildingKey] = useState(null);
  const [kage, setKage] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (!player) return;
    async function fetchData() {
      // Village
      const { data: vData } = await supabase
        .from('villages')
        .select('*')
        .eq('id', player.village_id)
        .single();
      if (vData) setVillageData(vData);

      // Kage
      const { data: kageData } = await supabase
        .from('players')
        .select('name, level, class')
        .eq('village_id', player.village_id)
        .order('level', { ascending: false })
        .order('xp', { ascending: false })
        .limit(1);
      if (kageData && kageData.length > 0) setKage(kageData[0]);

      // Buildings
      try {
        const { data: bData, error } = await supabase
          .from('village_buildings')
          .select('*')
          .eq('village_id', player.village_id)
          .order('id', { ascending: true });
        
        if (!error && bData) setBuildings(bData);
      } catch (e) {
        console.error("Tabela village_buildings não existe ainda.");
      }
    }
    fetchData();
  }, [player]);

  const handleBuildingClick = (key) => {
    if (key === 'gates') {
      navigate('/mapa');
      return;
    }
    if (key === 'blacksmith') {
      navigate('/ferreiro');
      return;
    }
    if (key === 'invasao') {
      navigate('/evento');
      return;
    }
    if (key === 'historia') {
      navigate('/historia');
      return;
    }
    setSelectedBuildingKey(key);
  };

  const handleDonate = async (building) => {
    if (building.level < 0) {
      addToast("Prédio está danificado! Requer Missão de Reparo.", "error");
      return;
    }
    const donation = 100000;
    if (player.ryous < donation) {
      addToast(`Ryous insuficientes. Custa ¥${donation.toLocaleString()}`, "error");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('doar_vila', {
        p_player_id: player.id,
        p_building_type: building.building_type,
        p_amount: donation
      });

      if (error) {
        throw new Error(error.message);
      }

      const { new_donations, new_level, new_cost } = data;

      if (new_level > building.level) {
        addToast(`🎉 ${BUILDING_INFO[building.building_type].name} subiu para o Nível ${new_level}!`, "success");
      }

      addToast(`Doou ¥${donation.toLocaleString()}!`, "success");
      await updatePlayer(player.id);
      
      setBuildings(buildings.map(b => b.id === building.id ? { ...b, current_donations: new_donations, level: new_level, next_level_cost: new_cost } : b));
    } catch (err) {
      addToast(err.message || "Erro na doação.", "error");
    }
    setLoading(false);
  };

  const selectedBuildingInfo = selectedBuildingKey ? BUILDING_INFO[selectedBuildingKey] : null;
  const dbBuilding = selectedBuildingKey ? buildings.find(b => b.building_type === selectedBuildingKey) : null;
  const buildingPercent = dbBuilding ? Math.min(100, (Number(dbBuilding.current_donations) / Number(dbBuilding.next_level_cost)) * 100) : 0;
  const isDamaged = dbBuilding ? dbBuilding.level < 0 : false;

  if (!player) return null;

  return (
    <div className="p-0 fixed inset-0 overflow-hidden">

      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/images/bg_${player.village_id}.jpg), url(/images/bg_login.jpg)` }} 
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 z-1" style={{ background: 'rgba(0,0,0,0.45)' }} />

      {/* Header top-left */}
      <div className="absolute z-10 top-4 left-6">
        <PageHeader eyebrow='Administração e Projetos' title={`Vila da ${villageData?.name || 'Desconhecida'}`} subtitle="Clique nos edifícios para interagir." />
      </div>

      {/* Kage card bottom-right */}
      <div className="absolute z-10 bottom-6 right-6">
        <div className="card-glass text-center p-3 w-[180px] bg-black-alpha-90 backdrop-blur-md border border-solid border-gold">
          <div className="gold uppercase text-xs font-bold mb-1">{villageData?.leader_title || 'Líder'}</div>
          <div className="text-3xl mb-1">👑</div>
          <div className="paper font-medium mb-1 text-lg">{kage ? kage.name : 'Vago'}</div>
          <div className="muted text-xs">{kage ? `${kage.class || 'NIN'} - Nv. ${kage.level}` : 'Nenhum líder'}</div>
        </div>
      </div>

      {/* Buildings area - relative within the fixed container */}
      <div className="absolute inset-0 z-5">


        {/* Renderizar Prédios */}
        {Object.entries(BUILDING_INFO).map(([key, info]) => (
          <div
            key={key}
            onClick={() => handleBuildingClick(key)}
            className="absolute flex-col items-center cursor-pointer z-5"
            style={{
              top: info.top,
              left: info.left,
              transform: 'translate(-50%, -50%)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
          >
            <div 
              className="w-16 h-16 rounded-full border-2 border-gold flex-row items-center justify-center overflow-hidden"
              style={{
                background: info.isGate ? 'rgba(239, 68, 68, 0.8)' : 'rgba(20, 20, 25, 0.9)',
                boxShadow: '0 0 20px rgba(0,0,0,0.8)'
              }}
            >
              <img src={info.img} alt={info.name} className="w-full h-full object-cover" />
            </div>
            <div className="paper bg-black-alpha-80 px-3 py-1 rounded-sm mt-2 text-xs whitespace-nowrap border-line-solid">
              {info.name}
            </div>
          </div>
        ))}

        {/* Modal Simples do Prédio */}
        {selectedBuildingInfo && !selectedBuildingInfo.isGate && (
          <div className="absolute z-20 w-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className={`card-glass bg-black-alpha-95 border border-solid ${isDamaged ? 'border-danger' : 'border-gold'}`}>
              <div className="text-center mb-4">
                <img src={selectedBuildingInfo.img} alt={selectedBuildingInfo.name} className={`w-20 h-20 rounded-full border-2 border-gold inline-block ${isDamaged ? 'grayscale brightness-50' : ''}`} />
              </div>
              {dbBuilding && (
                <div className={isDamaged ? "danger uppercase text-xs font-bold mb-1 text-center" : "gold text-xs font-bold mb-1 text-center"}>
                  {isDamaged ? 'DESTRUÍDO' : `Nível ${dbBuilding.level}`}
                </div>
              )}
              <h3 className="card-title text-center mb-2 text-2xl">{selectedBuildingInfo.name}</h3>
              <p className="muted text-center mb-6">{selectedBuildingInfo.desc}</p>
              
              {dbBuilding && !isDamaged && (
                <div className="mb-6">
                  <div className="flex-between mono muted mb-2 text-xs">
                    <div>DOAÇÕES ({dbBuilding.current_donations} / {dbBuilding.next_level_cost})</div>
                    <div>{buildingPercent.toFixed(1)}%</div>
                  </div>
                  <div className="progress-track mb-4">
                    <div className="progress-fill gold" style={{ width: `${buildingPercent}%` }}></div>
                  </div>
                  <button className="btn-primary w-full p-3 text-md" onClick={() => handleDonate(dbBuilding)} disabled={loading}>
                    Doar ¥ 100.000
                  </button>
                </div>
              )}

              {isDamaged && (
                <div className="mb-6">
                  <button className="btn-danger w-full p-2 text-xs" disabled={true}>
                    Requer Missão de Reparo
                  </button>
                </div>
              )}

              {!dbBuilding && (
                <div className="muted text-center mb-6 text-xs">
                  (Planta não encontrada no banco de dados)
                </div>
              )}

              <div className="flex-col gap-md">
                <button className="btn-ghost" onClick={() => setSelectedBuildingKey(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

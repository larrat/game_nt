import React, { useState, useEffect } from 'react';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

// Mapeamento de posições para os prédios no mockup visual
const BUILDING_INFO = {
  'kage': { icon: '👑', name: 'Gabinete do Kage', desc: 'Acesso a Missões Rank-S.', top: '20%', left: '50%' },
  'hospital': { icon: '🏥', name: 'Hospital', desc: 'Regeneração de Vida.', top: '40%', left: '25%' },
  'dojo': { icon: '🥋', name: 'Academia', desc: 'Bônus de XP.', top: '40%', left: '75%' },
  'ichiraku': { icon: '🍲', name: 'Restaurante', desc: 'Stamina extra.', top: '60%', left: '35%' },
  'blacksmith': { icon: '🗡️', name: 'Ferreiro', desc: 'Itens lendários.', top: '60%', left: '65%' },
  'gates': { icon: '🛡️', name: 'Portões', desc: 'Sair para o Mundo.', top: '80%', left: '50%', isGate: true }
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
      const { error: pErr } = await supabase.from('players').update({ ryous: player.ryous - donation }).eq('id', player.id);
      if (pErr) throw pErr;

      let newDonations = Number(building.current_donations || 0) + donation;
      let newLevel = building.level;
      let newCost = Number(building.next_level_cost || 5000000);
      
      if (newDonations >= newCost) {
        newLevel += 1;
        newDonations = newDonations - newCost;
        newCost = Math.floor(newCost * 1.5);
        addToast(`🎉 ${BUILDING_INFO[building.building_type].name} subiu para o Nível ${newLevel}!`, "success");
      }

      const { error: bErr } = await supabase.from('village_buildings').update({
        current_donations: newDonations,
        level: newLevel,
        next_level_cost: newCost
      }).eq('id', building.id);
      if (bErr) throw bErr;

      addToast(`Doou ¥${donation.toLocaleString()}!`, "success");
      await updatePlayer(player.user_id);
      
      setBuildings(buildings.map(b => b.id === building.id ? { ...b, current_donations: newDonations, level: newLevel, next_level_cost: newCost } : b));
      
      await supabase.from('village_donors').upsert({
        building_id: building.id,
        player_id: player.id,
        last_donated_at: new Date()
      }, { onConflict: 'building_id, player_id' });
    } catch (err) {
      addToast("Erro na doação.", "error");
    }
    setLoading(false);
  };

  const selectedBuildingInfo = selectedBuildingKey ? BUILDING_INFO[selectedBuildingKey] : null;
  const dbBuilding = selectedBuildingKey ? buildings.find(b => b.building_type === selectedBuildingKey) : null;
  const buildingPercent = dbBuilding ? Math.min(100, (Number(dbBuilding.current_donations) / Number(dbBuilding.next_level_cost)) * 100) : 0;
  const isDamaged = dbBuilding ? dbBuilding.level < 0 : false;

  if (!player) return null;

  return (
    <div style={{ padding: 0, position: 'fixed', inset: 0, overflow: 'hidden' }}>

      {/* Background Image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(/images/bg_${player.village_id}.jpg), url(/images/bg_login.jpg)`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        zIndex: 0
      }} />
      {/* Dark Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />

      {/* Header top-left */}
      <div style={{ position: 'absolute', top: '16px', left: '24px', zIndex: 10 }}>
        <PageHeader eyebrow='Administração e Projetos' title={`Vila da ${villageData?.name || 'Desconhecida'}`} subtitle="Clique nos edifícios para interagir." />
      </div>

      {/* Kage card bottom-right */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 10 }}>
        <div className="card-glass" style={{ textAlign: 'center', border: '1px solid var(--gold)', width: '180px', padding: '12px', background: 'rgba(15,15,20,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="gold uppercase" style={{ fontSize: '10px', letterSpacing: '1px', marginBottom: '6px', fontWeight: 'bold' }}>{villageData?.leader_title || 'Líder'}</div>
          <div style={{ fontSize: '28px', marginBottom: '6px' }}>👑</div>
          <div className="paper" style={{ fontWeight: 600, marginBottom: '2px', fontSize: '14px' }}>{kage ? kage.name : 'Vago'}</div>
          <div className="muted" style={{ fontSize: '10px' }}>{kage ? `${kage.class || 'NIN'} - Nv. ${kage.level}` : 'Nenhum líder'}</div>
        </div>
      </div>

      {/* Buildings area - relative within the fixed container */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>


        {/* Renderizar Prédios */}
        {Object.entries(BUILDING_INFO).map(([key, info]) => (
          <div
            key={key}
            onClick={() => handleBuildingClick(key)}
            style={{
              position: 'absolute',
              top: info.top,
              left: info.left,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              zIndex: 5,
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
          >
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', background: info.isGate ? 'rgba(239, 68, 68, 0.8)' : 'rgba(20, 20, 25, 0.9)',
              border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '30px', boxShadow: '0 0 20px rgba(0,0,0,0.8)'
            }}>
              {info.icon}
            </div>
            <div className="paper" style={{
              background: 'rgba(0,0,0,0.8)', padding: '4px 12px', borderRadius: '4px', marginTop: '8px',
              fontSize: '12px', whiteSpace: 'nowrap', border: '1px solid var(--line)'
            }}>
              {info.name}
            </div>
          </div>
        ))}

        {/* Modal Simples do Prédio */}
        {selectedBuildingInfo && !selectedBuildingInfo.isGate && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20, width: '400px' }}>
            <div className="card-glass" style={{ background: 'rgba(15,15,20,0.95)', border: isDamaged ? '1px solid var(--danger)' : '1px solid var(--gold)' }}>
              <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '8px' }}>{isDamaged ? '🔥' : selectedBuildingInfo.icon}</div>
              {dbBuilding && (
                <div className={isDamaged ? "danger uppercase" : "gold"} style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', textAlign: 'center' }}>
                  {isDamaged ? 'DESTRUÍDO' : `Nível ${dbBuilding.level}`}
                </div>
              )}
              <h3 className="card-title" style={{ textAlign: 'center', fontSize: '24px', marginBottom: '8px' }}>{selectedBuildingInfo.name}</h3>
              <p className="muted" style={{ textAlign: 'center', marginBottom: '24px' }}>{selectedBuildingInfo.desc}</p>
              
              {dbBuilding && !isDamaged && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="flex-between mono muted" style={{ marginBottom: '8px', fontSize: '10px' }}>
                    <div>DOAÇÕES ({dbBuilding.current_donations} / {dbBuilding.next_level_cost})</div>
                    <div>{buildingPercent.toFixed(1)}%</div>
                  </div>
                  <div className="progress-track" style={{ marginBottom: '16px' }}>
                    <div className="progress-fill gold" style={{ width: `${buildingPercent}%` }}></div>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', fontSize: '12px', padding: '10px' }} onClick={() => handleDonate(dbBuilding)} disabled={loading}>
                    Doar ¥ 100.000
                  </button>
                </div>
              )}

              {isDamaged && (
                <div style={{ marginBottom: '24px' }}>
                  <button className="btn-danger" style={{ width: '100%', fontSize: '12px', padding: '10px' }} disabled={true}>
                    Requer Missão de Reparo
                  </button>
                </div>
              )}

              {!dbBuilding && (
                <div className="muted" style={{ textAlign: 'center', marginBottom: '24px', fontSize: '12px' }}>
                  (Planta não encontrada no banco de dados)
                </div>
              )}

              <div className="flex-col" style={{ gap: '12px' }}>
                <button className="btn-ghost" onClick={() => setSelectedBuildingKey(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

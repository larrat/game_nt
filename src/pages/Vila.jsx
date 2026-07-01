import React, { useState, useEffect } from 'react';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

// Mapeamento de informações dos prédios
const BUILDING_INFO = {
  'hospital': { icon: '🏥', name: 'Hospital da Vila', desc: 'Regeneração passiva de Vida e Chakra.' },
  'dojo': { icon: '🥋', name: 'Academia Ninja', desc: 'Bônus de XP e missões mais rápidas.' },
  'blacksmith': { icon: '🗡️', name: 'Ferreiro', desc: 'Descontos e itens lendários.' },
  'kage': { icon: '📜', name: 'Gabinete do Kage', desc: 'Acesso a Missões Rank-S e encontros raros.' },
  'gates': { icon: '🛡️', name: 'Portões Principais', desc: 'Bônus de Defesa para todos da vila.' },
  'ichiraku': { icon: '🍲', name: 'Restaurante', desc: 'Bônus de consumíveis e Stamina extra.' }
};

export default function Vila({ player, updatePlayer }) {
  const [kage, setKage] = useState(null);
  const [villageData, setVillageData] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (!player) return;
    async function fetchData() {
      // Kage
      const { data: kageData } = await supabase
        .from('players')
        .select('name, level, class')
        .eq('village_id', player.village_id)
        .order('level', { ascending: false })
        .order('xp', { ascending: false })
        .limit(1);
      if (kageData && kageData.length > 0) setKage(kageData[0]);

      // Village
      const { data: vData } = await supabase
        .from('villages')
        .select('*')
        .eq('id', player.village_id)
        .single();
      if (vData) setVillageData(vData);

      // Buildings
      try {
        const { data: bData, error } = await supabase
          .from('village_buildings')
          .select('*')
          .eq('village_id', player.village_id)
          .order('id', { ascending: true });
        
        if (!error && bData) {
          const order = ['hospital', 'dojo', 'blacksmith', 'kage', 'gates', 'ichiraku'];
          const sorted = bData.sort((a, b) => order.indexOf(a.building_type) - order.indexOf(b.building_type));
          setBuildings(sorted);
        }
      } catch (e) {
        console.error("Tabela village_buildings não existe ainda.");
      }
    }
    fetchData();
  }, [player]);

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
      await updatePlayer(player.id);
      
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

  if (!player) return null;

  return (
    <div className="page">
      <PageHeader eyebrow='Administração e Projetos' title={`Vila da ${villageData?.name || 'Desconhecida'}`} subtitle="Doe recursos para expandir sua vila e ganhar bônus permanentes." />

      <div className="grid-auto" style={{ gap: '24px', marginBottom: '48px' }}>
        <div className="card" style={{ textAlign: 'center', border: '1px solid var(--gold)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--gold)' }}></div>
          <div className="gold uppercase" style={{ fontSize: '11px', letterSpacing: '1px', marginBottom: '12px', fontWeight: 'bold' }}>{villageData?.leader_title || 'Líder'}</div>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👑</div>
          <div className="paper" style={{ fontWeight: 600, marginBottom: '4px', fontSize: '18px' }}>{kage ? kage.name : 'Vago'}</div>
          <div className="muted" style={{ fontSize: '12px' }}>{kage ? `${kage.class || 'NIN'} - Lvl. ${kage.level}` : 'Nenhum líder'}</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 className="section-title" style={{ fontSize: '22px', marginBottom: '8px' }}>Edifícios e Projetos</h3>
        <p className="muted" style={{ fontSize: '13px' }}>Apenas os Ninjas dedicados ajudam sua comunidade a prosperar.</p>
      </div>

      {buildings.length === 0 ? (
        <div className="card card-glass" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="muted" style={{ fontSize: '40px', marginBottom: '16px' }}>🏗️</div>
          <h3 className="card-title">Edifícios em Construção</h3>
          <p className="muted" style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 24px' }}>
            As tabelas do banco de dados ainda não foram criadas ou a vila não possui plantas arquitetônicas. (Por favor, rode o script SQL do Lote 8).
          </p>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: '24px' }}>
          {buildings.map(b => {
            const info = BUILDING_INFO[b.building_type] || { icon: '🏢', name: 'Desconhecido', desc: '' };
            const percent = Math.min(100, (Number(b.current_donations) / Number(b.next_level_cost)) * 100);
            const isDamaged = b.level < 0;
            return (
              <div key={b.id} className="card card-glass" style={{ display: 'flex', flexDirection: 'column', filter: isDamaged ? 'grayscale(0.8)' : 'none', border: isDamaged ? '1px solid var(--danger)' : '1px solid var(--border)', position: 'relative' }}>
                {isDamaged && (
                   <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,0,0,0.05)', pointerEvents: 'none' }}></div>
                )}
                <div style={{ textAlign: 'center', marginBottom: '16px', zIndex: 1 }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>{isDamaged ? '🔥' : info.icon}</div>
                  <div className={isDamaged ? "danger uppercase" : "gold"} style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {isDamaged ? 'DESTRUÍDO' : `Nível ${b.level}`}
                  </div>
                  <h4 className="card-title" style={{ fontSize: '16px', marginBottom: '8px' }}>{info.name}</h4>
                  <p className="muted" style={{ fontSize: '12px', height: '36px' }}>{info.desc}</p>
                </div>
                <div style={{ marginTop: 'auto', zIndex: 1 }}>
                  {!isDamaged ? (
                    <>
                      <div className="flex-between mono muted" style={{ marginBottom: '8px', fontSize: '10px' }}>
                        <div>DOAÇÕES</div>
                        <div>{percent.toFixed(1)}%</div>
                      </div>
                      <div className="progress-track" style={{ marginBottom: '16px' }}>
                        <div className="progress-fill gold" style={{ width: `${percent}%` }}></div>
                      </div>
                      <button className="btn-primary" style={{ width: '100%', fontSize: '12px', padding: '10px' }} onClick={() => handleDonate(b)} disabled={loading}>
                        Doar ¥ 100.000
                      </button>
                    </>
                  ) : (
                    <button className="btn-danger" style={{ width: '100%', fontSize: '12px', padding: '10px' }} disabled={true}>
                      Requer Missão de Reparo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

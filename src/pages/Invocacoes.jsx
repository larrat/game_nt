import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import '../styles/challenges-v4.css';
import { useToast } from '../context/ToastContext';

export default function Invocacoes({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('meus'); // 'meus' ou 'todos'
  const [summons, setSummons] = useState([]);
  const [playerSummons, setPlayerSummons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (player) {
      loadData();
    }
  }, [player]);

  const loadData = async () => {
    setLoading(true);
    
    // Buscar todos os mascotes
    const { data: allSummons, error: err1 } = await supabase
      .from('summons')
      .select('*')
      .order('req_level', { ascending: true });
      
    if (err1) {
      console.error(err1);
      setLoading(false);
      return;
    }
    
    // Buscar contratos do jogador
    const { data: mySummons, error: err2 } = await supabase
      .from('player_summons')
      .select('*, summons(*)')
      .eq('player_id', player.id);
      
    if (err2) {
      console.error(err2);
      setLoading(false);
      return;
    }

    setSummons(allSummons || []);
    setPlayerSummons(mySummons || []);
    setLoading(false);
  };

  const signContract = async (summon) => {
    if (actionLoading) return;
    
    // Verificar se já possui
    if (playerSummons.some(ps => ps.summon_id === summon.id)) {
      addToast('Você já assinou contrato com este mascote.', 'info');
      return;
    }

    // Custo base imaginário para assinar
    const cost = summon.req_level * 100;
    
    if (player.ryous < cost) {
      addToast(`Ryous insuficientes. Necessário: ${cost} ¥`, 'error');
      return;
    }

    setActionLoading(true);
    
    // Assinar via RPC (já desconta ryous e insere)
    const { data, error } = await supabase.rpc('assinar_invocacao', {
      p_player_id: player.id,
      p_invocacao_id: summon.id
    });
    
    if (error || !data?.success) {
      addToast('Erro ao assinar contrato: ' + (error?.message || data?.error || 'operação não concluída'), 'error');
    } else {
      addToast(`Contrato assinado com ${summon.name}!`, 'success');
      await updatePlayer(player.id);
      await loadData();
    }
    
    setActionLoading(false);
  };

  const equipSummon = async (playerSummonId) => {
    if (actionLoading) return;
    setActionLoading(true);
    
    const { data, error } = await supabase.rpc('equipar_invocacao', {
      p_player_id: player.id,
      p_player_summon_id: playerSummonId,
      p_equipped: true
    });
      
    if (error || !data?.success) {
      addToast('Erro ao equipar: ' + (error?.message || data?.error || 'operação não concluída'), 'error');
    } else {
      addToast('Mascote invocado com sucesso!', 'success');
      await updatePlayer(player.id);
      await loadData();
    }
    
    setActionLoading(false);
  };

  const unequipAll = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    
    const { data, error } = await supabase.rpc('equipar_invocacao', {
      p_player_id: player.id,
      p_player_summon_id: null,
      p_equipped: false
    });
      
    if (error || !data?.success) {
      addToast('Erro ao recolher: ' + (error?.message || data?.error || 'operação não concluída'), 'error');
    } else {
      addToast('Mascote recolhido.', 'success');
      await updatePlayer(player.id);
      await loadData();
    }
    
    setActionLoading(false);
  };

  if (!player) return null;

  return (
    <div className="page kuro-summons-v4">
      <PageHeader 
        eyebrow="Arte Ninja Especial" 
        title="Kuchiyose no Jutsu" 
        subtitle="Gerencie seus contratos de invocação e mascotes de batalha." 
      />

      <div className="kuro-challenges-v4__tabs" role="tablist" aria-label="Contratos de invocação">
        <button 
          className="kuro-challenges-v4__tab" role="tab" aria-selected={activeTab === 'meus'} 
          onClick={() => setActiveTab('meus')}
        >
          Meus Contratos ({playerSummons.length})
        </button>
        <button 
          className="kuro-challenges-v4__tab" role="tab" aria-selected={activeTab === 'todos'} 
          onClick={() => setActiveTab('todos')}
        >
          Explorar Invocações
        </button>
      </div>

      {loading ? (
        <div className="card-glass muted text-center p-8">
          Consultando pergaminhos...
        </div>
      ) : activeTab === 'meus' ? (
        <div className="flex-col gap-md">
          {playerSummons.length === 0 ? (
            <div className="card-glass muted text-center p-8">
              Você ainda não assinou nenhum contrato de invocação.
            </div>
          ) : (
            <div className="kuro-challenges-v4__grid">
              {playerSummons.map(ps => {
                const s = ps.summons;
                return (
                  <div key={ps.id} className={`card-glass flex-col border border-solid ${ps.is_equipped ? 'border-gold' : 'border-white/10'}`}>
                    <div className="flex-row gap-md items-start">
                      <div className="text-4xl">{s.animal_type === 'Sapo' ? '🐸' : s.animal_type === 'Cobra' ? '🐍' : s.animal_type === 'Lesma' ? '🐌' : s.animal_type === 'Cachorro' ? '🐶' : '🐾'}</div>
                      <div className="flex-1">
                        <div className="flex-between">
                          <h3 className="paper text-lg m-0">{s.name}</h3>
                          {ps.is_equipped && <span className="badge badge-gold text-[10px]">Equipado</span>}
                        </div>
                        <div className="muted text-xs mb-2">
                          Nível {ps.level} • Afeto: {ps.affection}/100
                        </div>
                        <p className="paper text-xs m-0 mb-3">{s.description}</p>
                        
                        <div className="grid-2 gap-sm mb-4 text-[11px]">
                          <div className="badge badge-muted">HP Base: {s.base_hp}</div>
                          <div className="badge badge-muted">ATK Base: {s.base_atk}</div>
                          <div className="badge badge-muted">Elemento: {s.element}</div>
                          <div className="badge badge-muted">Raridade: {s.rarity}</div>
                        </div>

                        {ps.is_equipped ? (
                          <GameAction tone="quiet" className="w-full" disabled={actionLoading} onClick={unequipAll}>
                            Recolher Mascote
                          </GameAction>
                        ) : (
                          <GameAction tone="seal" className="w-full" disabled={actionLoading} onClick={() => equipSummon(ps.id)}>
                            Invocar para Combate
                          </GameAction>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="kuro-challenges-v4__grid">
          {summons.map(s => {
            const hasContract = playerSummons.some(ps => ps.summon_id === s.id);
            const cost = s.req_level * 100;
            return (
              <div key={s.id} className="card-glass kuro-challenges-v4__card flex-col">
                <div className="flex-row gap-md items-start">
                  <div className="text-4xl">{s.animal_type === 'Sapo' ? '🐸' : s.animal_type === 'Cobra' ? '🐍' : s.animal_type === 'Lesma' ? '🐌' : s.animal_type === 'Cachorro' ? '🐶' : '🐾'}</div>
                  <div className="flex-1">
                    <div className="flex-between">
                      <h3 className="paper text-lg m-0">{s.name}</h3>
                      <span className="badge badge-muted text-[10px]">Rank {s.req_rank}</span>
                    </div>
                    <div className="muted text-xs mb-2">
                      Requer Nível {s.req_level}
                    </div>
                    <p className="paper text-xs m-0 mb-3">{s.description}</p>
                    
                    <div className="grid-2 gap-sm mb-4 text-[11px]">
                      <div className="badge badge-muted">HP Base: {s.base_hp}</div>
                      <div className="badge badge-muted">ATK Base: {s.base_atk}</div>
                    </div>

                    {hasContract ? (
                      <GameAction tone="quiet" className="w-full" disabled >
                        Contrato Assinado
                      </GameAction>
                    ) : (
                      <GameAction tone="seal" className="w-full" disabled={actionLoading} onClick={() => signContract(s)}>
                        Assinar Contrato ({cost} ¥)
                      </GameAction>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

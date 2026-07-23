import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function Graduacoes({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [ranksData, setRanksData] = useState([]);
  const [isCeremonyActive, setIsCeremonyActive] = useState(false);
  const [newRank, setNewRank] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    async function fetchRanks() {
      const { data } = await supabase.from('ranks').select('*').order('id', { ascending: true });
      if (data) {
        const mappedRanks = data.map(r => {
          const reqs = [];
          if (r.req_level > 0) reqs.push({ label: `Nível ${r.req_level} ou superior`, check: (p) => p.level >= r.req_level, progress: (p) => `${p.level}/${r.req_level}` });
          if (r.req_tasks > 0) reqs.push({ label: `Completar ${r.req_tasks} Tarefas`, check: (p) => (p.tasks_completed || 0) >= r.req_tasks, progress: (p) => `${p.tasks_completed || 0}/${r.req_tasks}` });
          if (r.req_jutsus > 0) reqs.push({ label: `Ter ${r.req_jutsus} Jutsus Aprendidos`, check: (p) => (p.jutsus_learned?.length || 0) >= r.req_jutsus, progress: (p) => `${p.jutsus_learned?.length || 0}/${r.req_jutsus}` });
          
          if (r.req_combat_points > 0) reqs.push({ label: `Ter ${r.req_combat_points} Pontos de Combate (Híbrido PvP/NPC/Dojo)`, check: (p) => {
            const pts = (((p.wins_pvp || 0) + (p.losses_pvp || 0)) * 1.5) + (p.npc_wins || 0) + (p.wins_dojo || 0);
            return pts >= r.req_combat_points;
          }, progress: (p) => {
            const pts = (((p.wins_pvp || 0) + (p.losses_pvp || 0)) * 1.5) + (p.npc_wins || 0) + (p.wins_dojo || 0);
            return `${pts.toFixed(1)}/${r.req_combat_points}`;
          } });
          
          if (r.req_missions_d > 0) reqs.push({ label: `Completar ${r.req_missions_d} Missões Rank D`, check: (p) => (p.missions_d || 0) >= r.req_missions_d, progress: (p) => `${p.missions_d || 0}/${r.req_missions_d}` });
          if (r.req_missions_c > 0) reqs.push({ label: `Completar ${r.req_missions_c} Missões Rank C`, check: (p) => (p.missions_c || 0) >= r.req_missions_c, progress: (p) => `${p.missions_c || 0}/${r.req_missions_c}` });
          if (r.req_missions_b > 0) reqs.push({ label: `Completar ${r.req_missions_b} Missões Rank B`, check: (p) => (p.missions_b || 0) >= r.req_missions_b, progress: (p) => `${p.missions_b || 0}/${r.req_missions_b}` });
          if (r.req_missions_a > 0) reqs.push({ label: `Completar ${r.req_missions_a} Missões Rank A`, check: (p) => (p.missions_a || 0) >= r.req_missions_a, progress: (p) => `${p.missions_a || 0}/${r.req_missions_a}` });
          if (r.req_missions_s > 0) reqs.push({ label: `Completar ${r.req_missions_s} Missões Rank S`, check: (p) => (p.missions_s || 0) >= r.req_missions_s, progress: (p) => `${p.missions_s || 0}/${r.req_missions_s}` });
          
          // Novos requisitos
          if (r.name_id === 'Chunin') {
            reqs.push({
              label: 'Aprovação na Floresta da Morte (Exame Chunin)',
              check: (p) => p.passou_exame_chunin === true,
              progress: (p) => p.passou_exame_chunin ? '1/1' : '0/1'
            });
          }
          if (r.req_jutsus_lvl2 > 0) reqs.push({ label: `Ter ${r.req_jutsus_lvl2} Jutsus Nível 2+`, check: (p) => (p.jutsus_learned?.filter(j => (j.level || 1) >= 2).length || 0) >= r.req_jutsus_lvl2, progress: (p) => `${p.jutsus_learned?.filter(j => (j.level || 1) >= 2).length || 0}/${r.req_jutsus_lvl2}` });
          if (r.req_jutsus_lvl3 > 0) reqs.push({ label: `Ter ${r.req_jutsus_lvl3} Jutsus Nível 3+`, check: (p) => (p.jutsus_learned?.filter(j => (j.level || 1) >= 3).length || 0) >= r.req_jutsus_lvl3, progress: (p) => `${p.jutsus_learned?.filter(j => (j.level || 1) >= 3).length || 0}/${r.req_jutsus_lvl3}` });
          if (r.req_bingo_book > 0) reqs.push({ label: `Derrotar ${r.req_bingo_book} Alvos do Bingo Book`, check: (p) => (p.bingo_book_kills || 0) >= r.req_bingo_book, progress: (p) => `${p.bingo_book_kills || 0}/${r.req_bingo_book}` });
          
          if (r.req_gate_lvl > 0 || r.req_clan_lvl > 0 || r.req_karma_lvl > 0) {
            reqs.push({
              label: `Ter (Invocação Lvl ${r.req_invocation_lvl || 0} + Clã Lvl ${r.req_clan_lvl || 0}) OU (Portão ${r.req_gate_lvl || 0}) OU (Karma ${r.req_karma_lvl || 0})`,
              check: (p) => (
                (p.gate_lvl || 0) >= (r.req_gate_lvl || 999) || 
                (p.karma_lvl || 0) >= (r.req_karma_lvl || 999) || 
                ((p.clan_lvl || 0) >= (r.req_clan_lvl || 999) && (p.invocation_lvl || 0) >= (r.req_invocation_lvl || 0))
              ),
              progress: (p) => {
                const passed = (p.gate_lvl || 0) >= (r.req_gate_lvl || 999) || 
                (p.karma_lvl || 0) >= (r.req_karma_lvl || 999) || 
                ((p.clan_lvl || 0) >= (r.req_clan_lvl || 999) && (p.invocation_lvl || 0) >= (r.req_invocation_lvl || 0));
                return passed ? '1/1' : '0/1';
              }
            });
          }
          
          return {
            id: r.name_id,
            iconSrc: r.icon_src,
            title: r.title,
            desc: r.description,
            reqs: reqs
          };
        });
        setRanksData(mappedRanks);
      }
    }
    fetchRanks();
  }, []);

  if (!player || ranksData.length === 0) return <div>Carregando...</div>;

  const currentIndex = ranksData.findIndex(r => r.id === player.rank);
  const nextRank = ranksData[currentIndex + 1];

  const canGraduate = nextRank ? nextRank.reqs.every(req => req.check(player)) : false;

  async function graduarPara(novoRank) {
    setNewRank(novoRank);
    setIsCeremonyActive(true);
    
    let bonusPontos = 0;
    if (novoRank === 'Genin') bonusPontos = 5;
    if (novoRank === 'Chunin') bonusPontos = 10;
    if (novoRank === 'Jounin') bonusPontos = 20;
    if (novoRank === 'ANBU') bonusPontos = 35;
    if (novoRank === 'Sannin') bonusPontos = 50;
    if (novoRank === 'Herói') bonusPontos = 100;
    
    const novosPontos = (player.pontos_atributos || 0) + bonusPontos;

    const { error } = await supabase
      .from('players')
      .update({ rank: novoRank, pontos_atributos: novosPontos })
      .eq('id', player.id);

    if (error) {
      addToast('Erro ao graduar: ' + error.message, 'error');
      setIsCeremonyActive(false);
      return;
    }

    setTimeout(() => {
      updatePlayer(player.id);
      setIsCeremonyActive(false);
    }, 5000);
  }

  return (
    <div className="page">
      <PageHeader 
        eyebrow="Academia Ninja" 
        title="Graduações" 
        subtitle="Prove seu valor e suba na hierarquia shinobi." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full pt-4">
        {ranksData.map((rank, idx) => {
          const isNextRank = nextRank && rank.id === nextRank.id;
          const isPassed = currentIndex >= idx;

          let cardStyle = "flex flex-col items-center p-6 rounded-lg transition-all relative min-h-[400px]";
          if (isNextRank) {
            cardStyle += " border-2 border-blue bg-ink shadow-xl scale-105 z-10 opacity-100";
          } else if (isPassed) {
            cardStyle += " border border-line-solid bg-ink-raised opacity-75";
          } else {
            cardStyle += " border border-line-solid bg-black/40 opacity-50 z-0";
          }

          const canGrad = isNextRank ? canGraduate : false;

          return (
            <div key={rank.id} className={cardStyle}>
              
              <div className="text-6xl flex justify-center items-center h-24 mb-4">
                {rank.iconSrc ? (
                  <img src={rank.iconSrc} alt={rank.title} className="max-w-full max-h-full object-contain filter drop-shadow-md" />
                ) : (
                  <span>🥷</span>
                )}
              </div>
              
              <div className={`text-xl font-bold mb-4 text-center ${isNextRank ? 'text-seal-bright' : 'text-gold'}`}>
                {rank.title}
              </div>

              <div className="text-sm text-muted text-center mb-6 px-2 flex-grow">
                {rank.desc}
              </div>

              {isNextRank && (
                <div className="w-full relative group flex flex-col items-center mb-6">
                  <div className="cursor-pointer bg-ink-raised border border-line-solid rounded p-2 text-2xl hover:bg-black/60 transition-colors">
                     📋
                  </div>
                  
                  {/* Tooltip Hover for Requirements */}
                  <div className="absolute bottom-full mb-2 w-64 bg-ink border border-line-bright shadow-lg p-3 rounded-md text-xs z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
                    <div className="font-bold text-center mb-2 border-b border-line-solid pb-1">Requisitos</div>
                    <div className="flex flex-col gap-1">
                      {rank.reqs.map((req, i) => {
                        const isMet = req.check(player);
                        return (
                          <div key={i} className={`${isMet ? 'text-muted' : 'text-danger'}`}>
                            {req.label} {isMet ? '' : `(${req.progress(player)})`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto w-full flex flex-col items-center">
                {isPassed ? (
                  <div className="text-success font-bold text-sm tracking-widest uppercase">Graduado ✓</div>
                ) : isNextRank ? (
                  rank.id === 'Chunin' && !player.passou_exame_chunin ? (
                    <button 
                      className="btn-primary w-full max-w-[200px]" 
                      onClick={() => navigate('/exame')}
                    >
                      Floresta da Morte
                    </button>
                  ) : (
                    <button 
                      className={`btn-primary w-full max-w-[200px] ${!canGrad ? 'opacity-50 cursor-not-allowed filter grayscale' : ''}`} 
                      disabled={!canGrad} 
                      onClick={() => graduarPara(rank.id)}
                    >
                      Graduar
                    </button>
                  )
                ) : (
                  <div className="text-danger opacity-70 font-bold text-sm tracking-widest uppercase">
                    Bloqueado
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {isCeremonyActive && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
          <div className="text-8xl mb-6 animate-zoom-in drop-shadow-md">
            {ranksData.find(r => r.id === newRank)?.iconSrc ? (
              <img src={ranksData.find(r => r.id === newRank).iconSrc} alt={newRank} className="max-w-[150px] max-h-[150px]" />
            ) : (
              <span>🥷</span>
            )}
          </div>
          <h1 className="font-shippori text-seal-bright text-5xl mt-8 opacity-0 animate-slide-up-fade animate-delay-15">
            Parabéns, {player.name}!
          </h1>
          <p className="font-inter text-paper text-xl mt-4 opacity-0 animate-slide-up-fade animate-delay-25">
            Você agora é oficialmente um {newRank} da sua Vila.
          </p>
        </div>
      )}
    </div>
  );
}

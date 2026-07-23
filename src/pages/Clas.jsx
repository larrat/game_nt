import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import JutsuCard from '../components/JutsuCard';
import { rankValue } from '../utils/engine';

const ATTR_NAMES = ['agilidade', 'selo', 'forca', 'inteligencia', 'resistencia', 'ninjutsu', 'genjutsu', 'taijutsu', 'energia', 'bukijutsu'];

const ATTR_ICONS = {
  agilidade: '🏃',
  selo: '🙏',
  forca: '💪',
  inteligencia: '🧠',
  resistencia: '🛡️',
  ninjutsu: '🔥',
  genjutsu: '👁️',
  taijutsu: '👊',
  energia: '⚡',
  bukijutsu: '🗡️'
};

const CLAN_LEVELS = [
  { level: 1, name: 'Nível 1', cost: 1500, reqLvl: 10, reqRank: 'Genin' },
  { level: 2, name: 'Nível 2', cost: 4000, reqLvl: 25, reqRank: 'Chunin' },
  { level: 3, name: 'Nível 3', cost: 12000, reqLvl: 40, reqRank: 'Jounin' },
  { level: 4, name: 'Supremo', cost: 35000, reqLvl: 55, reqRank: 'ANBU' }
];

export default function Clas({ player, updatePlayer }) {
  const [clansData, setClansData] = useState([]);
  const [clanJutsus, setClanJutsus] = useState([]);
  const [myLearnedJutsus, setMyLearnedJutsus] = useState([]);
  const [selectedClanIdx, setSelectedClanIdx] = useState(0);
  const [customStats, setCustomStats] = useState({
    agilidade: 0, selo: 0, forca: 0, inteligencia: 0, resistencia: 0,
    ninjutsu: 0, genjutsu: 0, taijutsu: 0, energia: 0, bukijutsu: 0
  });
  
  const { addToast } = useToast();

  const totalSpent = Object.values(customStats).reduce((a, b) => a + b, 0);
  const maxPoints = 7;

  const handleStatChange = (attr, val) => {
    const num = parseInt(val, 10) || 0;
    const current = customStats[attr];
    const diff = num - current;
    
    if (totalSpent + diff > maxPoints) {
      addToast(`Você tem apenas ${maxPoints} pontos para distribuir!`, 'error');
      return;
    }
    if (num < 0) return;
    
    setCustomStats(prev => ({ ...prev, [attr]: num }));
  };

  const fetchLearned = async () => {
    if (!player) return;
    const { data } = await supabase.from('player_jutsus').select('jutsu_id').eq('player_id', player.id);
    if (data) setMyLearnedJutsus(data.map(d => d.jutsu_id));
  };

  useEffect(() => {
    async function fetchClans() {
      const { data: cData } = await supabase.from('clans').select('*, clan_skills(*)').order('id', { ascending: true });
      const { data: jData } = await supabase.from('jutsus').select('*').not('req_clan', 'is', null);

      if (cData) {
        const mapped = cData.map(c => ({
          id: c.id,
          name: c.name,
          image: c.image_url,
          description: c.description,
          skills: c.clan_skills.map(s => ({
            name: s.name,
            req: s.req_label,
            effect: s.description,
            icon: s.icon_url
          }))
        }));
        setClansData(mapped);
      }
      if (jData) setClanJutsus(jData);
      await fetchLearned();
    }
    if (player) fetchClans();
  }, [player]);

  if (!player || clansData.length === 0) return <div>Carregando...</div>;

  const clan = clansData[selectedClanIdx];

  const handleJoinClan = async () => {
    if (player.clan_id) {
      addToast("Você já possui um clã!", "error");
      return;
    }

    if (totalSpent !== maxPoints) {
      addToast(`Distribua todos os ${maxPoints} pontos de atributo antes de entrar no Clã!`, "error");
      return;
    }

    const { error } = await supabase
      .from('players')
      .update({
        clan_id: clan.id,
        clan: clan.name,
        clan_custom_stats: customStats,
        clan_lvl: 0
      })
      .eq('id', player.id);

    if (error) {
      addToast("Erro ao entrar no Clã: " + error.message, "error");
    } else {
      addToast(`Sucesso! Agora você despertou a linhagem do ${clan.name}!`, "success");
      updatePlayer(player.id);
    }
  };

  const handleTrainLevel = async (targetLevel, cost) => {
    if (player.ryous < cost) {
      addToast(`Ryous insuficientes. Custa RY$ ${cost}.`, 'error');
      return;
    }
    
    const { error } = await supabase
      .from('players')
      .update({
        clan_lvl: targetLevel,
        ryous: player.ryous - cost
      })
      .eq('id', player.id);

    if (error) {
      addToast("Erro ao treinar nível de Clã: " + error.message, "error");
    } else {
      addToast(`Você alcançou o Nível ${targetLevel} do seu Clã! Bônus dobrados!`, "success");
      updatePlayer(player.id);
    }
  };

  const handleLearnKinjutsu = async (jutsu) => {
    const cost = jutsu.cost_ryous || (jutsu.lvl * 150);
    if (player.ryous < cost) {
      addToast(`Ryous insuficientes! Custa RY$ ${cost}.`, "error");
      return;
    }

    const { error: err1 } = await supabase.from('players').update({ ryous: player.ryous - cost }).eq('id', player.id);
    if (err1) return;

    await supabase.from('player_jutsus').insert({ player_id: player.id, jutsu_id: jutsu.id });

    const currentLearned = player.jutsus_learned || [];
    const newLearned = [...currentLearned, { id: jutsu.id, level: 1, slots: [null, null, null] }];
    await supabase.from('players').update({ jutsus_learned: newLearned }).eq('id', player.id);

    addToast(`Você aprendeu a técnica secreta: ${jutsu.name}!`, "success");
    await fetchLearned();
    updatePlayer(player.id);
  };

  const renderClanContent = (myClan) => {
    const myJutsus = clanJutsus.filter(j => myClan.name.includes(j.req_clan) || j.req_clan.includes(myClan.name)).sort((a,b) => a.lvl - b.lvl);
    const myClanLvl = player.clan_lvl || 0;
    const myStats = player.clan_custom_stats || {};

    return (
      <>
        <div className="flex-col max-w-800 mx-auto items-center text-center mb-12">
          <img src={myClan.image} alt={myClan.name} className="clan-hero-img object-cover rounded-sm mb-6 border-2 border-seal-bright shadow-lg" />
          <h2 className="page-title mb-4">{myClan.name}</h2>
          <p className="muted leading-relaxed mb-8">{myClan.description}</p>
          
          {/* ATRIBUTOS PERSONALIZADOS DO JOGADOR (READONLY) */}
          <div className="card w-full mb-12 border-line-solid">
            <h3 className="section-title text-center text-gold mb-6 border-none">Atributos da sua Linhagem</h3>
            <p className="text-center text-sm muted mb-6">Seu multiplicador atual é <strong>Nível {myClanLvl}</strong>. Ele multiplica os pontos base definidos abaixo.</p>
            
            <div className="flex-row gap-md justify-center flex-wrap">
               {ATTR_NAMES.map(attr => {
                 const baseVal = myStats[attr] || 0;
                 if (baseVal === 0) return null;
                 const totalVal = baseVal * Math.max(1, myClanLvl); // Se lvl 0, mostra como se fosse 1 pra vizualizar
                 return (
                   <div key={attr} className="flex-col items-center bg-ink p-3 rounded-md border border-line-solid w-24">
                     <span className="text-2xl mb-2">{ATTR_ICONS[attr]}</span>
                     <span className="text-[10px] uppercase text-muted tracking-wider mb-2">{attr}</span>
                     <div className="text-xl font-bold gold">+{totalVal}</div>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>

        {/* CARROSSEL DE NÍVEIS DO CLÃ */}
        <div className="flex-col gap-xl mb-12">
          <h3 className="section-title muted text-center border-none pb-0">Níveis de Evolução Sanguínea</h3>
          <p className="muted text-center mb-6">Treine a sua linhagem para multiplicar os bônus de atributos.</p>
          
          <div className="flex-row items-center justify-center gap-lg w-full overflow-x-auto pb-8">
            {CLAN_LEVELS.map((levelObj, idx) => {
               const isPassed = myClanLvl >= levelObj.level;
               const isNext = myClanLvl === levelObj.level - 1;
               
               const meetsLvl = player.level >= levelObj.reqLvl;
               const meetsRank = rankValue(player.rank) >= rankValue(levelObj.reqRank);
               const canTrain = isNext && meetsLvl && meetsRank;

               let cardStyle = "flex-col items-center text-center p-6 border-line-solid rounded-md transition-all relative flex-shrink-0";
               if (isNext) cardStyle += " border-blue bg-ink shadow-lg scale-105 z-10 opacity-100";
               else cardStyle += " bg-black-alpha-40 opacity-50 scale-95 z-0";

               return (
                 <div key={levelObj.level} className={`${cardStyle} w-[260px] min-h-[300px]`}>
                    <div className="w-16 h-16 bg-black-alpha-40 border-line-solid rounded-sm mb-4 mt-2 flex items-center justify-center overflow-hidden">
                       <img src={myClan.image} alt={myClan.name} className="w-full h-full object-cover filter grayscale-50" style={{ transform: `scale(${1 + (idx*0.2)})` }} />
                    </div>
                    <h4 className={`text-xl font-bold mb-4 ${isNext ? 'text-seal-bright' : 'text-gold'}`}>
                      {myClan.name} {levelObj.name}
                    </h4>

                    {/* Tooltip Hover for Requirements */}
                    {isNext && (
                      <div className="relative group/tooltip mb-4 mt-auto w-full flex-col items-center">
                        <div className="text-3xl text-seal cursor-help hover:text-seal-bright transition-colors">
                          📋
                        </div>
                        <div className="absolute bottom-full mb-2 w-56 bg-black-alpha-90 border border-line-bright p-3 rounded-md text-xs z-50 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all text-left shadow-lg pointer-events-none">
                          <div className="flex-col gap-1">
                            <div className={`${meetsLvl ? 'text-muted' : 'text-danger'}`}>Requer nível {levelObj.reqLvl}</div>
                            <div className={`${meetsRank ? 'text-muted' : 'text-danger'}`}>Requer graduação: {levelObj.reqRank}</div>
                            <div className="mt-2 pt-2 border-t border-line-solid text-gold">Custo: RY$ {levelObj.cost}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto w-full flex-col items-center pt-4">
                      {isPassed ? (
                        <div className="text-success font-bold text-sm tracking-widest uppercase">✓ Treinado</div>
                      ) : isNext ? (
                        <button 
                          className={`btn-primary w-full max-w-[200px] ${!canTrain && 'opacity-50 cursor-not-allowed filter grayscale'}`} 
                          disabled={!canTrain} 
                          onClick={() => handleTrainLevel(levelObj.level, levelObj.cost)}
                        >
                          Treinar
                        </button>
                      ) : (
                        <div className="text-danger opacity-70 font-bold text-sm tracking-widest uppercase">Bloqueado</div>
                      )}
                    </div>
                 </div>
               );
            })}
          </div>
        </div>

        {/* JUTSUS OCULTOS (ÁRVORE DE HABILIDADES) */}
        {myJutsus.length > 0 && (
          <div className="flex-col gap-xl">
            <h3 className="section-title danger text-center border-none pb-0">Técnicas Ocultas (Kinjutsu)</h3>
            <p className="muted text-center mb-4">Esses Jutsus só podem ser aprendidos na Academia Ninja por membros deste clã.</p>
            <div className="grid-auto gap-md">
              {myJutsus.map(jutsu => (
                <JutsuCard 
                  key={jutsu.id} 
                  jutsu={jutsu} 
                  player={player} 
                  isLearned={myLearnedJutsus.includes(jutsu.id)} 
                  learnCost={`RY$ ${jutsu.cost_ryous || 1500}`} 
                  onLearn={() => handleLearnKinjutsu(jutsu)}
                  showRequisites={true}
                />
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="page">
      <PageHeader eyebrow='Sangue e Linhagem' title='Clãs Ninja' />

      {player.clan_id ? (
        <div className="clan-system">
          <div className="card flex-col items-center p-12 mb-10 border-line-solid border-seal-bright bg-danger-alpha-05">
            <h2 className="page-title danger mb-4 flex items-center gap-md">
              <span className="text-2xl">🩸</span> Linhagem Ativa
            </h2>
            <p className="muted text-center">O sangue ancestral já corre nas suas veias. O bônus base de clã está ativo.</p>
          </div>
          
          {(() => {
            const myClan = clansData.find(c => c.id == player.clan_id);
            if (!myClan) return <div className="muted text-center">Clã não encontrado no banco de dados.</div>;
            return renderClanContent(myClan);
          })()}
        </div>
      ) : (
        <div className="clan-system">
          {/* CAROUSEL CLAN SELECTION */}
          <div className="clan-carousel flex-row gap-lg mb-10 justify-center">
            <button className="btn-ghost text-4xl hover:text-gold" onClick={() => setSelectedClanIdx(Math.max(0, selectedClanIdx - 1))}>❮</button>
            
            <div className="flex-row gap-md overflow-hidden max-w-600 justify-center">
              {clansData.map((c, idx) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedClanIdx(idx)}
                  className={`cursor-pointer transition-all duration-300 ${idx === selectedClanIdx ? 'opacity-100 scale-110 border-2 border-seal-bright rounded-sm z-10 shadow-lg' : 'opacity-40 scale-90 border-2 border-transparent rounded-sm'}`}
                >
                  <img src={c.image} alt={c.name} className="clan-hero-img object-cover rounded-sm w-32 h-32" />
                </div>
              ))}
            </div>

            <button className="btn-ghost text-4xl hover:text-gold" onClick={() => setSelectedClanIdx(Math.min(clansData.length - 1, selectedClanIdx + 1))}>❯</button>
          </div>

          <div className="card flex-col mb-12 items-center text-center">
             <h2 className="page-title mb-4">{clan.name}</h2>
             <p className="muted leading-relaxed max-w-600 mx-auto mb-8">{clan.description}</p>

             {/* UI DE PERSONALIZAÇÃO DE ATRIBUTOS */}
             <div className="w-full bg-black-alpha-40 border border-line-solid rounded-md p-6 mb-8 max-w-800">
               <h3 className="text-xl font-bold mb-2">Personalize os atributos do seu Clã</h3>
               <p className="text-sm muted mb-6">Aloque pontos para definir quais status receberão o multiplicador ao subir o nível do clã.</p>
               
               <div className="flex-row flex-wrap justify-center gap-md mb-6">
                 {ATTR_NAMES.map(attr => (
                   <div key={attr} className="flex-col items-center bg-ink border border-line-solid rounded-sm p-3 w-20">
                     <span className="text-2xl mb-2">{ATTR_ICONS[attr]}</span>
                     <select 
                       className="bg-black-alpha-90 text-white border border-line-solid rounded px-2 py-1 text-sm outline-none cursor-pointer"
                       value={customStats[attr]}
                       onChange={(e) => handleStatChange(attr, e.target.value)}
                     >
                       {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                     </select>
                   </div>
                 ))}
               </div>

               <div className="flex-between max-w-400 mx-auto px-4">
                 <div className="text-danger font-bold text-sm">
                   {maxPoints - totalSpent} Pontos Disponíveis para atributos
                 </div>
                 <div className="text-gold font-bold text-sm">
                   0 Pontos Disponíveis para fórmulas
                 </div>
               </div>
             </div>

             <div className="text-center w-full">
               <p className="danger text-xs mb-4">⚠️ Atenção: as escolhas de clã e atributos são <strong>permanentes</strong>.</p>
               <button 
                 className={`btn-primary w-full max-w-400 py-3 ${totalSpent !== maxPoints ? 'opacity-50 cursor-not-allowed filter grayscale' : ''}`} 
                 onClick={handleJoinClan}
                 disabled={totalSpent !== maxPoints}
               >
                 <span>Entrar no Clã</span>
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

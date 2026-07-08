import React from 'react';
import JutsuIcon from './JutsuIcon';
import { rankValue } from '../utils/engine';

export default function JutsuCard({ 
  jutsu, 
  player, 
  isLearned, 
  onLearn, 
  learnCost, 
  showRequisites = true 
}) {
  const isUnlockedLvl = player.level >= (jutsu.req_level || jutsu.lvl || 1);
  const jutsuRank = jutsu.req_rank || jutsu.reqRank || 'Genin';
  const isUnlockedRank = rankValue(player.rank) >= rankValue(jutsuRank);
  
  const reqAttr = jutsu.type || jutsu.category || 'Ninjutsu';
  const playerAttrVal = player[reqAttr.toLowerCase()] || 0;
  const reqAttrValue = jutsu.req_attr_value || jutsu.reqAttrValue || 0;
  const isAttrUnlocked = playerAttrVal >= reqAttrValue;
  
  const isUnlocked = isUnlockedLvl && isUnlockedRank && isAttrUnlocked;

  const damage = jutsu.damage || 0;
  const cp = jutsu.chakra_cost || jutsu.chakraCost || jutsu.cost || 0;
  const accuracy = jutsu.accuracy || 0;
  const cooldown = jutsu.cooldown || 0;
  const seals = jutsu.req_seals || 0;
  const levelReq = jutsu.req_level || jutsu.lvl || 1;

  return (
    <div className="card flex-col" style={{ 
      border: isLearned ? '1px solid rgba(76,206,128,0.5)' : isUnlocked ? '1px solid var(--line-bright)' : '1px solid var(--line)', 
      opacity: isUnlocked || isLearned ? 1 : 0.6,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {isLearned && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #4cce80, transparent)' }} />
      )}

      <div className="flex-row" style={{ alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{ width: '48px', height: '48px', flexShrink: 0 }}>
           {jutsu.icon_url ? (
             <div style={{ width: '100%', height: '100%', background: 'var(--ink)', borderRadius: '4px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
               <img src={jutsu.icon_url} alt={jutsu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
           ) : (
             <JutsuIcon jutsu={jutsu} />
           )}
        </div>
        <div className="flex-col" style={{ gap: '4px' }}>
          <div className={`mono uppercase ${isUnlocked || isLearned ? 'gold' : 'muted'}`} style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
            NV.{levelReq} · {jutsuRank} · {reqAttr}
          </div>
          <h4 className={`card-title ${isUnlocked || isLearned ? 'paper' : 'muted'}`} style={{ fontSize: '16px', margin: 0 }}>
            {jutsu.name}
          </h4>
        </div>
      </div>
      
      {jutsu.desc || jutsu.description ? (
        <p className="muted" style={{ fontSize: '12px', lineHeight: '1.5', marginBottom: '16px' }}>
          {jutsu.desc || jutsu.description}
        </p>
      ) : null}
      
      <div className="grid-2 mono" style={{ gap: '8px', fontSize: '11px', marginBottom: '16px' }}>
        {damage > 0 ? <div style={{ color: '#ef4444' }}>Dano: {damage}</div> : <div className="muted">Dano: 0</div>}
        {cp > 0 ? <div style={{ color: '#60a5fa' }}>CP: {cp}</div> : <div className="muted">CP: 0</div>}
        <div style={{ color: 'var(--muted)' }}>Precisão: {accuracy}%</div>
        <div style={{ color: 'var(--gold)' }}>Recarga: {cooldown}T</div>
      </div>

      {showRequisites && (
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', marginBottom: '16px', border: '1px dashed var(--line)' }}>
          <div className="muted mono uppercase" style={{ fontSize: '10px', marginBottom: '8px' }}>Requisitos de Aprendizado:</div>
          <div className="flex-col" style={{ gap: '6px', fontSize: '11px' }}>
            <div className="flex-between">
              <span style={{ color: player.level >= levelReq ? 'var(--green)' : 'var(--red)' }}>Nível Necessário:</span>
              <span className="mono">{levelReq}</span>
            </div>
            {reqAttrValue > 0 && (
              <div className="flex-between">
                <span style={{ color: playerAttrVal >= reqAttrValue ? 'var(--green)' : 'var(--red)' }}>{reqAttr} Mínimo:</span>
                <span className="mono">{reqAttrValue}</span>
              </div>
            )}
            {seals > 0 && (
              <div className="flex-between">
                <span style={{ color: (player.selo || 0) >= seals ? 'var(--green)' : 'var(--gold)' }}>Selos (Para 100%):</span>
                <span className="mono">{seals}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!isLearned && !isUnlocked ? (
         <div className="muted" style={{ fontSize: '11px', textAlign: 'center', marginTop: 'auto', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
           Bloqueado (Não atende aos requisitos)
         </div>
      ) : isLearned ? (
         <div className="success" style={{ fontSize: '11px', textAlign: 'center', marginTop: 'auto', padding: '8px', background: 'rgba(34,197,94,0.1)', borderRadius: '4px' }}>
           ✓ Técnica Aprendida
         </div>
      ) : (
         <button 
           className="btn-primary" 
           style={{ marginTop: 'auto', width: '100%', fontSize: '12px', padding: '8px' }}
           onClick={onLearn}
         >
           Aprender ({learnCost})
         </button>
      )}
    </div>
  );
}

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
  
  let isAttrUnlocked = true;
  if (jutsu.req_stats && Object.keys(jutsu.req_stats).length > 0) {
    for (const [statName, reqValue] of Object.entries(jutsu.req_stats)) {
      if ((player[statName.toLowerCase()] || 0) < reqValue) isAttrUnlocked = false;
    }
  } else {
    isAttrUnlocked = playerAttrVal >= reqAttrValue;
    if (jutsu.req_seals && (player.selo || 0) < jutsu.req_seals) isAttrUnlocked = false;
  }
  
  const isUnlocked = isUnlockedLvl && isUnlockedRank && isAttrUnlocked;

  const damage = jutsu.damage || 0;
  const cp = jutsu.chakra_cost || jutsu.chakraCost || jutsu.cost || 0;
  const accuracy = jutsu.accuracy || 0;
  const cooldown = jutsu.cooldown || 0;
  const seals = jutsu.req_seals || 0;
  const levelReq = jutsu.req_level || jutsu.lvl || 1;

  return (
    <div className="card" style={{ 
      position: 'relative',
      opacity: isUnlocked || isLearned ? 1 : 0.7,
      minWidth: '220px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      transition: 'transform 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Top right icon indicating type (Ninjutsu, Taijutsu etc) */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: '#3b82f6',
        padding: '4px',
        borderRadius: '4px',
        border: '1px solid var(--line-solid)',
        color: 'white',
        fontSize: '12px'
      }}>
        🥷
      </div>

      {/* Jutsu Image */}
      <div style={{
        width: '64px',
        height: '64px',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid var(--line)',
        borderRadius: '4px',
        marginTop: '8px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
         {jutsu.icon_url ? (
           <img src={jutsu.icon_url} alt={jutsu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
         ) : (
           <span style={{ fontSize: '32px' }}>📜</span>
         )}
      </div>

      {/* Title */}
      <h4 style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
        {jutsu.name}
      </h4>

      {/* Rank */}
      <div className="muted mono uppercase" style={{ fontSize: '12px', letterSpacing: '2px', marginBottom: '16px' }}>
        {jutsuRank}
      </div>

      {/* Requirements Icon with Tooltip */}
      {showRequisites && (
        <div style={{ position: 'relative', marginBottom: '16px', display: 'inline-block' }} 
             onMouseEnter={(e) => {
               const tooltip = e.currentTarget.querySelector('.jutsu-tooltip');
               if (tooltip) { tooltip.style.opacity = '1'; tooltip.style.visibility = 'visible'; }
             }}
             onMouseLeave={(e) => {
               const tooltip = e.currentTarget.querySelector('.jutsu-tooltip');
               if (tooltip) { tooltip.style.opacity = '0'; tooltip.style.visibility = 'hidden'; }
             }}
        >
          <div style={{ fontSize: '32px', color: 'var(--seal)', cursor: 'help', transition: 'color 0.2s' }}
               onMouseEnter={(e) => e.currentTarget.style.color = 'var(--seal-bright)'}
               onMouseLeave={(e) => e.currentTarget.style.color = 'var(--seal)'}
          >
            📋
          </div>
          
          {/* Tooltip Content */}
          <div className="jutsu-tooltip" style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            width: '220px',
            background: 'rgba(10, 10, 10, 0.95)',
            border: '1px solid var(--line-bright)',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: 50,
            opacity: 0,
            visibility: 'hidden',
            transition: 'all 0.2s',
            textAlign: 'left',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: player.level >= levelReq ? 'var(--muted)' : 'var(--danger)' }}>
                Requer nível {levelReq}
              </div>
              <div style={{ color: rankValue(player.rank) >= rankValue(jutsuRank) ? 'var(--muted)' : 'var(--danger)' }}>
                Requer graduação: {jutsuRank}
              </div>
              {jutsu.req_stats && Object.keys(jutsu.req_stats).length > 0 ? (
                Object.entries(jutsu.req_stats).map(([statName, reqValue]) => {
                  const playerVal = player[statName.toLowerCase()] || 0;
                  return (
                    <div key={statName} style={{ color: playerVal >= reqValue ? 'var(--muted)' : 'var(--danger)' }}>
                      Requer {reqValue} ponto(s) em {statName}
                    </div>
                  );
                })
              ) : (
                <>
                  {reqAttrValue > 0 && (
                    <div style={{ color: playerAttrVal >= reqAttrValue ? 'var(--muted)' : 'var(--danger)' }}>
                      Requer {reqAttrValue} ponto(s) em {reqAttr.toLowerCase()}
                    </div>
                  )}
                  {seals > 0 && (
                    <div style={{ color: (player.selo || 0) >= seals ? 'var(--muted)' : 'var(--danger)' }}>
                      Requer {seals} ponto(s) em selo
                    </div>
                  )}
                </>
              )}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line)', color: 'var(--gold)' }}>
                Custo: {learnCost}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {isLearned ? (
        <button className="btn-ghost" style={{ width: '100%', padding: '6px', fontSize: '12px', color: 'var(--success)', borderColor: 'var(--success)', cursor: 'default' }}>
           ✓ Aprendido
        </button>
      ) : (
        <button 
          className="btn-primary"
          style={{ 
            width: '100%', 
            padding: '8px', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            background: isUnlocked ? 'var(--seal-bright)' : 'rgba(0,0,0,0.4)',
            color: isUnlocked ? 'white' : 'var(--muted)',
            border: `1px solid ${isUnlocked ? 'var(--seal-bright)' : 'var(--line)'}`,
            cursor: isUnlocked ? 'pointer' : 'not-allowed'
          }}
          onClick={isUnlocked ? onLearn : undefined}
          disabled={!isUnlocked}
        >
          Treinar
        </button>
      )}

    </div>
  );
}

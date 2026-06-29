import React, { useState } from 'react';
import { calculateXPForLevel, calculateHP, calculateChakra, calculateStamina } from '../utils/engine';
import AvatarModal from '../components/AvatarModal';
import '../styles/main.css';

const VILLAGES = {
  1: 'Folha',
  2: 'Areia',
  3: 'Névoa',
  4: 'Pedra',
  5: 'Nuvem',
  6: 'Som',
  7: 'Chuva'
};

export default function Dashboard({ player, updatePlayer }) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  if (!player) return null;

  const nextLevelXP = calculateXPForLevel(player.level + 1);
  const xpPercent = Math.min(100, (player.xp / nextLevelXP) * 100);

  const maxHP = calculateHP(player);
  const maxChakra = calculateChakra(player);
  const maxStamina = calculateStamina(player);

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', minHeight: '100vh', paddingBottom: '60px' }}>
      
      {/* PAINEL LATERAL ESQUERDO */}
      <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '160px', height: '200px', background: 'var(--ink-soft)', border: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', color: 'var(--seal-bright)',
            marginBottom: '16px', fontFamily: "'Shippori Mincho', serif", overflow: 'hidden'
          }}>
            {player.avatar?.startsWith('/') ? (
              <img src={player.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              player.avatar || '👤'
            )}
          </div>
          <div style={{ fontSize: '18px', fontFamily: "'Shippori Mincho', serif", marginBottom: '4px' }}>{player.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>{player.rank || 'Estudante'}</div>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn" onClick={() => setIsAvatarModalOpen(true)} style={{ width: '100%', background: 'var(--ink-raised)', borderColor: 'var(--line)', fontSize: '12px' }}>Trocar Imagem</button>
            <button className="btn" style={{ width: '100%', background: 'var(--ink-raised)', borderColor: 'var(--line)', fontSize: '12px', opacity: 0.5, cursor: 'not-allowed' }}>Trocar Fundo</button>
          </div>
        </div>

        <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Classe:</span> <span>Taijutsu</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Vila Oculta:</span> <span>{VILLAGES[player.village_id] || 'Desconhecida'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Level:</span> <span style={{ color: 'var(--gold)' }}>{player.level}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Poder Ninja:</span> <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(player.level * 150) + (player.pontos_atributos * 50)}</span></div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* HERO SECTION */}
        <div style={{ 
          background: 'url(/images/imgi_86_287-10.jpg) center/cover no-repeat', 
          border: '1px solid var(--line)', padding: '32px', position: 'relative', overflow: 'hidden', minHeight: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          {/* Sombra escura pra dar leitura nos textos */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--ink) 0%, transparent 60%)', zIndex: 0 }}></div>
          
          {/* BARRAS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="/images/imgi_8_heart.png" alt="HP" width="16" /> HP
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{maxHP}/{maxHP}</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'var(--ink-raised)', border: '1px solid var(--line)' }}>
                <div style={{ height: '100%', background: '#d32f2f', width: '100%' }}></div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="/images/imgi_9_chakra.png" alt="Chakra" width="16" /> Chakra
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{maxChakra}/{maxChakra}</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'var(--ink-raised)', border: '1px solid var(--line)' }}>
                <div style={{ height: '100%', background: '#1976d2', width: '100%' }}></div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="/images/imgi_10_stamina.png" alt="Stamina" width="16" /> Stamina
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{maxStamina}/{maxStamina}</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'var(--ink-raised)', border: '1px solid var(--line)' }}>
                <div style={{ height: '100%', background: '#fbc02d', width: '100%' }}></div>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '2px' }}>LVL</div>
              <div style={{ fontSize: '32px', fontFamily: "'Shippori Mincho', serif", color: 'var(--gold)' }}>{player.level}</div>
            </div>
          </div>

          {/* EXP BAR */}
          <div style={{ width: '100%', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '1px', marginBottom: '4px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--paper)' }}>
              EXP: {player.xp}/{nextLevelXP}
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--ink-raised)', border: '1px solid var(--line)' }}>
              <div style={{ height: '100%', background: '#4caf50', width: `${xpPercent}%` }}></div>
            </div>
          </div>

        </div>

        {/* 3 COLUNAS DE RESUMO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          
          <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '24px' }}>
            <h4 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '16px', marginBottom: '16px', textAlign: 'center', color: 'var(--paper)' }}>Resumo de Combates</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ color: '#4caf50' }}>Vitórias Dojo: 0</div>
              <div style={{ color: '#4caf50' }}>Vitórias PVP: 0</div>
              <div style={{ color: '#f44336' }}>Derrotas Dojo: 0</div>
              <div style={{ color: '#f44336' }}>Derrotas PVP: 0</div>
              <div style={{ color: 'var(--muted)' }}>Fugas: 0</div>
            </div>
          </div>

          <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '24px' }}>
            <h4 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '16px', marginBottom: '16px', textAlign: 'center', color: 'var(--paper)' }}>Resumo de Missões</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ color: '#4caf50' }}>Rank S: 0 OK / 0 Falhas</div>
              <div style={{ color: '#8bc34a' }}>Rank A: 0 OK / 0 Falhas</div>
              <div style={{ color: '#cddc39' }}>Rank B: 0 OK / 0 Falhas</div>
              <div style={{ color: '#ffeb3b' }}>Rank C: 0 OK / 0 Falhas</div>
              <div style={{ color: '#ffc107' }}>Rank D: 0 OK / 0 Falhas</div>
              <div style={{ color: 'var(--paper)', marginTop: '8px' }}>Tarefas: {player.tasks_completed || 0}</div>
            </div>
          </div>

          <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '24px' }}>
            <h4 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '16px', marginBottom: '16px', textAlign: 'center', color: 'var(--paper)' }}>Informações Extras</h4>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--gold)' }}>
              <div>Total de Ryous: {player.ryous}</div>
              <div style={{ color: 'var(--seal-bright)' }}>Pontos Disponíveis: {player.pontos_atributos}</div>
              <div>Bingo Book Mortos: 0</div>
              <div>Torneios Vencidos: 0</div>
              <div>Arenas Vencidas: 0</div>
            </div>
          </div>

        </div>

      </div>

      <AvatarModal 
        isOpen={isAvatarModalOpen} 
        onClose={() => setIsAvatarModalOpen(false)} 
        player={player} 
        updatePlayer={updatePlayer} 
      />
    </div>
  );
}

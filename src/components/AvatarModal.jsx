import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

const AVATARS = [
  { id: '/images/avatares/sasuke_01_kunai.png', tag: 'Kunai' },
  { id: '/images/avatares/sasuke_02_selagem.png', tag: 'Selagem' },
  { id: '/images/avatares/sasuke_03_flauta.png', tag: 'Flauta' },
  { id: '/images/avatares/sasuke_04_corrida.png', tag: 'Corrida' },
  { id: '/images/avatares/sasuke_05_costas_katana.png', tag: 'Katana' },
  { id: '/images/avatares/sasuke_06_kunais.png', tag: 'Kunais' },
  { id: '/images/avatares/sasuke_07_sharingan.png', tag: 'Sharingan' },
  { id: '/images/avatares/sasuke_08_chidori.png', tag: 'Chidori' },
  { id: '/images/avatares/sasuke_09_roupa_preta.png', tag: 'Som' },
  { id: '/images/avatares/sasuke_10_chidori_preto.png', tag: 'Chidori II' },
  { id: '/images/avatares/sasuke_11_kunai_boca.png', tag: 'Furtivo' },
  { id: '/images/avatares/sasuke_12_maldição.png', tag: 'Maldição' },
  { id: '/images/avatares/sasuke_13_combate.png', tag: 'Combate' },
  { id: '/images/avatares/sasuke_14_sorrindo.png', tag: 'Sorrindo' },
  { id: '/images/avatares/sasuke_15_velocidade.png', tag: 'Velocidade' },
  { id: '/images/avatares/sasuke_16_sharingan_preto.png', tag: 'Sharingan II' },
  { id: '/images/avatares/sasuke_17_fogo.png', tag: 'Fogo' },
  { id: '/images/avatares/sasuke_18_jovem.png', tag: 'Jovem' },
  { id: '/images/avatares/sasuke_19_hebi.png', tag: 'Hebi' },
  { id: '/images/avatares/sasuke_20_sharingan_adulto.png', tag: 'Adulto' },
  { id: '/images/avatares/sasuke_21_folhas.png', tag: 'Folhas' },
  { id: '/images/avatares/sasuke_22_neji_like.png', tag: 'Bandanas' },
  { id: '/images/avatares/sasuke_23_susanoo.png', tag: 'Susanoo' },
  { id: '/images/avatares/sasuke_24_eletrico.png', tag: 'Elétrico' },
  { id: '/images/avatares/sasuke_25_chidori_adulto.png', tag: 'Chidori III' },
  { id: '/images/avatares/sasuke_26_voo.png', tag: 'Voo' },
  { id: '/images/avatares/sasuke_27_adulto_full.png', tag: 'Full Art' },
  { id: '/images/avatares/sasuke_28_espada.png', tag: 'Espada' },
];

export default function AvatarModal({ isOpen, onClose, player, updatePlayer }) {
  const [selectedAvatar, setSelectedAvatar] = useState(player?.avatar || '/images/avatares/sasuke_01_kunai.png');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !player) return null;

  const handleConfirm = async () => {
    if (selectedAvatar === player.avatar) {
      onClose();
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('players')
      .update({ avatar: selectedAvatar })
      .eq('id', player.id);

    if (!error) {
      await updatePlayer(player.user_id);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div className="avatar-modal" onClick={e => e.stopPropagation()}>
        <div className="avatar-modal-head">
          <h3>Escolher avatar do personagem</h3>
          <div className="close" onClick={onClose}>✕</div>
        </div>
        <div className="avatar-modal-sub">Clã: {player.clan_id ? 'Vincular Nome do Clã' : 'Sem clã'}</div>

        <div className="avatar-grid">
          {AVATARS.map((av) => (
            <div 
              key={av.id} 
              className={`avatar-opt ${selectedAvatar === av.id ? 'selected' : ''}`}
              onClick={() => setSelectedAvatar(av.id)}
            >
              <img src={av.id} alt={av.tag} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
              <div className="tag">{av.tag}</div>
            </div>
          ))}
        </div>

        <div className="avatar-modal-foot">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
            <span>{loading ? 'Salvando...' : 'Confirmar'}</span>
            <div className="stamp"></div>
          </button>
        </div>
      </div>
    </div>
  );
}

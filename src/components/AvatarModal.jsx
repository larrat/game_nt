import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { useToast } from '../context/ToastContext';

export default function AvatarModal({ isOpen, onClose, player, updatePlayer }) {
  const { addToast } = useToast();
  const [selectedAvatar, setSelectedAvatar] = useState(player?.avatar || '/images/avatares/sasuke_01_kunai.png');
  const [loading, setLoading] = useState(false);
  const [allAvatars, setAllAvatars] = useState([]);

  useEffect(() => {
    async function fetchAvatars() {
      if (!player.character_id) return;
      const { data } = await supabase
        .from('avatars')
        .select('*')
        .eq('character_id', player.character_id)
        .order('id');
      if (data) setAllAvatars(data);
    }
    if (isOpen) fetchAvatars();
  }, [isOpen]);

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
      await updatePlayer(player.id);
      onClose();
    } else {
      addToast('Erro ao salvar avatar: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const unlocked = Array.isArray(player.unlocked_avatars) ? player.unlocked_avatars : [];

  // is_base is true means it's the base skin for THIS character, so it's always available
  const availableAvatars = allAvatars.filter(av => av.is_base || unlocked.includes(av.id));

  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div className="avatar-modal" onClick={e => e.stopPropagation()}>
        <div className="avatar-modal-head">
          <h3>Escolher avatar do personagem</h3>
          <div className="close" onClick={onClose}>✕</div>
        </div>
        <div className="avatar-modal-sub">Clã: {player.clan_id ? 'Vincular Nome do Clã' : 'Sem clã'}</div>

        <div className="avatar-grid">
          {availableAvatars.map((av) => (
            <div 
              key={av.id} 
              className={`avatar-opt ${selectedAvatar === av.id ? 'selected' : ''}`}
              onClick={() => setSelectedAvatar(av.id)}
            >
              <img src={av.id} alt={av.name} className="avatar-img" />
              <div className="tag">{av.name}</div>
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

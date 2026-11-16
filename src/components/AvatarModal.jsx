import React, { useState, useEffect, useRef } from 'react';
import CharacterPortrait from './CharacterPortrait';
import { hasLocalCharacterPortrait } from '../utils/localCharacterPortrait';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { useToast } from '../context/ToastContext';

export default function AvatarModal({ isOpen, onClose, player, updatePlayer }) {
  const { addToast } = useToast();
  const [selectedAvatar, setSelectedAvatar] = useState(player?.avatar || '/images/avatares/sasuke_01_kunai.png');
  const [loading, setLoading] = useState(false);
  const [allAvatars, setAllAvatars] = useState([]);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const priorFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        modalRef.current?.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
        ) || []
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (priorFocus && typeof priorFocus.focus === 'function' && priorFocus.isConnected) {
        priorFocus.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !player?.character_id) {
      if (!isOpen) setAllAvatars([]);
      return undefined;
    }

    let cancelled = false;
    setSelectedAvatar(player.avatar || '');
    setAllAvatars([]);

    async function fetchAvatars() {
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .eq('character_id', player.character_id)
        .order('id');

      if (cancelled) return;
      if (error) {
        addToast('Não foi possível carregar os avatares deste personagem.', 'error');
        setAllAvatars([]);
        return;
      }
      setAllAvatars(data || []);
    }

    fetchAvatars();
    return () => { cancelled = true; };
  }, [isOpen, player?.id, player?.character_id, player?.avatar, addToast]);

  if (!isOpen || !player) return null;

  const handleConfirm = async () => {
    if (selectedAvatar === player.avatar) {
      onClose();
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('alterar_avatar_jogador', {
      p_player_id: player.id,
      p_avatar_id: selectedAvatar
    });

    if (!error) {
      await updatePlayer(player.id);
      onClose();
    } else {
      addToast('Erro ao salvar avatar: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const unlocked = Array.isArray(player.unlocked_avatars) ? player.unlocked_avatars : [];
  const availableAvatars = allAvatars.filter(av => (av.is_base || unlocked.includes(av.id)) && hasLocalCharacterPortrait(av.id));

  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kuro-avatar-modal-title"
        aria-busy={loading}
        className="avatar-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="avatar-modal-head">
          <h3 id="kuro-avatar-modal-title">Escolher avatar do personagem</h3>
          <button
            ref={closeButtonRef}
            type="button"
            className="close bg-transparent border-0 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Fechar seletor de avatar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="avatar-modal-sub">Clã: {player.clan_id ? 'Vincular Nome do Clã' : 'Sem clã'}</div>

        <div className="avatar-grid">
          {availableAvatars.map((av) => (
            <button
              type="button"
              key={av.id}
              className={`avatar-opt ${selectedAvatar === av.id ? 'selected' : ''}`}
              aria-pressed={selectedAvatar === av.id}
              aria-label={'Selecionar ' + av.name}
              disabled={loading}
              onClick={() => setSelectedAvatar(av.id)}
            >
              <CharacterPortrait src={av.id} alt="" className="avatar-img" />
              <span className="tag">{av.name}</span>
            </button>
          ))}
        </div>

        <div className="avatar-modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={handleConfirm} disabled={loading || !selectedAvatar}>
            <span>{loading ? 'Salvando...' : 'Confirmar'}</span>
            <div className="stamp"></div>
          </button>
        </div>
      </div>
    </div>
  );
}

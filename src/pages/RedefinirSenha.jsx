import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import '../styles/auth-polish-v4.css';

export default function RedefinirSenha() {
  const { addToast } = useToast();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setHasSession(Boolean(data?.session) && !error);
    }).catch(() => {
      if (active) setHasSession(false);
    }).finally(() => {
      if (active) setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setHasSession(Boolean(session));
        setChecking(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (password.length < 8) {
      addToast('Use uma senha com pelo menos 8 caracteres.', 'error');
      return;
    }
    if (password !== confirmation) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      addToast('Senha atualizada com sucesso!', 'success');
      window.location.replace('/selecionar');
    } catch (error) {
      addToast(error?.message || 'Não foi possível alterar sua senha.', 'error');
      setSaving(false);
    }
  };

  return (
    <div className="login-body kuro-recovery-v4 min-h-screen w-full bg-ink">
      <div className="panel-brand" aria-hidden="true">
        <div className="brand"><div className="mark"></div>KUROKAGE</div>
        <div className="panel-quote">
          <div className="eyebrow">Proteja sua conta</div>
          <h2>Uma nova senha para uma nova <em>jornada</em>.</h2>
        </div>
      </div>
      <div className="panel-form w-full">
        <div className="brand mb-10 min-[861px]:hidden"><div className="mark"></div>KUROKAGE</div>
        <h1 className="font-shippori text-3xl font-semibold mb-3">Redefinir senha</h1>
        {checking ? (
          <p className="text-muted-bright text-sm">Validando seu link de recuperação...</p>
        ) : !hasSession ? (
          <div>
            <p className="text-muted-bright text-sm mb-6">Link expirado ou inválido. Solicite outro link na tela de login.</p>
            <a className="btn-ghost inline-block" href="/login">Voltar ao login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-muted-bright text-sm mb-7">Escolha uma nova senha para sua conta.</p>
            <div className="field">
              <label htmlFor="reset-password">Nova senha</label>
              <div className="relative">
                <input id="reset-password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password" minLength={8} required disabled={saving} className="pr-24" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gold"
                  onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="reset-confirmation">Confirme a nova senha</label>
              <input id="reset-confirmation" type="password" value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password" minLength={8} required disabled={saving} />
            </div>
            <button type="submit" className="btn-primary w-full disabled:opacity-60" disabled={saving}>
              <span>{saving ? 'Salvando...' : 'Atualizar senha'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

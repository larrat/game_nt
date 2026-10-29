import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

const AUTH_MODES = ['login', 'signup', 'forgot'];

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const selectMode = (nextMode) => {
    if (!AUTH_MODES.includes(nextMode)) return;
    setMode(nextMode);
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      addToast('Informe um e-mail válido.', 'error');
      return;
    }
    if (mode !== 'forgot' && !password) {
      addToast('Digite sua senha.', 'error');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      addToast('Escolha uma senha com pelo menos 8 caracteres.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (error) throw error;
        // O App.jsx faz a transição ao receber o evento de autenticação.
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: new URL('/selecionar', window.location.origin).toString() }
        });
        if (error) throw error;
        if (!data?.session) {
          addToast('Cadastro recebido! Confirme seu e-mail para entrar, caso seja solicitado.', 'success');
          selectMode('login');
        } else {
          addToast('Conta criada com sucesso!', 'success');
        }
      } else {
        const redirectTo = new URL('/redefinir-senha', window.location.origin).toString();
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo
        });
        if (error) throw error;
        addToast('Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.', 'success');
        selectMode('login');
      }
    } catch (error) {
      const message = mode === 'login' && (error?.status === 400 || error?.message?.includes('Invalid login credentials'))
        ? 'E-mail ou senha incorretos.'
        : error?.message || 'Não foi possível concluir a operação. Tente novamente.';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body min-h-screen w-full bg-ink">
      <div className="panel-brand" aria-hidden="true">
        <div className="strokes">
          <svg viewBox="0 0 500 700" preserveAspectRatio="xMidYMid slice">
            <path d="M40 30 C 100 160, 10 280, 110 410 C 170 500, 60 580, 100 690" stroke="#b3232d" strokeWidth="3" fill="none" opacity="0.45"/>
            <path d="M120 60 C 170 210, 90 320, 160 460 C 200 550, 110 610, 150 690" stroke="#c9a227" strokeWidth="1.5" fill="none" opacity="0.3"/>
            <circle cx="95" cy="160" r="2.5" fill="#c9a227" opacity="0.7"/>
            <circle cx="150" cy="430" r="2" fill="#b3232d" opacity="0.6"/>
          </svg>
        </div>
        <div className="brand"><div className="mark"></div>KUROKAGE</div>
        <div className="panel-quote">
          <div className="eyebrow">Sua jornada ninja começa aqui</div>
          <h2>O vínculo que você escolhe vale mais que o <em>poder</em> que você herda.</h2>
        </div>
      </div>

      <form className="panel-form w-full" onSubmit={handleSubmit}>
        <div className="brand mb-10 min-[861px]:hidden"><div className="mark"></div>KUROKAGE</div>
        <p className="text-gold text-xs uppercase tracking-[.22em] mb-3">Portal shinobi</p>
        <h1 className="font-shippori text-3xl font-semibold text-paper mb-2">
          {mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Comece sua lenda' : 'Recuperar acesso'}
        </h1>
        <p className="text-muted-bright text-sm mb-8">
          {mode === 'login' ? 'Entre na sua conta para continuar sua jornada.' : mode === 'signup' ? 'Crie sua conta e escolha seu personagem.' : 'Enviaremos um link para redefinir sua senha.'}
        </p>

        <div className="tabs" aria-label="Acesso à conta">
          <button type="button" className={'tab border-0 bg-transparent ' + (mode === 'login' ? 'active' : '')} aria-pressed={mode === 'login'} onClick={() => selectMode('login')}>Entrar</button>
          <button type="button" className={'tab border-0 bg-transparent ' + (mode === 'signup' ? 'active' : '')} aria-pressed={mode === 'signup'} onClick={() => selectMode('signup')}>Criar conta</button>
        </div>

        <div className="field">
          <label htmlFor="auth-email">E-mail</label>
          <input id="auth-email" name="email" type="email" placeholder="seu@email.com"
            value={email} onChange={(event) => setEmail(event.target.value)}
            autoComplete="email" inputMode="email" required disabled={loading} />
        </div>

        {mode !== 'forgot' && (
          <div className="field">
            <label htmlFor="auth-password">Senha</label>
            <div className="relative">
              <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha" value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 8 : undefined}
                className="pr-24" required disabled={loading} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gold hover:text-paper"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {mode === 'signup' && <p className="text-muted-bright text-xs mt-2">Use pelo menos 8 caracteres.</p>}
          </div>
        )}

        {mode === 'login' && (
          <div className="flex justify-end mb-7">
            <button type="button" className="forgot bg-transparent border-0 text-gold"
              onClick={() => selectMode('forgot')}>Esqueci minha senha</button>
          </div>
        )}

        {mode === 'forgot' && (
          <button type="button" className="text-muted-bright text-xs text-left mb-7 hover:text-gold"
            onClick={() => selectMode('login')}>Voltar ao login</button>
        )}

        <button type="submit" className="btn-primary w-full min-h-12 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading}>
          <span>{loading ? 'Processando...' : mode === 'login' ? 'Acessar jogo' : mode === 'signup' ? 'Criar minha conta' : 'Enviar link de recuperação'}</span>
        </button>

        <p className="text-xs text-muted-bright mt-7 text-center leading-relaxed">
          {mode === 'login'
            ? 'Sua sessão permanecerá ativa até você sair da conta.'
            : mode === 'signup'
              ? 'Já possui uma conta? Use a opção Entrar acima.'
              : 'Confira também a pasta de spam do seu e-mail.'}
        </p>
      </form>
    </div>
  );
}

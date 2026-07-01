import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  
  const handleAction = async () => {
    if (!email) {
      addToast('Preencha o e-mail!', 'error');
      return;
    }
    if (mode !== 'forgot' && !password) {
      addToast('Preencha a senha!', 'error');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) addToast('Erro ao logar: ' + error.message, 'error');
    } 
    else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) addToast('Erro ao criar conta: ' + error.message, 'error');
      else addToast('Conta criada! Você já pode fazer login ou confirmar o e-mail (se necessário).', 'success');
    }
    else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) addToast('Erro: ' + error.message, 'error');
      else addToast('E-mail de recuperação enviado! Cheque sua caixa de entrada.', 'success');
    }

    setLoading(false);
  };

  return (
    <div className="login-body page" style={{ minHeight: '100vh', display: 'flex', width: '100%', position: 'absolute', top: 0, left: 0 }}>
      <div className="panel-brand">
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
          <div className="eyebrow">Temporada IV</div>
          <h2>O vínculo que você escolhe<br/>vale mais que o <em>poder</em> que você herda.</h2>
        </div>
      </div>

      <div className="panel-form">
        <div className="tabs">
          <div className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); }}>Entrar</div>
          <div className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); }}>Criar conta</div>
        </div>

        {mode === 'forgot' && (
          <div className="section-title paper" style={{ marginBottom: '24px', fontSize: '18px' }}>
            Recuperação de Senha
          </div>
        )}

        <div className="field">
          <label>E-mail</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        
        {mode !== 'forgot' && (
          <div className="field">
            <label>Senha</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        )}

        {mode === 'login' && (
          <div className="row-between flex-between">
            <label className="checkbox"><input type="checkbox" /> Manter conectado</label>
            <span className="forgot gold" onClick={() => { setMode('forgot'); }} style={{ cursor: 'pointer' }}>Esqueci minha senha</span>
          </div>
        )}
        
        {mode === 'forgot' && (
          <div className="row-between flex-between">
            <span className="forgot muted" onClick={() => { setMode('login'); }} style={{ cursor: 'pointer' }}>Voltar para o Login</span>
          </div>
        )}

        <button className="btn-primary" onClick={handleAction} disabled={loading}>
          <span>
            {loading ? 'Processando...' : mode === 'login' ? 'Acessar' : mode === 'signup' ? 'Registrar' : 'Enviar E-mail'}
          </span>
          <div className="stamp"></div>
        </button>

        <div className="divider"><div className="line"></div><span>OU</span><div className="line"></div></div>

        <div className="switch">
          {mode === 'login' ? (
            <>Ainda não tem conta? <span className="gold" style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => { setMode('signup'); }}>Forje seu personagem</span></>
          ) : (
            <>Já é um ninja? <span className="gold" style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => { setMode('login'); }}>Faça Login</span></>
          )}
        </div>
      </div>
    </div>
  );
}

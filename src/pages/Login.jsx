import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    if (!email || !password) return alert('Preencha os campos!');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (error) {
      alert("Erro ao logar: " + error.message);
      setLoading(false);
    }
    // Note: If successful, App.jsx's onAuthStateChange will trigger and redirect automatically.
  };

  return (
    <div className="login-body" style={{ minHeight: '100vh', display: 'flex', width: '100%', position: 'absolute', top: 0, left: 0, background: 'var(--ink)' }}>
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
          <div className="tab active">Entrar</div>
          <div className="tab" style={{ cursor: 'pointer' }} onClick={() => alert("Ainda precisamos migrar Criar Conta. Use /legacy/criar.html por enquanto.")}>Criar conta</div>
        </div>

        <div className="field">
          <label>E-mail</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <div className="row-between">
          <label className="checkbox"><input type="checkbox" /> Manter conectado</label>
          <span className="forgot">Esqueci minha senha</span>
        </div>

        <button className="btn-primary" onClick={handleLogin} disabled={loading}>
          <span>{loading ? 'Acessando...' : 'Acessar'}</span>
          <div className="stamp"></div>
        </button>

        <div className="divider"><div className="line"></div><span>OU</span><div className="line"></div></div>

        <div className="switch">
          Ainda não tem conta? <span style={{ color: 'var(--seal-bright)', cursor: 'pointer', fontWeight: 600 }} onClick={() => window.location.href = '/legacy/criar.html'}>Forje seu personagem</span>
        </div>
      </div>
    </div>
  );
}

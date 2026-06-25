import React, { useState } from 'react';
import { dbService, isSupabaseConfigured } from '../supabaseClient';

interface LoginViewProps {
  onLoginSuccess: (userEmail: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Preencha e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      if (isRegistering) {
        // Sign up
        await dbService.auth.signUp(email, password);
        alert('Cadastro realizado com sucesso! Faça login agora.');
        setIsRegistering(false);
        setPassword('');
      } else {
        // Sign in
        const user = await dbService.auth.signIn(email, password);
        if (user && user.email) {
          onLoginSuccess(user.email);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 99999,
      background: 'linear-gradient(135deg, #0b0914 0%, #151124 100%)'
    }}>
      {/* Background blobs for premium glassmorphism aesthetic */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(223, 168, 61, 0.15) 0%, rgba(223, 168, 61, 0) 70%)',
        top: '15%',
        left: '20%',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, rgba(236, 72, 153, 0) 70%)',
        bottom: '15%',
        right: '20%',
        zIndex: 0
      }}></div>

      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '40px 30px',
        background: 'rgba(26, 21, 41, 0.65)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* Boutique branding */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{
            display: 'inline-flex',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(223, 168, 61, 0.3)',
            marginBottom: '15px'
          }}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: '24px', color: 'white' }}></i>
          </div>
          
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            JAJA Cosméticos
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
            {isRegistering ? 'Crie seu cadastro administrativo' : 'Faça login para gerenciar estoque & vendas'}
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <div className="alert-banner" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginBottom: '20px', display: 'flex', padding: '10px' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px', marginTop: '2px' }}></i>
              <span style={{ fontSize: '12px' }}>{errorMsg}</span>
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label className="form-label">E-mail</label>
            <div className="search-input-wrapper" style={{ margin: 0 }}>
              <i className="fa-solid fa-envelope" style={{ color: 'var(--text-muted)' }}></i>
              <input 
                type="email" 
                className="form-control" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: administrador@jaja.com"
                style={{ paddingLeft: '35px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label className="form-label">Senha</label>
            <div className="search-input-wrapper" style={{ margin: 0 }}>
              <i className="fa-solid fa-lock" style={{ color: 'var(--text-muted)' }}></i>
              <input 
                type="password" 
                className="form-control" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Informe sua senha"
                style={{ paddingLeft: '35px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100" 
            disabled={loading}
            style={{
              padding: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 15px rgba(223, 168, 61, 0.2)',
              cursor: 'pointer',
              color: 'white',
              transition: 'var(--transition)'
            }}
          >
            {loading 
              ? (isRegistering ? 'Cadastrando...' : 'Entrando...') 
              : (isRegistering ? 'Cadastrar Administrador' : 'Entrar no Painel')
            }
          </button>
        </form>

        {/* Database indicator */}
        <div style={{ 
          marginTop: '25px', 
          textAlign: 'center', 
          borderTop: '1px solid var(--border-color)', 
          paddingTop: '15px', 
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <span>Modo: </span>
          <strong style={{ color: isSupabaseConfigured ? 'var(--success)' : 'var(--warning)' }}>
            {isSupabaseConfigured ? 'Produção (Supabase)' : 'Demonstração Local (LocalStorage)'}
          </strong>
          
          <div style={{ marginTop: '10px' }}>
            <button 
              type="button" 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? 'Já possui login? Entrar' : 'Novo por aqui? Criar conta'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

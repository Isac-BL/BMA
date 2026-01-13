
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types.ts';
import { supabase } from '../supabase.ts';

import { usePWAInstall } from '../hooks/usePWAInstall.ts';

const InstallButton = () => {
  const { isSupported, isStandalone, install } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isStandalone || (!isSupported && !showInstructions)) return null;

  const handleClick = async () => {
    const result = await install();
    if (result === 'ios-instructions') {
      setShowInstructions(true);
    }
  };

  if (showInstructions) {
    return (
      <div className="absolute top-20 left-4 right-4 z-50 text-sm text-[#b7b19e] bg-[#211d11] p-3 rounded-lg border border-[#383429] animate-slide-up shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <p className="font-bold text-white">Instalar no iPhone/iPad:</p>
          <button onClick={() => setShowInstructions(false)}><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
        <ol className="space-y-2 text-left">
          <li className="flex items-center gap-2">
            <span>1. Toque em</span>
            <span className="material-symbols-outlined text-blue-500">ios_share</span>
            <span>(Compartilhar)</span>
          </li>
          <li className="flex items-center gap-2">
            <span>2. Selecione</span>
            <span className="font-bold text-white border border-[#383429] bg-[#383429] px-2 py-0.5 rounded text-xs">Adicionar à Tela de Início</span>
          </li>
        </ol>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="absolute top-4 right-4 bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-full transition-colors z-50"
      title="Instalar Aplicativo"
    >
      <span className="material-symbols-outlined">download</span>
    </button>
  );
};

const Login: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Clean up state
      window.history.replaceState({}, '');
    }
  }, [location]);

  const isBarber = role?.toUpperCase() === UserRole.BARBER;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Check if Supabase client is initialized
    if (!supabase) {
      console.error("CRITICAL: Supabase client is null. Check environment variables.");
      setError("Erro de configuração do sistema. Contate o suporte.");
      setLoading(false);
      return;
    }

    try {
      // 2. Debug logs
      console.log("Attempting login with:", email);

      // 3. Direct call without custom timeout wrapper
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        console.error("Supabase Auth Error:", loginError);
        if (loginError.message === 'Invalid login credentials') {
          setError('E-mail ou senha incorretos.');
        } else {
          setError(loginError.message || 'Erro ao fazer login.');
        }
        setLoading(false);
      } else {
        // Successful login
        console.log("Login successful:", data);
        setTimeout(() => {
          navigate(isBarber ? '/barber' : '/client');
        }, 100);
      }
    } catch (err: any) {
      // 4. Log the REAL error
      console.error("LOGIN ERROR REAL:", err);
      setError(err.message || 'Ocorreu um erro inesperado.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Insira seu e-mail para recuperar a senha');
      return;
    }

    setLoading(true);
    setError(null); // Clear previous errors
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/barber/reset-password`
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      alert('E-mail de recuperação enviado!');
    }
    setLoading(false);
  };

  return (
    <div className="bg-background-dark text-white font-display min-h-screen flex flex-col justify-between overflow-x-hidden selection:bg-primary selection:text-background-dark relative">
      <InstallButton />
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto relative z-10">
        <div className="@container w-full">
          <div className="relative w-full h-[35vh] min-h-[280px] rounded-b-3xl overflow-hidden shadow-2xl shadow-black/50">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCsquxjvqFUD9QMP_jKaWdYDj5Qgyjfe7oVinDk3KA2KOnKgwiIMwmK49MObhZt4MP7Yv36D2Tz-dHxTacTbA707bm3GzjiLIb7e8PMxYjFclTPOINFFQyvjT4OtosTKmwy-pMCafRnhIFpMXXNuj89cyDGZJnKBLdLzJt7OU0zLN4v_OPNMhPVkZUYQq0LmN4UNeT3dPMnsS0DvJA2Cs81cfuJCVlxuacDzWoq3AokOtwk7U2iBMl-iqiqM6a9IM-2AQr75Eh9rns")` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#171611] via-[#171611]/60 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-6 pb-8">
              <div className="flex items-center gap-2 mb-2 opacity-80 cursor-pointer" onClick={() => navigate('/')}>
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>content_cut</span>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Barbearia Mateus Andrade</span>
              </div>
              <h1 className="text-white text-3xl font-extrabold leading-tight">
                Bem-vindo,<br />
                <span className="text-primary">{isBarber ? 'Barbeiro' : 'Cliente'}</span>
              </h1>
              <p className="text-text-muted text-sm mt-2 font-medium">Acesse sua área exclusiva.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col px-6 py-8 gap-6">
          <form className="flex-1 flex flex-col gap-6" onSubmit={handleSubmit}>
            {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">{error}</div>}
            {success && <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500 text-sm text-center">{success}</div>}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">E-mail {isBarber ? 'Profissional' : ''}</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-text-muted group-focus-within:text-primary transition-colors">mail</span>
                </div>
                <input
                  className="w-full h-14 pl-12 pr-4 bg-surface-dark border border-white/5 rounded-xl text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 disabled:opacity-50"
                  placeholder={isBarber ? "exemplo@barbearia.com" : "seu@email.com"}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Senha</label>
              <div className="relative group flex items-stretch rounded-xl bg-surface-dark border border-white/5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-300">
                <div className="pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-text-muted group-focus-within:text-primary transition-colors">lock</span>
                </div>
                <input
                  className="flex-1 h-14 pl-3 pr-2 bg-transparent border-none text-white placeholder-text-muted/50 focus:ring-0 focus:outline-none disabled:opacity-50"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  className="pr-4 pl-2 flex items-center justify-center text-text-muted hover:text-white transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button
                  onClick={handleResetPassword}
                  className="text-sm font-medium text-text-muted hover:text-primary transition-colors flex items-center gap-1"
                  type="button"
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="flex flex-col gap-4 mt-4 mb-4">
              <button
                className="w-full h-14 bg-primary hover:bg-yellow-500 active:scale-[0.98] text-background-dark text-base font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Entrando...' : `Entrar como ${isBarber ? 'Barbeiro' : 'Cliente'}`}</span>
                <span className="material-symbols-outlined text-xl">{loading ? 'sync' : 'arrow_forward'}</span>
              </button>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink-0 mx-4 text-text-muted text-xs uppercase tracking-wider">
                  {isBarber ? 'Novo na equipe?' : 'Ainda não tem conta?'}
                </span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>
              <button
                className="w-full h-14 bg-transparent border border-white/5 hover:border-text-muted hover:bg-surface-dark active:scale-[0.98] text-white text-base font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                type="button"
                onClick={() => navigate(`/signup/${role}`)}
                disabled={loading}
              >
                Criar conta de {isBarber ? 'Barbeiro' : 'Cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

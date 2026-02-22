
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserRole } from '../types.ts';
import { supabase } from '../supabase.ts';

const Signup: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const isBarber = role?.toUpperCase() === UserRole.BARBER;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    accessCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BARBER_ACCESS_CODE = 'BMA2026';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isBarber && formData.accessCode !== BARBER_ACCESS_CODE) {
      setError('Código de acesso inválido para barbeiros');
      setLoading(false);
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          role: isBarber ? UserRole.BARBER : UserRole.CLIENT
        }
      }
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
    } else {
      // Se o email confirm estiver desativado no Supabase, data.session estará presente.
      if (data.session) {
        navigate(isBarber ? '/barber' : '/client');
      } else {
        // Redireciona para login caso a sessão não seja iniciada automaticamente
        navigate(`/login/${role}`, {
          state: { message: 'Conta criada com sucesso! Você já pode fazer login.' }
        });
      }
    }
  };

  return (
    <div className="bg-background-dark text-white font-display min-h-screen flex flex-col justify-between overflow-x-hidden selection:bg-primary selection:text-background-dark">
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
                Criar Conta,<br />
                <span className="text-primary">{isBarber ? 'Barbeiro' : 'Cliente'}</span>
              </h1>
              <p className="text-text-muted text-sm mt-2 font-medium">Cadastre-se na nossa plataforma premium.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col px-6 py-4 gap-6">
          <div className="glass rounded-[2.5rem] p-6 border-white/5 shadow-2xl animate-in slide-in-from-bottom duration-500 will-change-transform">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              {error && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center font-bold tracking-tight">{error}</div>}

              {isBarber && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Código de Acesso Corporativo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-primary group-focus-within:text-white transition-colors">key</span>
                    </div>
                    <input
                      className="w-full h-14 pl-12 pr-4 bg-primary/10 border border-primary/30 rounded-2xl text-white placeholder-primary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 disabled:opacity-50 font-bold"
                      placeholder="Código secreto"
                      value={formData.accessCode}
                      onChange={e => setFormData({ ...formData, accessCode: e.target.value })}
                      required={isBarber}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-white/20 group-focus-within:text-primary transition-colors">person</span>
                  </div>
                  <input
                    className="w-full h-14 pl-12 pr-4 bg-background-dark/50 border border-white/5 rounded-2xl text-white placeholder-white/10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 disabled:opacity-50 font-bold"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Seu melhor E-mail</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-white/20 group-focus-within:text-primary transition-colors">mail</span>
                  </div>
                  <input
                    className="w-full h-14 pl-12 pr-4 bg-background-dark/50 border border-white/5 rounded-2xl text-white placeholder-white/10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 disabled:opacity-50 font-bold"
                    placeholder="seu@email.com"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Crie sua Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-white/20 group-focus-within:text-primary transition-colors">lock</span>
                  </div>
                  <input
                    className="w-full h-14 pl-12 pr-4 bg-background-dark/50 border border-white/5 rounded-2xl text-white placeholder-white/10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 disabled:opacity-50 font-bold"
                    placeholder="••••••••"
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <button
                  className="w-full h-16 bg-primary hover:bg-yellow-500 active:scale-[0.98] text-background-dark text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-gold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? 'Processando...' : `Confirmar Cadastro`}</span>
                  <span className="material-symbols-outlined text-xl">{loading ? 'sync' : 'person_add'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-widest text-white/20">Já é de casa?</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>
            <button
              className="w-full h-14 bg-transparent border border-white/5 hover:border-white/20 hover:bg-white/5 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all duration-200"
              type="button"
              onClick={() => navigate(`/login/${role}`)}
            >
              Fazer Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

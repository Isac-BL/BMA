import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types.ts';
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
      <div className="text-sm text-[#b7b19e] bg-[#211d11] p-3 rounded-lg border border-[#383429] w-full max-w-xs animate-slide-up">
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
      className="flex items-center gap-2 text-[#b7b19e] hover:text-primary transition-colors text-sm font-medium px-4 py-2 border border-[#383429] rounded-full bg-[#171611]/50 mb-4"
    >
      <span className="material-symbols-outlined text-lg">download</span>
      <span>Instalar Aplicativo</span>
    </button>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white min-h-screen flex flex-col antialiased selection:bg-primary selection:text-background-dark overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-0 dark:opacity-100 mix-blend-soft-light z-0" style={{ background: 'radial-gradient(circle at 50% 10%, #2d281a 0%, #221e10 60%, #181611 100%)' }}>
      </div>
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto px-6 pt-12 pb-8 h-full min-h-screen">
        <div className="flex flex-col items-center w-full mt-8 animate-fade-in">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-primary rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative w-36 h-36 rounded-full border-2 border-primary/20 bg-background-dark shadow-glow flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://placeholder.pics/svg/200/221e10/f2b90d')] bg-center bg-cover opacity-10" data-alt="Subtle geometric pattern texture overlay on logo background"></div>
              <img className="w-full h-full object-cover" data-alt="Barbearia Mateus Andrade (BMA) Monogram Logo in Gold" src="/logo.png" fetchPriority="high" width="144" height="144" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#181611] dark:text-white">
              Barbearia <span className="text-primary">Mateus Andrade</span>
            </h1>
            <p className="text-sm font-medium text-[#637588] dark:text-[#bab29c]">
              Experiência premium em cuidados masculinos
            </p>
          </div>
        </div>
        <div className="w-full flex flex-col gap-6 mt-12">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink-0 mx-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Identifique-se</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            onClick={() => navigate(`/signup/${UserRole.BARBER.toLowerCase()}`)}
            className="group relative w-full h-20 rounded-[2rem] p-px overflow-hidden transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative h-full w-full glass rounded-[2rem] flex items-center justify-between px-7 border-white/5 group-hover:border-primary/30 transition-all">
              <div className="flex items-center gap-5">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-[28px]">content_cut</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-white text-base font-black leading-tight tracking-tight">Sou Barbeiro</span>
                  <span className="text-primary text-[10px] font-black uppercase tracking-wider">Acesso Profissional</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all">arrow_forward</span>
            </div>
          </button>

          <button
            onClick={() => navigate(`/login/${UserRole.CLIENT.toLowerCase()}`)}
            className="group relative w-full h-20 rounded-[2rem] p-px overflow-hidden transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative h-full w-full glass rounded-[2rem] flex items-center justify-between px-7 border-white/5 group-hover:border-white/20 transition-all">
              <div className="flex items-center gap-5">
                <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <span className="material-symbols-outlined text-white/60 text-[28px]">person</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-white text-base font-black leading-tight tracking-tight">Sou Cliente</span>
                  <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">Agendar Atendimento</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-white opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all">arrow_forward</span>
            </div>
          </button>
        </div>
        <div className="w-full mt-auto pt-10 flex flex-col items-center gap-6">
          <a className="group flex items-center gap-1 text-sm text-[#bab29c] hover:text-primary transition-colors" href="#">
            <span className="underline decoration-1 underline-offset-4 decoration-white/20 group-hover:decoration-primary/50">Termos de Uso e Política de Privacidade</span>
          </a>
          <div className="flex items-center justify-center gap-2 opacity-40">
            <div className="h-1 w-1 rounded-full bg-white"></div>
            <p className="text-[10px] uppercase tracking-widest text-white font-medium">Versão 1.0.0</p>
            <div className="h-1 w-1 rounded-full bg-white"></div>
          </div>

          <InstallButton />
        </div>
      </div>
    </div>
  );
};

export default Landing;

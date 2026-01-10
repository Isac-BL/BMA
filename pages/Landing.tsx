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
              <img className="w-full h-full object-cover" data-alt="Barbearia Mateus Andrade (BMA) Monogram Logo in Gold" src="/logo.png" />
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
        <div className="w-full flex flex-col gap-5 mt-10">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300 dark:border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">Entrar como</span>
            <div className="flex-grow border-t border-gray-300 dark:border-white/10"></div>
          </div>
          <button
            onClick={() => navigate(`/signup/${UserRole.BARBER.toLowerCase()}`)}
            className="relative group w-full p-1 rounded-xl transition-transform active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-primary rounded-xl blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative w-full h-16 bg-primary hover:bg-[#d9a60b] rounded-xl flex items-center justify-between px-6 transition-colors shadow-gold cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-black/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#181611] text-[24px]">content_cut</span>
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[#181611] text-base font-bold leading-none tracking-wide">SOU BARBEIRO</span>
                  <span className="text-[#181611]/70 text-[10px] font-semibold uppercase mt-1 tracking-wider">Acesso Administrativo</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#181611] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </button>
          <button
            onClick={() => navigate(`/login/${UserRole.CLIENT.toLowerCase()}`)}
            className="relative group w-full p-1 rounded-xl transition-transform active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-white rounded-xl blur-sm opacity-10 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative w-full h-16 bg-white hover:bg-gray-100 rounded-xl flex items-center justify-between px-6 transition-colors shadow-white cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-black text-[24px]">person</span>
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-black text-base font-bold leading-none tracking-wide">SOU CLIENTE</span>
                  <span className="text-black/60 text-[10px] font-semibold uppercase mt-1 tracking-wider">Agendar e Histórico</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-black group-hover:translate-x-1 transition-transform">arrow_forward</span>
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

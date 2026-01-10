import React, { useEffect, useState } from 'react';

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if standalone
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isInStandaloneMode);

        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        if (!isInStandaloneMode) {
            if (!ios) {
                const handler = (e: any) => {
                    e.preventDefault();
                    setDeferredPrompt(e);
                    // Don't show immediately, check local storage
                    const hasClosed = localStorage.getItem('pwa-prompt-closed');
                    if (!hasClosed) setIsVisible(true);
                };
                window.addEventListener('beforeinstallprompt', handler);
                return () => window.removeEventListener('beforeinstallprompt', handler);
            } else {
                // For iOS, check local storage
                const hasClosed = localStorage.getItem('pwa-prompt-closed');
                if (!hasClosed) setIsVisible(true);
            }
        }
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsVisible(false);
            }
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        // Hide for 7 days
        // But for simplicity just set a flag.
        localStorage.setItem('pwa-prompt-closed', 'true');
    };

    if (isStandalone || !isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up md:left-auto md:w-96">
            <div className="bg-[#2c281b] border border-[#383429] rounded-xl p-4 shadow-lg flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex gap-3 items-center">
                        <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center p-1 shrink-0 overflow-hidden">
                            <img src="/logo.png" alt="BMA" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Instalar App BMA</h3>
                            <p className="text-[#b7b19e] text-sm">Mais rápido e fácil de acessar</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-[#b7b19e] hover:text-white p-1">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {isIOS ? (
                    <div className="text-sm text-[#b7b19e] bg-[#211d11] p-3 rounded-lg border border-[#383429]">
                        <p className="mb-2">Para instalar no iPhone/iPad:</p>
                        <ol className="space-y-2">
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
                ) : (
                    <button
                        onClick={handleInstallClick}
                        className="w-full bg-[#e1b42d] hover:bg-[#bfa040] text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(225,180,45,0.3)]"
                    >
                        <span className="material-symbols-outlined">download</span>
                        Instalar Agora
                    </button>
                )}
            </div>
        </div>
    );
};

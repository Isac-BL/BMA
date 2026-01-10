import { useState, useEffect } from 'react';

// Use a singleton to hold the event, in case the hook initializes after the event fired
let deferredPrompt: any = null;

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });
}

export function usePWAInstall() {
    const [prompt, setPrompt] = useState<any>(deferredPrompt);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

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

        // If iOS or we have a prompt, it's supported (installable)
        setIsSupported(ios || !!deferredPrompt);

        // Listen for event just in case it fires later
        const handler = (e: any) => {
            e.preventDefault();
            deferredPrompt = e;
            setPrompt(e);
            setIsSupported(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = async () => {
        if (prompt) {
            prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === 'accepted') {
                setPrompt(null);
                deferredPrompt = null;
            }
        } else if (isIOS) {
            // For iOS, we can't programmatically install, but we can return true to indicate
            // the UI should show instructions
            return 'ios-instructions';
        }
    };

    return {
        isSupported,
        isStandalone,
        install
    };
}

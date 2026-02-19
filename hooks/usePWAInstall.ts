import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

// Use a singleton to hold the event, in case the hook initializes after the event fired
let deferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
    });
}

export function usePWAInstall() {
    const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(deferredPrompt);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if standalone
        const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            ('standalone' in window.navigator && (window.navigator as any).standalone) ||
            document.referrer.includes('android-app://');

        setIsStandalone(isInStandaloneMode);

        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        // If iOS or we have a prompt, it's supported (installable)
        setIsSupported(ios || !!deferredPrompt);

        // Listen for event just in case it fires later
        const handler = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            deferredPrompt = promptEvent;
            setPrompt(promptEvent);
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

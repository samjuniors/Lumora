import { useState, useEffect } from 'react';

export const usePWAUpdate = () => {
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    setRegistration(reg);
                    
                    // Check if there is already a waiting service worker
                    if (reg.waiting) {
                        setUpdateAvailable(true);
                    }

                    // Listen for new service workers
                    reg.onupdatefound = () => {
                        const newSW = reg.installing;
                        if (newSW) {
                            newSW.onstatechange = () => {
                                if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                                    setUpdateAvailable(true);
                                }
                            };
                        }
                    };
                }
            });

            // Listen for controlling service worker change
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });
        }
    }, []);

    const updateApp = () => {
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            // Fallback reload
            window.location.reload();
        }
    };

    return { updateAvailable, updateApp };
};

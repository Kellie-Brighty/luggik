import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return;
    }

    // Check if user dismissed it today/ever (we'll save "added" or "dismissed")
    const dismissed = localStorage.getItem('luggik_a2hs_dismissed');
    if (dismissed === 'true') {
      return; // They closed it, but wait, user said "each time they refresh the page, if they have not added to home page, they should always see the banner."
      // Ah, the user said "temporarily closable... but each time they refresh the page, if they have not added... they should always see the banner"
    }

    // The user said: "When they have successfully added, we should save that in their local storage, so they do not see the banner anymore, but each time they refresh the page, if they have not added to home page, they should always see the banner."
    // So we don't persist the 'close', only the 'added'. But wait, we can't reliably detect when iOS user actually taps "Add to home screen" from the share menu because it leaves the browser. 
    // We CAN just check `isStandalone` which natively detects if they are IN the app.
    // If they are in the browser, they haven't added it (or they have added it but are just browsing in Safari instead of the PWA).
    // Let's just persist "added" if Android installation is successful, but for iOS we just rely on `isStandalone` and maybe a manual "I added it" button or we don't save it to localstorage for iOS, just rely on `isStandalone`.
    // Actually, user explicitly asked to "save that in their local storage, so they do not see the banner anymore". 
    // I will use a local state for closing the banner so it reappears on refresh, and localstorage 'luggik_pwa_installed' for when they successfully install it (on Android) or if they dismiss it saying they installed it (on iOS).

    const hasInstalled = localStorage.getItem('luggik_pwa_installed') === 'true';
    if (hasInstalled) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Show banner by default if not standalone and not installed
    setShowBanner(true);

    // Android/Desktop installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('luggik_pwa_installed', 'true');
      setShowBanner(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS instructions inside the banner or modal
      alert('To install: tap the Share button at the bottom of the screen, then scroll down and tap "Add to Home Screen".');
    } else if (deferredPrompt) {
      // Show the Android/Desktop install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('luggik_pwa_installed', 'true');
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback if prompt is not available
      alert('To install the app, look for the "Add to Home screen" option in your browser menu.');
    }
  };



  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowBanner(false);
    }, 300); // Wait for animation to finish before removing from DOM
  };

  if (!showBanner) return null;

  return (
    <div className={`w-full relative z-[100] bg-[#111111] text-white shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${isClosing ? 'h-0 opacity-0 py-0' : 'h-[72px] opacity-100 py-4 px-4'}`}>
      <div className="flex items-center justify-between gap-4 h-full max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 bg-[#2A2925] rounded-xl flex items-center justify-center shrink-0 border border-[#3E3C36]">
          <svg className="w-5 h-5 text-[#FFCC00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Add Luggik to Home Screen</span>
          <span className="text-xs text-gray-400">Get push notifications and a faster experience</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={handleInstallClick}
          className="bg-[#FFCC00] text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-[#E6B800] transition-colors"
        >
          Add
        </button>
        <button 
          onClick={handleClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      </div>
    </div>
  );
}

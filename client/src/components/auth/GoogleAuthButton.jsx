import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export function GoogleAuthButton({ onCredential, disabled = false, label = 'Continue with Google' }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;
    let cancelled = false;

    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callbackRef.current(response.credential),
        auto_select: false,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: Math.min(buttonRef.current.clientWidth || 360, 420),
      });
    };

    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);
    if (window.google?.accounts?.id) {
      renderButton();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderButton);
    } else {
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderButton);
      script.addEventListener('error', () => toast.error('Google sign-in could not be loaded.'));
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      existingScript?.removeEventListener('load', renderButton);
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => toast.error('Google sign-in is not configured yet. Set VITE_GOOGLE_CLIENT_ID to enable it.')}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <GoogleMark /> {label}
      </button>
    );
  }

  return <div className={`min-h-12 w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`} ref={buttonRef} aria-label={label} />;
}

function GoogleMark() {
  return <span aria-hidden="true" className="font-bold text-lg leading-none"><span className="text-[#4285F4]">G</span></span>;
}

export default GoogleAuthButton;

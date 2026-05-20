import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';

// Global fetch interceptor to inject Authorization headers automatically
const originalFetch = window.fetch;
Object.defineProperty(window, 'fetch', {
  value: async function (input: RequestInfo | URL, init?: RequestInit) {
    const userId = localStorage.getItem('lumora_user_id') || (window as any).__LUMORA_USER_ID__;
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = (input as any).url || '';
    }

    const isApi = url.startsWith('/api/') || url.includes('/api/');
    if (isApi) {
      init = init || {};
      const headers = new Headers(init.headers || {});
      
      if (userId) {
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${userId}`);
        }
        if (!headers.has('x-user-id')) {
          headers.set('x-user-id', userId);
        }
      }
      
      headers.set('x-lumora-request', 'true');
      init.headers = headers;
    }
    return originalFetch.call(this, input, init);
  },
  writable: true,
  configurable: true
});

// Import your Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled = !!PUBLISHABLE_KEY && 
                       PUBLISHABLE_KEY.trim() !== '' && 
                       PUBLISHABLE_KEY !== 'your_clerk_publishable_key_here' && 
                       (PUBLISHABLE_KEY.startsWith('pk_test_') || PUBLISHABLE_KEY.startsWith('pk_live_'));

import './index.css';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main p-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h2 className="text-xl font-bold text-white">Something went wrong</h2>
          <p className="text-text-secondary max-w-sm">An unexpected error occurred. Please refresh the page or try again later.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-brand-gold text-bg-main font-bold rounded-xl mt-4"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const appContent = (
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(
  isClerkEnabled ? (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY!} 
      afterSignOutUrl="/"
      clerkJSUrl="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
    >
      {appContent}
    </ClerkProvider>
  ) : (
    appContent
  )
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.error('SW failed:', err));
  });
}


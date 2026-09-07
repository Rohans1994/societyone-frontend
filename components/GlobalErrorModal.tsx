import React, { useEffect, useState } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { onSessionExpired, onApiError } from '../authEvents';

type ErrorState =
  | { kind: 'session-expired' }
  | { kind: 'generic'; message: string }
  | null;

// Root-level modal (mounted once in index.tsx, alongside GlobalLoader) that
// reacts to the session-expired / generic-backend-error events fired from
// apiClient.ts and supabaseClient.ts. Rendered independently of App.tsx's
// own currentUser-based view switching, so it stays visible even as the app
// redirects to the login screen underneath it.
export const GlobalErrorModal: React.FC = () => {
  const [error, setError] = useState<ErrorState>(null);

  useEffect(() => {
    const unsubExpired = onSessionExpired(() => setError({ kind: 'session-expired' }));
    const unsubGeneric = onApiError((message) => setError({ kind: 'generic', message }));
    return () => {
      unsubExpired();
      unsubGeneric();
    };
  }, []);

  if (!error) return null;

  const isSessionExpired = error.kind === 'session-expired';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            isSessionExpired ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
          }`}
        >
          {isSessionExpired ? <LogOut className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {isSessionExpired ? 'Session Expired' : 'Something Went Wrong'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {isSessionExpired
              ? 'Your session has expired or is no longer valid. Please sign in again to continue.'
              : error.message}
          </p>
        </div>
        <button
          onClick={() => setError(null)}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl text-sm transition"
        >
          {isSessionExpired ? 'Go to Sign In' : 'OK'}
        </button>
      </div>
    </div>
  );
};

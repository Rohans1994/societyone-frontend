import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useApiLoading } from '../hooks/useApiLoading';

// Full-screen blocking overlay shown whenever one or more backend API calls
// are in flight (see apiClient.ts, which tracks every /api/... fetch made
// through the app's patched global fetch). Rendered once at the app root
// (index.tsx) so it sits above every screen and modal.
//
// Because the overlay itself intercepts clicks (it isn't pointer-events-none),
// it also naturally prevents a user from double-clicking a button — or
// clicking anything else — while waiting for a response.
export const GlobalLoader: React.FC = () => {
  const isLoading = useApiLoading();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Small delay avoids an annoying flash for near-instant requests.
      const timer = setTimeout(() => setVisible(true), 150);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 flex items-center gap-3 border border-gray-100">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin shrink-0" />
        <span className="text-sm font-semibold text-gray-700">Please wait...</span>
      </div>
    </div>
  );
};

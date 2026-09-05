import { useEffect, useState } from 'react';

// Files uploaded via /api/upload (e.g. facility payment QR codes) are served
// back from our own backend at /api/storage/:bucket/:filename, which
// requires an `Authorization: Bearer <token>` header (see
// societyone-backend/src/middleware/auth.ts). A plain <img src="..."> tag
// has no way to attach that header — the browser's request comes back 401
// and the image silently fails to load.
//
// JS fetch() calls don't have this problem because apiClient.ts patches the
// global fetch to auto-attach the token for any /api/... URL. This hook
// routes the same URL through that patched fetch and hands back a local
// blob URL that <img src> can use directly.
export function useAuthedImageUrl(url?: string | null): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    // External/public URLs (e.g. preset Unsplash photos, direct Supabase
    // public URLs) don't need this — only our own backend-proxied
    // /api/storage/... URLs require auth.
    if (!url || !url.startsWith('/api/')) {
      setBlobUrl(url || null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load image (${res.status})`);
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return blobUrl;
}

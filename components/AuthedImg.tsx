import React from 'react';
import { useAuthedImageUrl } from '../hooks/useAuthedImageUrl';

interface AuthedImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
}

// Drop-in replacement for <img src={...}> whenever the src might be one of
// our own backend-proxied /api/storage/... URLs (e.g. an uploaded avatar or
// facility QR code) — those require an Authorization header that a plain
// <img> tag has no way to send, so they'd otherwise fail to load silently.
// Public URLs (Unsplash presets, ui-avatars.com defaults, etc.) pass through
// unchanged. Exists as its own component (rather than calling the hook
// inline) so it can be used inside list/map rendering, where hooks can't be
// called directly.
export const AuthedImg: React.FC<AuthedImgProps> = ({ src, ...rest }) => {
  const resolvedSrc = useAuthedImageUrl(src);
  return <img src={resolvedSrc || undefined} {...rest} />;
};

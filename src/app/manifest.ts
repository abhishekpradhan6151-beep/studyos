import type { MetadataRoute } from 'next';

/** Add to Home Screen support. This app still requires a connection to Supabase. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudyOS — A calmer way to learn',
    short_name: 'StudyOS',
    description: 'A private place for studying, planning, notes and daily progress.',
    id: '/dashboard',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f5f8',
    theme_color: '#5b5bd6',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}

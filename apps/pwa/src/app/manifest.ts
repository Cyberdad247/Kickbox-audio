import type { MetadataRoute } from 'next';

// PWA manifest — installable "Sovereign Universal Dashboard".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sovereign Universal Dashboard',
    short_name: 'Sovereign',
    description: 'Sovereign Executive Intelligence — KickBox Audio',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#050507',
    theme_color: '#050507',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}

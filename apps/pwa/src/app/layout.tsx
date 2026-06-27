import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { KoARealmProvider } from '../context/KoARealmProvider';
import '../styles/globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kickbox-audio.vercel.app';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Sovereign',
  title: {
    default: 'Sovereign Universal Dashboard',
    template: '%s · Sovereign',
  },
  description: 'Sovereign Executive Intelligence — KickBox Audio',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sovereign',
  },
  openGraph: {
    type: 'website',
    siteName: 'Sovereign',
    title: 'Sovereign Universal Dashboard',
    description: 'Sovereign Executive Intelligence — KickBox Audio',
    url: SITE_URL,
  },
  // Private executive dashboard — keep it out of search indexes.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#050507',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body>
        <KoARealmProvider>{children}</KoARealmProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { BifrostProvider } from '../context/BifrostContext';
import '../styles/globals.css';

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
  title: 'Sovereign Universal Dashboard',
  description: 'Sovereign Universal Ecosystem Dashboard — KickBox Audio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body>
        <BifrostProvider>{children}</BifrostProvider>
      </body>
    </html>
  );
}

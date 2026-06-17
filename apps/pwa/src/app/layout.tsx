import type { Metadata } from 'next';
import { BifrostProvider } from '../context/BifrostContext';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Sovereign Universal Dashboard',
  description: 'Sovereign Universal Ecosystem Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BifrostProvider>{children}</BifrostProvider>
      </body>
    </html>
  );
}

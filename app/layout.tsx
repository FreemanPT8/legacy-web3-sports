import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';

// Antes usávamos Inter de next/font/google, que agora está removido
// Mantemos só um objeto com className vazio para não rebentar o JSX
const inter = { className: '' };

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const defaultOgImage =
  process.env.NEXT_PUBLIC_OG_IMAGE || `${appUrl}/favicon.ico`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'LEGACY - Gamified Web3 Education Platform',
    template: '%s | LEGACY',
  },
  description:
    'Master Web3 on Apertum Blockchain. Earn XP, unlock content, and lead the leaderboard.',
  openGraph: {
    title: 'LEGACY - Gamified Web3 Education Platform',
    description:
      'Master Web3 on Apertum Blockchain. Earn XP, unlock content, and lead the leaderboard.',
    url: appUrl,
    siteName: 'LEGACY',
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: 'LEGACY',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LEGACY - Gamified Web3 Education Platform',
    description:
      'Master Web3 on Apertum Blockchain. Earn XP, unlock content, and lead the leaderboard.',
    images: [defaultOgImage],
  },
  alternates: {
    canonical: appUrl,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              {children}
              <Toaster />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

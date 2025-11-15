import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';

// Antes usávamos Inter de next/font/google, que agora está removido
// Mantemos só um objeto com className vazio para não rebentar o JSX
const inter = { className: '' };

export const metadata: Metadata = {
  title: 'LEGACY - Gamified Web3 Education Platform',
  description:
    'Master Web3 on Apertum Blockchain. Earn XP, unlock content, and lead the leaderboard.',
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

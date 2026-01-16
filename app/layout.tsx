import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import GlobalOnboardingGate from '@/components/onboarding/GlobalOnboardingGate';
import Script from 'next/script';

// Antes usávamos Inter de next/font/google, que agora está removido
// Mantemos só um objeto com className vazio para não rebentar o JSX
const inter = { className: '' };

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const defaultOgImage =
  process.env.NEXT_PUBLIC_OG_IMAGE || `${appUrl}/favicon.ico`;
const gaId = process.env.NEXT_PUBLIC_GA_ID;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'LEGACY - Gamified Web3 Academy Platform',
    template: '%s | LEGACY',
  },
  description:
    'Master Web3 on Apertum Blockchain. Earn XP, unlock content, and lead the leaderboard.',
  openGraph: {
    title: 'LEGACY - Gamified Web3 Academy Platform',
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
    title: 'LEGACY - Gamified Web3 Academy Platform',
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
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* Google Analytics (carregado apenas se tiver ID) */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}

        {/* Meta Pixel (apenas se tiver ID) */}
        {metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}

        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <GlobalOnboardingGate />
              {children}
              <Toaster />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

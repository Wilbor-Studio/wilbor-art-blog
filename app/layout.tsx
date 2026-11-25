import {
  BASE_URL,
  DEFAULT_THEME
} from '@/app/config';
import { fetchSiteConfig } from '@/lib/hive/site-content';
import AdminBar from '@/admin/AdminBar';
import HiveAuthProvider from '@/admin/HiveAuthProvider';
import Footer from '@/app/Footer';
import ToasterWithThemes from '@/toast/ToasterWithThemes';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ThemeProvider, useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next/types';
import '../tailwind.css';
import '../styles/markdown-contact.css';
import '../src/styles/exhibitions.css';
import '../src/styles/partners.css';
import '../src/styles/admin.css';
import ConstructionBanner from './components/ConstructionBanner';
import JsonLd from './components/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  // Título e descrição saem das configurações que o artista edita pelo
  // painel; o config.ts continua sendo o padrão quando não há nada salvo.
  const { seo } = await fetchSiteConfig();
  const SITE_TITLE = seo.title;
  const SITE_DESCRIPTION = seo.description;

  return {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  ...BASE_URL && { metadataBase: new URL(BASE_URL) },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: 'website',
    locale: 'pt_BR',
    url: BASE_URL,
    siteName: SITE_TITLE,
    images: [
      {
        url: `${BASE_URL}/wilborPhotos/bannerWilbor.png`,
        width: 1200,
        height: 630,
        alt: 'Wilbor Art'
      }
    ]
  },
  twitter: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    card: 'summary_large_image',
    images: [`${BASE_URL}/wilborPhotos/bannerWilbor.png`],
    creator: '@wilborart'
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  keywords: ['Wilbor Art', 'Arte', 'Fotografia', 'Design', 'Projetos Artísticos', 'Portfolio'],
  authors: [{ name: 'Wilbor Art' }],
  creator: 'Wilbor Art',
  publisher: 'Wilbor Art',
  icons: [{
    rel: 'icon',
    url: '/favicons/FAVCOM_WILBOR.png',
    type: 'image/png',
    sizes: '32x32'
  }, {
    rel: 'apple-touch-icon',
    url: '/favicons/favicon.png',
    sizes: '180x180'
  }],
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/png" href="/favicons/FAVCOM_WILBOR.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/favicon.png" />
      </head>
      <body className="bg-main">
          <ThemeProvider attribute="class" defaultTheme={DEFAULT_THEME}>
            <HiveAuthProvider>
              {/* A página ocupa pelo menos a altura da tela (dvh: no iPhone e
                  no iPad acompanha a barra do Safari). Com tudo fechado, a
                  seção Contato estica até o fim, sem sobrar faixa vazia. */}
              <div className="flex min-h-dvh flex-col">
              <ConstructionBanner />
              <main className="flex flex-1 flex-col">
                <div className="flex flex-col items-center">
                </div>
                {/* <Nav siteDomainOrTitle="" /> */}
                <div >
                  {children}
                </div>
                <Footer />
              </main>
              </div>
              {/* <CommandK /> */}
              <AdminBar />
            </HiveAuthProvider>
            <Analytics debug={false} />
            <SpeedInsights debug={false} />
            <ToasterWithThemes />
            <JsonLd type="website" />
          </ThemeProvider>
      </body>
    </html>
  );
}

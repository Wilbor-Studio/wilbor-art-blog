import {
  BASE_URL,
  DEFAULT_THEME,
  SITE_DESCRIPTION,
  SITE_TITLE
} from '@/app/config';
import Footer from '@/app/Footer';
import ContactContent from '@/components/ContactContent';
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
import ConstructionBanner from './components/ConstructionBanner';
import JsonLd from './components/JsonLd';

export const metadata: Metadata = {
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
              <ConstructionBanner />
              <main >
                <div className="flex flex-col items-center">
                </div>
                {/* <Nav siteDomainOrTitle="" /> */}
                <div >
                  {children}
                </div>
                <section id="contact">
                  <ContactContent />
                </section>
                <Footer />
              </main>
              {/* <CommandK /> */}
            <Analytics debug={false} />
            <SpeedInsights debug={false} />
            <ToasterWithThemes />
            <JsonLd type="website" />
          </ThemeProvider>
      </body>
    </html>
  );
}

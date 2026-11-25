"use client";

import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SignatureLight from '../../public/wilborPhotos/Assinatura Clara.png';
import SignatureDark from '../../public/wilborPhotos/Assinatura Escura.png';
import HeaderBgLight from '../../public/wilborPhotos/Fundo header claro 2.png';
import HeaderBgDark from '../../public/wilborPhotos/Fundo header escuro 2.png';

export default function BannerWilborSwitcher({
  forceWhiteLogo = false,
  onClick,
  expanded,
}: {
  forceWhiteLogo?: boolean
  /** Substitui a ida para /projects (ex.: abrir e fechar a grade). */
  onClick?: () => void
  /** Com onClick, estado da grade que ele controla (aria-expanded). */
  expanded?: boolean
} = {}) {
  const router = useRouter();
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const handleGoProjects = () => {
    // Sempre volta para a listagem geral de projetos, removendo qualquer filtro/tag
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wilbor:close-expanded-project'));
    }

    router.push('/projects');
    router.refresh();
  };

  // Define se o header deve seguir o modo escuro
  let isDarkHeader = false;
  if (mounted) {
    const resolvedTheme = theme === 'system' ? systemTheme : theme;
    isDarkHeader = resolvedTheme === 'dark';
  }

  const backgroundSrc = isDarkHeader ? HeaderBgDark : HeaderBgLight;
  const signatureSrc = isDarkHeader ? SignatureLight : SignatureDark;

  return (
    <div
      onClick={onClick ?? handleGoProjects}
      {...(onClick && {
        role: 'button',
        tabIndex: 0,
        'aria-expanded': expanded,
        'aria-controls': 'projects-grid',
        'aria-label': expanded ? 'Recolher projetos' : 'Mostrar projetos',
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
        },
      })}
      className={`relative ${forceWhiteLogo ? 'h-full w-full' : 'h-20 sm:h-32 w-full max-w-[460px]'} cursor-pointer hover:opacity-90 transition-opacity`}
      style={{
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail do grafite como decoração de fundo - alinhada à direita */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={backgroundSrc}
          alt=""
          fill
          priority
          className="object-contain object-right pointer-events-none select-none opacity-60"
        />
      </div>

      {/* Assinatura / logo por cima - continua à esquerda */}
      <div className={`relative h-full flex items-center ${forceWhiteLogo ? 'pl-3 sm:pl-5' : 'pl-0 sm:pl-1'}`}>
        <Image
          src={signatureSrc}
          alt="Wilbor Studio logo"
          className={`${forceWhiteLogo ? 'h-16 sm:h-20' : 'h-12 sm:h-24'} w-auto object-contain`}
          priority
        />
      </div>
    </div>
  );
}

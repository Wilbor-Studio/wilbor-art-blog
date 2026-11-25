'use client';

import ViewSwitcher, { SwitcherSelection } from '@/app/ViewSwitcher';
import About from '@/app/about/page';
import { PATH_GRID } from '@/app/paths';
import Collapse from '@/components/Collapse';
import useFillViewportBands from '@/components/useFillViewportBands';
import { readTagsFromParams, writeTagsToUrl } from '@/utility/tag-filter';
import ExhibitionsContent from '@/components/ExhibitionsContent';
import PartnersContent from '@/components/PartnersContent';
import SoundContent from '@/components/SoundContent';
import ScrollReveal from '@/components/ScrollReveal';
import ClosedBandsShimmer from '@/components/ClosedBandsShimmer';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useState } from 'react';
import ProjectsClient from './ProjectsClient';

const MemoizedProjectsClient = memo(ProjectsClient);
const MemoizedAbout = memo(About);
const MemoizedExhibitionsContent = memo(ExhibitionsContent);
const MemoizedPartnersContent = memo(PartnersContent);

export default function ProjectsOnePageClient({ projectsProps }: { projectsProps: any }) {
  const [activeSection, setActiveSection] = useState<SwitcherSelection>('projects');
  // Tags marcadas no filtro (várias; ver utility/tag-filter).
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // A grade começa aberta (é a vitrine do site) e pode ser recolhida pelo
  // toque na faixa do header. Abre sozinha quando a pessoa escolhe uma tag,
  // chega por link de projeto ou toca em "PROJETOS" no menu.
  const [projectsOpen, setProjectsOpen] = useState(true);
  // Com tudo fechado, as faixas das seções dividem a altura da tela.
  useFillViewportBands();
  const toggleProjects = useCallback(() => {
    setProjectsOpen(open => !open);
    // Volta ao topo para a pessoa ver o resultado do toque (recolher no
    // meio da grade faria o conteúdo pular).
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Always reset scroll and URL to /projects (preservando query params como project e tag)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    if (window.location.pathname === PATH_GRID) {
      // Preservar os parâmetros de query string (project, tag, etc)
      const url = new URL(window.location.href);
      const queryString = url.search;
      const newUrl = PATH_GRID + queryString;
      window.history.replaceState(null, '', newUrl);
      // Só fazer scroll para o topo se não houver parâmetro project na URL
      if (!url.searchParams.has('project')) {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  // Sync tag with URL on mount and update
  useEffect(() => {
    const tagsFromUrl = readTagsFromParams(searchParams);
    setSelectedTags(tagsFromUrl);
    if (tagsFromUrl.length > 0 || searchParams.get('project')) setProjectsOpen(true);
  }, [searchParams]);

  const handleTagsChange = useCallback((tags: string[]) => {
    const url = new URL(window.location.href);
    // O parâmetro project, se houver, fica: só as tags mudam.
    writeTagsToUrl(url, tags);
    window.history.pushState({}, '', url.toString());
    setSelectedTags(tags);
    if (tags.length > 0) setProjectsOpen(true);
  }, []);

  // Handler para navegação por hash (scroll suave até a seção)
  const handleMenuItemClick = useCallback((href: string) => {
    if (typeof window === 'undefined') return;
    
    const url = new URL(href, window.location.origin);
    let targetId: string | null = null;
    
    if (url.hash) {
      targetId = url.hash.substring(1); // Remove o #
    } else if (url.pathname === PATH_GRID) {
      // Se for apenas /projects sem hash, vai para a seção projects
      targetId = 'projects';
    }
    
    if (targetId) {
      if (targetId === 'projects') {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('tag');
        cleanUrl.searchParams.delete('project');
        cleanUrl.hash = '';
        window.history.replaceState(null, '', PATH_GRID + cleanUrl.search);

        setSelectedTags([]);
        setActiveSection('projects');
        setProjectsOpen(true);
        window.dispatchEvent(new CustomEvent('wilbor:close-expanded-project'));
        router.replace(PATH_GRID + cleanUrl.search);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        // O menu funciona como sanfona: a seção tocada abre e as outras que
        // estiverem abertas fecham (a grade de projetos fica de fora; ela é
        // do header). Fechar uma seção acima faz a tocada subir durante a
        // animação, então o destino da rolagem já desconta o conteúdo que
        // vai recolher acima dela.
        const targetTop = targetElement.getBoundingClientRect().top;
        let collapsingAbove = 0;
        document
          .querySelectorAll<HTMLButtonElement>('section[id] button[data-band-row][aria-expanded="true"]')
          .forEach(row => {
            if (targetElement.contains(row)) return;
            const content = document.getElementById(row.getAttribute('aria-controls') ?? '');
            const box = content?.getBoundingClientRect();
            if (box && box.top < targetTop) collapsingAbove += box.height;
            row.click();
          });

        // Abre a tocada pela primeira faixa de título dela (a mesma que a
        // pessoa tocaria), se estiver fechada. Em Exposições, abre
        // Exposições e deixa Publicações como está.
        const titleRow = targetElement.querySelector<HTMLButtonElement>('button[data-band-row]');
        if (titleRow?.getAttribute('aria-expanded') === 'false') titleRow.click();

        // Altura real do header (ele cresce com as faixas da página).
        const headerHeight = document.querySelector('header')?.getBoundingClientRect().height
          ?? (window.innerWidth >= 768 ? 90 : 64);
        const yOffset = targetTop + window.pageYOffset - collapsingAbove - headerHeight;
        window.scrollTo({ top: yOffset, behavior: 'smooth' });
        // Acabadas a rolagem e a animação, confere: imagens da grade
        // carregando acima mudam a altura da página no caminho. Se a seção
        // não parou embaixo do header e ainda dá para rolar, ajusta. (No fim
        // da página não dá: a seção para onde a rolagem acaba.)
        window.setTimeout(() => {
          const drift = targetElement.getBoundingClientRect().top - headerHeight;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const canMove = drift > 0 ? window.scrollY < maxScroll - 1 : window.scrollY > 0;
          if (Math.abs(drift) > 4 && canMove) {
            window.scrollTo({ top: window.scrollY + drift, behavior: 'smooth' });
          }
        }, 900);
        // Atualiza a URL sem recarregar a página, preservando query params
        const url = new URL(window.location.href);
        const queryString = url.search;
        const newHref = targetId === 'projects' 
          ? PATH_GRID + queryString 
          : `${PATH_GRID}${queryString}#${targetId}`;
        window.history.pushState(null, '', newHref);
      }
    } else {
      // Fallback: se não encontrar a seção, recarrega a página
      window.location.href = href;
    }
  }, [router]);

  // Atualiza rota /projects#secao conforme o usuário rola (scroll spy baseado na seção mais próxima do centro)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // A lista é lida a cada atualização: "Bota o som" só entra na página
    // depois que o post chega do Hive, e o contato é o <footer id="contact">.
    const getSections = () => Array.from(
      document.querySelectorAll<HTMLElement>('section[id], footer[id]'),
    );

    let ticking = false;

    const updateActiveSection = () => {
      ticking = false;
      const sections = getSections();
      const viewportCenter = window.innerHeight / 2;
      const viewportTop = 0;
      const viewportBottom = window.innerHeight;

      let closestId: SwitcherSelection = 'projects';
      let minDistance = Infinity;

      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        // Só considera seções que estão visíveis na viewport (pelo menos parcialmente)
        const isVisible = rect.bottom > viewportTop && rect.top < viewportBottom;
        
        if (isVisible) {
          const sectionCenter = rect.top + rect.height / 2;
          const distance = Math.abs(sectionCenter - viewportCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestId = sec.id as SwitcherSelection;
          }
        }
      });

      // Se nenhuma seção visível foi encontrada, volta para projects
      if (minDistance === Infinity) {
        closestId = 'projects';
      }

      setActiveSection(closestId);

      // Preservar query params ao atualizar a URL
      const url = new URL(window.location.href);
      const queryString = url.search;
      const targetUrl =
        closestId === 'projects' 
          ? PATH_GRID + queryString 
          : `${PATH_GRID}${queryString}#${closestId}`;
      const currentUrl = window.location.pathname + window.location.search + window.location.hash;

      if (currentUrl !== targetUrl) {
        window.history.replaceState(null, '', targetUrl);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateActiveSection);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Atualiza logo no início para corrigir URL se vier com hash antigo
    updateActiveSection();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      <ViewSwitcher
        currentSelection={activeSection}
        isLandingPage={true}
        drawerTagsProps={{
          tags: projectsProps.tags.map((t: any) => t.tag),
          tagCounts: Object.fromEntries(projectsProps.tags.map((t: any) => [t.tag, t.count])),
          selectedTags,
          setSelectedTags: handleTagsChange,
        }}
        onMenuItemClick={handleMenuItemClick}
        projectsOpen={projectsOpen}
        onToggleProjects={toggleProjects}
      />
      <ClosedBandsShimmer gridOpen={projectsOpen} />

      <div className="flex flex-col w-full">
        {/* PROJETOS: a grade de cards. Recolhe tocando na faixa do header,
            sem título na página. Fechada, só esconde (não desmonta): projeto
            aberto e filtro continuam onde estavam ao reabrir. */}
        <section
          id="projects"
          className="w-full bg-white dark:bg-neutral-950"
        >
          <Collapse id="projects-grid" open={projectsOpen} keepMounted className="min-h-screen pt-6 md:pt-8">
            <MemoizedProjectsClient
              {...projectsProps}
              hideSwitcher={true}
              externalSelectedTags={selectedTags}
              onTagsChange={handleTagsChange}
            />
          </Collapse>
        </section>

        {/* ABOUT COMO SEÇÃO DA LANDING */}
        <section id="about" className="w-full bg-[var(--tone-about)] border-t border-neutral-200/40 dark:border-neutral-800/70">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal forceMount>
              <MemoizedAbout />
            </ScrollReveal>
          </div>
        </section>

        {/* EXHIBITIONS COMO SEÇÃO DA LANDING */}
        <section id="exhibitions" className="w-full overflow-hidden bg-[var(--tone-exhibitions)] border-t border-neutral-200/40 dark:border-neutral-800/70">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal forceMount>
              <MemoizedExhibitionsContent />
            </ScrollReveal>
          </div>
        </section>

        {/* BOTA O SOM: só aparece depois que o artista publica a seção */}
        <SoundContent />

        {/* PARTNERS COMO SEÇÃO DA LANDING */}
        <section id="partners" className="w-full bg-[var(--tone-partners)] border-t border-neutral-200/40 dark:border-neutral-800/70">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal forceMount>
              <MemoizedPartnersContent />
            </ScrollReveal>
          </div>
        </section>
      </div>
    </>
  );
}

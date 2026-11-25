'use client';

import ViewSwitcher, { SwitcherSelection } from '@/app/ViewSwitcher';
import About from '@/app/about/page';
import { PATH_GRID } from '@/app/paths';
import Collapse from '@/components/Collapse';
import ExhibitionsContent from '@/components/ExhibitionsContent';
import PartnersContent from '@/components/PartnersContent';
import SoundContent from '@/components/SoundContent';
import ScrollReveal from '@/components/ScrollReveal';
import { useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useState } from 'react';
import ProjectsClient from './ProjectsClient';

const MemoizedProjectsClient = memo(ProjectsClient);
const MemoizedAbout = memo(About);
const MemoizedExhibitionsContent = memo(ExhibitionsContent);
const MemoizedPartnersContent = memo(PartnersContent);

export default function ProjectsOnePageClient({ projectsProps }: { projectsProps: any }) {
  const [activeSection, setActiveSection] = useState<SwitcherSelection>('projects');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  // A grade começa aberta (é a vitrine do site) e pode ser recolhida pelo
  // toque na faixa do header. Abre sozinha quando a pessoa escolhe uma tag,
  // chega por link de projeto ou toca em "PROJETOS" no menu.
  const [projectsOpen, setProjectsOpen] = useState(true);
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
    const tagFromUrl = searchParams.get('tag');
    if (tagFromUrl) {
      setSelectedTag(tagFromUrl);
    } else {
      setSelectedTag(null);
    }
    if (tagFromUrl || searchParams.get('project')) setProjectsOpen(true);
  }, [searchParams]);

  const handleTagChange = useCallback((tag: string | null) => {
    const url = new URL(window.location.href);
    if (tag) {
      url.searchParams.set('tag', tag);
    } else {
      url.searchParams.delete('tag');
    }
    // Preservar o parâmetro project se existir
    // (não remover, apenas atualizar a tag)
    window.history.pushState({}, '', url.toString());
    setSelectedTag(tag);
    if (tag) setProjectsOpen(true);
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

        setSelectedTag(null);
        setActiveSection('projects');
        setProjectsOpen(true);
        window.dispatchEvent(new CustomEvent('wilbor:close-expanded-project'));
        router.replace(PATH_GRID + cleanUrl.search);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // "CONTATO" no menu abre a caixa de mensagem do rodapé.
      if (targetId === 'contact') window.dispatchEvent(new Event('wilbor:open-contact'));

      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        // Altura do header: 90px desktop, 64px mobile
        const headerHeight = window.innerWidth >= 768 ? 90 : 64;
        const yOffset = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top: yOffset, behavior: 'smooth' });
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
  }, [router, setSelectedTag]);

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
          selectedTag,
          setSelectedTag: handleTagChange,
        }}
        onMenuItemClick={handleMenuItemClick}
        projectsOpen={projectsOpen}
        onToggleProjects={toggleProjects}
      />

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
              externalSelectedTag={selectedTag}
              onTagChange={handleTagChange}
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

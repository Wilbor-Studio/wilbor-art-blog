import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Precisa existir antes dos módulos serem avaliados: SITE_HIVE_USERNAME é
// uma const de topo de módulo.
const OWNER = 'wilbor.art';
process.env.NEXT_PUBLIC_HIVE_USERNAME = OWNER;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), replace: jest.fn(), push: jest.fn() }),
}));

// Server action: não roda em jsdom
jest.mock('../lib/hive/server-functions', () => ({
  hiveServerLoginWithPassword: jest.fn(),
  sendHiveOperation: jest.fn(),
}));

// WebGL não existe em jsdom
jest.mock('../src/admin/SplashCursor', () => ({
  __esModule: true,
  default: () => null,
}));

// react-markdown é ESM puro e o jest deste projeto não transforma node_modules
jest.mock('../src/components/Markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const AdminBar = require('../src/admin/AdminBar').default;
const EditPostButton = require('../src/admin/EditPostButton').default;
const authModule = require('../src/admin/HiveAuthProvider');
const HiveAuthProvider = authModule.default;

const POST = {
  title: 'Projeto Teste',
  body: 'Corpo do post\n\n![image](https://ipfs.skatehive.app/ipfs/abc)',
  author: OWNER,
  permlink: 'projeto-teste-20260101',
  json_metadata: JSON.stringify({
    tags: ['arte', 'skate'],
    image: ['https://ipfs.skatehive.app/ipfs/abc'],
    thumbnail: 'https://ipfs.skatehive.app/ipfs/abc',
  }),
};

function renderAdmin() {
  return render(
    <HiveAuthProvider>
      <AdminBar />
      <EditPostButton post={POST} />
    </HiveAuthProvider>,
  );
}

function setSession(username: string) {
  localStorage.setItem('wilbor_admin_logged_in', 'true');
  localStorage.setItem('wilbor_admin_username', username);
  localStorage.setItem('wilbor_admin_method', 'keychain');
}

describe('área do artista', () => {
  beforeEach(() => localStorage.clear());

  it('reconhece a conta dona do site', () => {
    expect(authModule.SITE_HIVE_USERNAME).toBe(OWNER);
  });

  it('não mostra nada de admin para visitante anônimo', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /novo projeto/i })).not.toBeInTheDocument();
    });
    expect(screen.queryByText('editar')).not.toBeInTheDocument();
  });

  it('não mostra nada de admin para outra conta Hive', async () => {
    setSession('outro-usuario');
    renderAdmin();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /novo projeto/i })).not.toBeInTheDocument();
    });
    expect(screen.queryByText('editar')).not.toBeInTheDocument();
  });

  it('mostra a barra e o botão editar para a conta dona', async () => {
    setSession(OWNER);
    renderAdmin();
    expect(await screen.findByRole('button', { name: /novo projeto/i })).toBeInTheDocument();
    expect(await screen.findByText('editar')).toBeInTheDocument();
    expect(screen.getByText(`@${OWNER}`)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Controles do artista' }))
      .toBeInTheDocument();
  });

  it('abre o editor preenchido com o conteúdo atual do post', async () => {
    setSession(OWNER);
    renderAdmin();

    fireEvent.click(await screen.findByText('editar'));

    expect(await screen.findByRole('dialog', { name: /editar projeto/i }))
      .toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Projeto Teste');
    expect(screen.getByPlaceholderText(/Escreva em Markdown/))
      .toHaveValue(POST.body);
    expect(screen.getByText('arte')).toBeInTheDocument();
    expect(screen.getByText('skate')).toBeInTheDocument();
    expect(screen.getByText('Salvar')).toBeInTheDocument();
    expect(screen.queryByText('Publicar')).not.toBeInTheDocument();
  });

  it('abre o editor de criação pela barra', async () => {
    setSession(OWNER);
    renderAdmin();

    fireEvent.click(await screen.findByRole('button', { name: /novo projeto/i }));

    expect(await screen.findByRole('dialog', { name: /criar projeto/i }))
      .toBeInTheDocument();
    expect(screen.getByText('Publicar')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('exige título e tag antes de publicar', async () => {
    setSession(OWNER);
    renderAdmin();

    fireEvent.click(await screen.findByRole('button', { name: /novo projeto/i }));
    fireEvent.click(screen.getByText('Publicar'));
    expect(await screen.findByText('Título obrigatório.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Meu projeto' },
    });
    fireEvent.click(screen.getByText('Publicar'));
    expect(await screen.findByText(/pelo menos 1 tag/)).toBeInTheDocument();
  });

  it('sair limpa a sessão', async () => {
    setSession(OWNER);
    renderAdmin();

    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /novo projeto/i })).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('wilbor_admin_username')).toBeNull();
  });
});

describe('menu do artista no card de projeto', () => {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const ProjectAdminMenu = require('../src/admin/ProjectAdminMenu').default;

  beforeEach(() => localStorage.clear());

  function renderCard(onCardClick: jest.Mock, isHidden = false) {
    return render(
      <HiveAuthProvider>
        <div onClick={onCardClick} className="group">
          <ProjectAdminMenu variant="card" post={POST} isHidden={isHidden} />
        </div>
      </HiveAuthProvider>,
    );
  }

  it('não aparece para visitante', async () => {
    renderCard(jest.fn());
    await waitFor(() => {
      expect(screen.queryByLabelText('Opções do projeto')).not.toBeInTheDocument();
    });
  });

  it('abre o menu e o editor sem acionar o card por baixo', async () => {
    setSession(OWNER);
    const onCardClick = jest.fn();
    renderCard(onCardClick);

    fireEvent.click(await screen.findByRole('button', { name: 'Opções do projeto' }));
    expect(await screen.findByRole('menuitem', { name: /Editar projeto/ }))
      .toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Esconder do site/ }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /Editar projeto/ }));
    const dialog = await screen.findByRole('dialog', { name: /editar projeto/i });
    fireEvent.click(dialog);
    fireEvent.click(screen.getByText('Cancelar'));

    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('projeto oculto mostra o selo e oferece trazer de volta', async () => {
    setSession(OWNER);
    renderCard(jest.fn(), true);

    expect(await screen.findByText('oculto · só você vê')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Opções do projeto' }));
    expect(await screen.findByRole('menuitem', { name: /Mostrar no site/ }))
      .toBeInTheDocument();
  });
});

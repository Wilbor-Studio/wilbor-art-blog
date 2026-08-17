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
      expect(screen.queryByText('+ novo projeto')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('editar')).not.toBeInTheDocument();
  });

  it('não mostra nada de admin para outra conta Hive', async () => {
    setSession('outro-usuario');
    renderAdmin();
    await waitFor(() => {
      expect(screen.queryByText('+ novo projeto')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('editar')).not.toBeInTheDocument();
  });

  it('mostra a barra e o botão editar para a conta dona', async () => {
    setSession(OWNER);
    renderAdmin();
    expect(await screen.findByText('+ novo projeto')).toBeInTheDocument();
    expect(await screen.findByText('editar')).toBeInTheDocument();
    expect(screen.getByText(`@${OWNER}`)).toBeInTheDocument();
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

    fireEvent.click(await screen.findByText('+ novo projeto'));

    expect(await screen.findByRole('dialog', { name: /criar projeto/i }))
      .toBeInTheDocument();
    expect(screen.getByText('Publicar')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('exige título e tag antes de publicar', async () => {
    setSession(OWNER);
    renderAdmin();

    fireEvent.click(await screen.findByText('+ novo projeto'));
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

    fireEvent.click(await screen.findByText('sair'));

    await waitFor(() => {
      expect(screen.queryByText('+ novo projeto')).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('wilbor_admin_username')).toBeNull();
  });
});

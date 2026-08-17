import { NextRequest, NextResponse } from 'next/server';

const PINATA_UPLOAD_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

// Aceita o JWT e as variáveis server-only, mantendo as NEXT_PUBLIC_ como
// fallback para funcionar com o mesmo .env que o projeto do dashboard usava.
const PINATA_API_KEY =
  process.env.PINATA_JWT ||
  process.env.PINATA_API_KEY ||
  process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET =
  process.env.PINATA_API_SECRET || process.env.NEXT_PUBLIC_PINATA_API_SECRET;

// 100 MB — limite prático para vídeos do portfólio.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function pinataHeaders(): Record<string, string> {
  const isJWT = PINATA_API_KEY!.startsWith('eyJ');

  return isJWT
    ? { 'Authorization': `Bearer ${PINATA_API_KEY}` }
    : {
      'pinata_api_key': PINATA_API_KEY!,
      'pinata_secret_api_key': PINATA_SECRET!,
    };
}

export async function POST(request: NextRequest) {
  if (!PINATA_API_KEY) {
    return NextResponse.json(
      { error: 'Credenciais do Pinata não configuradas no servidor.' },
      { status: 500 },
    );
  }

  const isJWT = PINATA_API_KEY.startsWith('eyJ');
  if (!isJWT && !PINATA_SECRET) {
    return NextResponse.json(
      { error: 'PINATA_API_SECRET ausente (obrigatório quando não se usa JWT).' },
      { status: 500 },
    );
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'Arquivo maior que o limite de 100 MB.' },
      { status: 413 },
    );
  }

  try {
    const upstreamForm = new FormData();
    upstreamForm.append('file', file, file.name);

    const response = await fetch(PINATA_UPLOAD_URL, {
      method: 'POST',
      headers: pinataHeaders(),
      body: upstreamForm,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Pinata upload failed:', response.status, detail);
      return NextResponse.json(
        { error: 'Falha ao enviar arquivo para o IPFS.' },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json({ IpfsHash: data.IpfsHash }, { status: 200 });
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar arquivo para o IPFS.' },
      { status: 500 },
    );
  }
}

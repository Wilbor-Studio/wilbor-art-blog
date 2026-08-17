'use server';

import * as dhive from '@hiveio/dhive';
import { Client } from '@hiveio/dhive';
import crypto from 'crypto';

const client = new Client('https://api.hive.blog');

interface ServerLoginResponse {
  validation: { success: boolean; message: string };
  key?: string;
  type?: dhive.KeyRole;
}

// Segredo usado para cifrar a chave de posting antes de devolvê-la ao browser.
// Prefere a variável server-only; NEXT_PUBLIC_ fica como fallback de compatibilidade.
function getCryptoSecret() {
  const secret =
    process.env.CRYPTO_SECRET || process.env.NEXT_PUBLIC_CRYPTO_SECRET || '';

  if (!secret) {
    throw new Error('CRYPTO_SECRET não está definido no ambiente');
  }

  return secret;
}

function decryptPrivateKey(encryptedPrivateKey: string): string {
  const secret = getCryptoSecret();

  try {
    const [ivHex, encryptedHex] = encryptedPrivateKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const key = crypto.scryptSync(secret, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    throw new Error('Falha ao decifrar a chave privada. Verifique o segredo ou os dados.');
  }
}

function encryptPrivateKey(privateKey: dhive.PrivateKey) {
  const secret = getCryptoSecret();

  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(privateKey.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

async function getAccountByPassword(username: string, password: string) {
  const hivePrivateKey = dhive.PrivateKey.fromLogin(username, password, 'posting');
  const hivePublicKey = hivePrivateKey.createPublic();
  const val = await client.keys.getKeyReferences([hivePublicKey.toString()]);
  const accountName = val.accounts[0][0];

  return { accountName, hivePrivateKey };
}

export async function hiveServerLoginWithPassword(
  username: string,
  privateKey: string,
): Promise<ServerLoginResponse> {
  if (!username) {
    return { validation: { success: false, message: 'Informe o usuário.' } };
  }
  if (!privateKey) {
    return { validation: { success: false, message: 'Informe a chave privada.' } };
  }

  try {
    // Primeiro tenta como uma senha master
    const { accountName, hivePrivateKey } = await getAccountByPassword(
      username,
      privateKey,
    );

    if (accountName === username) {
      return {
        validation: { success: true, message: 'Autenticado com sucesso' },
        key: encryptPrivateKey(hivePrivateKey),
        type: 'posting',
      };
    }
  } catch {
    // Se falhar, tenta como chave privada direta
    try {
      const hivePrivateKey = dhive.PrivateKey.fromString(privateKey);
      const hivePublicKey = hivePrivateKey.createPublic();
      const val = await client.keys.getKeyReferences([hivePublicKey.toString()]);
      const accountName = val.accounts[0][0];

      if (accountName === username) {
        const userData = await client.database.getAccounts([username]);
        const encryptedKey = encryptPrivateKey(hivePrivateKey);
        const userAccount = userData[0];

        // 'memo' fica de fora: não é uma autoridade com key_auths.
        const roles = ['posting', 'active', 'owner'] as const;
        for (const role of roles) {
          const keyAuths = userAccount[role].key_auths;
          for (const [publicKey] of keyAuths) {
            if (publicKey === hivePublicKey.toString()) {
              return {
                validation: { success: true, message: 'Autenticado com sucesso' },
                key: encryptedKey,
                type: role,
              };
            }
          }
        }
      }
    } catch (keyError) {
      console.error('Private key validation error:', keyError);
    }
  }

  return { validation: { success: false, message: 'Credenciais inválidas.' } };
}

export async function sendHiveOperation(
  encryptedPrivateKey: string | null,
  op: dhive.Operation[],
) {
  if (encryptedPrivateKey === null) {
    throw new Error('Chave de posting não encontrada.');
  }
  const privateKey = decryptPrivateKey(encryptedPrivateKey);

  return client.broadcast.sendOperations(op, dhive.PrivateKey.from(privateKey));
}

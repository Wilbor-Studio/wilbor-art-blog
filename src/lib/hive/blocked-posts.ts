const BLOCKED_PERMLINKS = new Set([
  'emergencia-riddim-20260429',
  'emergncia-riddim-20260429',
  // Teste do texto do "Sobre" (2025). Nunca apareceu na grade porque ela só
  // lia os 20 posts mais recentes; com todos os posts, apareceria.
  'teste-sobre-mim-20250628t033616300z',
]);

export function isBlockedPermlink(permlink?: string | null) {
  return BLOCKED_PERMLINKS.has(permlink || '');
}

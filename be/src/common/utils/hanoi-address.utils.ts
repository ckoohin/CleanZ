const HANOI_KEYWORDS = ['ha noi', 'hanoi'];

export function normalizeAddressText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .trim();
}

export function isHanoiAddress(
  fullAddress: string,
  wardDetail?: string | null,
): boolean {
  const normalizedAddress = normalizeAddressText(
    [fullAddress, wardDetail].filter(Boolean).join(' '),
  );

  return HANOI_KEYWORDS.some((keyword) => normalizedAddress.includes(keyword));
}

export function toNumber(value?: number | string | null): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

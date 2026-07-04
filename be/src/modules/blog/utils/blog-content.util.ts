const DANGEROUS_TAG_PATTERN = /<\s*\/?\s*(script|style|iframe|object|embed|link|meta)[^>]*>/gi;
const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const JAVASCRIPT_URL_PATTERN = /(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi;

export function sanitizeBlogContent(content: string): string {
  return content
    .replace(DANGEROUS_TAG_PATTERN, '')
    .replace(EVENT_HANDLER_PATTERN, '')
    .replace(JAVASCRIPT_URL_PATTERN, '$1="#"');
}

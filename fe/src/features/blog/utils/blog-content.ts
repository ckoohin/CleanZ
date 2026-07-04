const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sanitizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (/^(https?:|\/)/i.test(trimmed)) return trimmed;
  return "#";
};

const applyInlineMarkdown = (value: string) => {
  let html = escapeHtml(value);

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    const safeSrc = sanitizeUrl(String(src));
    return `<img src="${safeSrc}" alt="${escapeHtml(String(alt))}" class="my-4 max-h-[520px] w-full rounded-lg object-cover" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const safeHref = sanitizeUrl(String(href));
    return `<a href="${safeHref}" target="_blank" rel="noreferrer" class="font-semibold text-[var(--c-primary)] underline underline-offset-4">${escapeHtml(String(label))}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-[var(--c-soft)] px-1 py-0.5 text-sm">$1</code>');

  return html;
};

export function renderBlogContent(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("### ")) return `<h3>${applyInlineMarkdown(block.slice(4))}</h3>`;
      if (block.startsWith("## ")) return `<h2>${applyInlineMarkdown(block.slice(3))}</h2>`;
      if (block.startsWith("# ")) return `<h1>${applyInlineMarkdown(block.slice(2))}</h1>`;
      if (block.startsWith("> ")) return `<blockquote>${applyInlineMarkdown(block.replace(/^>\s?/gm, ""))}</blockquote>`;

      const lines = block.split("\n");
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${applyInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }

      return `<p>${applyInlineMarkdown(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

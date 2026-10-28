// shared.js
// Helpers every theme uses. Feed generation and comment embedding are the
// same regardless of layout, so they live here once instead of being
// duplicated in each theme file.

export function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function escapeXml(str = "") {
  // Control characters are not allowed in XML at all; one stray character would make feed readers reject the whole feed.
  return escapeHtml(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Content-Security-Policy for every published page. Posts are sanitized when they are
// written, and this is the second lock: even if something slipped through, the browser
// refuses to run any script except giscus (and only when comments are switched on).
function publishedCsp(comments) {
  const g = comments ? "https://giscus.app" : "'none'";
  const yt = "https://www.youtube-nocookie.com"; // privacy-enhanced YouTube embeds only
  return [
    "default-src 'self'",
    `script-src ${g}`,
    "style-src 'self' 'unsafe-inline'", // KaTeX math needs inline style attributes; styles cannot run code
    "img-src 'self' data: https:",
    `frame-src ${yt}${comments ? " https://giscus.app" : ""}`,
    `connect-src ${comments ? "https://giscus.app" : "'none'"}`,
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join("; ");
}

// Standard <head> contents every theme should include.
export function headTags({ siteName, description, math = false, comments = false }) {
  return `<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${publishedCsp(comments)}">
<meta name="generator" content="Prologue">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(siteName)}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}
<link rel="stylesheet" href="/assets/site.css">
${math ? `<link rel="stylesheet" href="/vendor/katex/katex.min.css">` : ""}
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteName)}" href="/feed.xml">`;
}

// Menu entries for standalone pages marked "show in menu".
// Slugs were validated when loaded, and labels are escaped here.
export function pageLinks(pages = [], wrap = (a) => a) {
  return pages
    .filter((p) => p.nav)
    .map((p) => wrap(`<a href="/${p.slug}.html">${escapeHtml(p.title)}</a>`))
    .join("");
}

// Styles every theme gets for highlighted code and math.
export const CODE_CSS = `
.hljs-comment, .hljs-quote { color: #8a8f98; font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-doctag, .hljs-section, .hljs-name { color: #ff7b72; }
.hljs-string, .hljs-regexp, .hljs-addition, .hljs-meta .hljs-string { color: #a5d6ff; }
.hljs-number, .hljs-built_in, .hljs-type, .hljs-symbol, .hljs-bullet, .hljs-variable, .hljs-template-variable { color: #ffa657; }
.hljs-title, .hljs-title.function_, .hljs-title.class_, .hljs-attr, .hljs-attribute, .hljs-selector-class, .hljs-selector-id { color: #d2a8ff; }
.hljs-meta, .hljs-deletion { color: #79c0ff; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }
.math-display { overflow-x: auto; margin: 1.2em 0; text-align: center; }
.katex { font-size: 1.05em; }
.video-embed { position: relative; aspect-ratio: 16 / 9; margin: 1.4em 0; background: #000; border-radius: 6px; overflow: hidden; }
.video-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
`;

// Comments via giscus (github.com/giscus/giscus) — backed by GitHub Discussions
// on your own repo, so there's no third-party account and no tracking script
// beyond what GitHub itself runs. Config comes from https://giscus.app after
// enabling Discussions on the repo and installing the giscus app.
export function renderGiscus(giscus) {
  if (!giscus?.repo) return "";
  const { repo, repoId, category, categoryId, mapping = "pathname", theme = "light" } = giscus;
  return `<section class="comments">
  <script src="https://giscus.app/client.js"
    data-repo="${escapeHtml(repo)}"
    data-repo-id="${escapeHtml(repoId)}"
    data-category="${escapeHtml(category)}"
    data-category-id="${escapeHtml(categoryId)}"
    data-mapping="${escapeHtml(mapping)}"
    data-reactions-enabled="1"
    data-theme="${escapeHtml(theme)}"
    crossorigin="anonymous"
    async>
  </script>
</section>`;
}

export function renderFeed({ siteName, description, siteUrl, posts }) {
  const items = posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30)
    .map(
      (p) => `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${siteUrl}/posts/${p.slug}.html</link>
    <guid>${siteUrl}/posts/${p.slug}.html</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    ${p.excerpt ? `<description>${escapeXml(p.excerpt)}</description>` : ""}
  </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(siteName)}</title>
  <link>${siteUrl}/</link>
  <description>${escapeXml(description || "")}</description>
  <generator>Prologue</generator>
${items}
</channel>
</rss>`;
}

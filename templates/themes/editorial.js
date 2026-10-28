import { escapeHtml, formatDate, headTags, renderGiscus, pageLinks } from "../shared.js";

export const id = "editorial";
export const name = "Editorial";
export const description = "One centered column, serif type. Classic, calm, easy to read — good default for a writing-first blog.";

// Small wireframe shown in the theme picker so you can see the shape at a glance.
export const preview = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
<rect width="120" height="80" fill="#F7F4EC"/>
<rect x="20" y="10" width="80" height="6" fill="#262220"/>
<rect x="20" y="24" width="80" height="1" fill="#ddd5c7"/>
<rect x="20" y="32" width="80" height="4" fill="#A8432E"/>
<rect x="20" y="40" width="80" height="3" fill="#c9c2b4"/>
<rect x="20" y="46" width="60" height="3" fill="#c9c2b4"/>
<rect x="20" y="56" width="80" height="4" fill="#A8432E"/>
<rect x="20" y="64" width="80" height="3" fill="#c9c2b4"/>
<rect x="20" y="70" width="50" height="3" fill="#c9c2b4"/>
</svg>`;

export const css = `
:root {
  --paper: #F7F4EC; --ink: #262220; --ink-soft: #6b625c; --accent: #A8432E; --rule: #ddd5c7;
  --serif: "Iowan Old Style", "Palatino Linotype", Georgia, "Source Serif 4", serif;
  --sans: -apple-system, "Segoe UI", Inter, system-ui, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--serif); line-height: 1.65; }
.wrap { max-width: 640px; margin: 0 auto; padding: 3.5rem 1.5rem 6rem; }
header.site-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--rule); padding-bottom: 1.2rem; margin-bottom: 2.5rem; }
.site-title { font-family: var(--sans); font-weight: 700; font-size: 1.05rem; letter-spacing: -0.01em; }
.site-title a { color: var(--ink); text-decoration: none; }
nav.site-nav a { font-family: var(--sans); font-size: 0.9rem; color: var(--ink-soft); text-decoration: none; margin-left: 1.2rem; }
nav.site-nav a:hover { color: var(--accent); }
.post-list { list-style: none; margin: 0; padding: 0; }
.post-list li { padding: 1.35rem 0; border-bottom: 1px solid var(--rule); }
.post-list li:first-child { padding-top: 0; }
.post-list time { font-family: var(--sans); font-size: 0.8rem; color: var(--ink-soft); display: block; margin-bottom: 0.3rem; }
.post-list h2 { margin: 0 0 0.3rem; font-size: 1.4rem; font-weight: 600; }
.post-list h2 a { color: var(--ink); text-decoration: none; }
.post-list h2 a:hover { color: var(--accent); }
.post-list p { margin: 0; color: var(--ink-soft); font-size: 0.98rem; }
article.post h1.title { font-size: 2.1rem; line-height: 1.25; margin: 0 0 0.4rem; }
article.post .meta { font-family: var(--sans); font-size: 0.85rem; color: var(--ink-soft); margin-bottom: 2.2rem; }
article.post p { margin: 1.1em 0; }
article.post h2 { font-size: 1.4rem; margin-top: 2em; }
article.post h3 { font-size: 1.15rem; margin-top: 1.6em; }
article.post a { color: var(--accent); }
article.post blockquote { margin: 1.4em 0; padding-left: 1rem; border-left: 3px solid var(--rule); color: var(--ink-soft); }
article.post pre { background: #2b2622; color: #f2ede4; padding: 1rem 1.1rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; }
article.post code { font-family: "SFMono-Regular", Consolas, Menlo, monospace; font-size: 0.88em; }
article.post :not(pre) > code { background: #ece6d8; padding: 0.1em 0.35em; border-radius: 3px; }
article.post img { max-width: 100%; border-radius: 4px; }
article.post hr { border: none; border-top: 1px solid var(--rule); margin: 2.5em 0; }
footer.site-footer { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--rule); font-family: var(--sans); font-size: 0.8rem; color: var(--ink-soft); }
.comments { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--rule); }
`;

function layout({ siteName, description, body, pages = [], math = false, comments = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headTags({ siteName, description, math, comments })}
</head>
<body>
<div class="wrap">
  <header class="site-header">
    <div class="site-title"><a href="/">${escapeHtml(siteName)}</a></div>
    <nav class="site-nav"><a href="/">Posts</a>${pageLinks(pages)}<a href="/feed.xml">RSS</a></nav>
  </header>
  ${body}
  <footer class="site-footer">Published with a static site, no backend required.</footer>
</div>
</body>
</html>`;
}

export function renderIndex({ siteName, description, posts, pages = [] }) {
  const items = posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(
      (p) => `<li>
        <time datetime="${p.date}">${formatDate(p.date)}</time>
        <h2><a href="/posts/${p.slug}.html">${escapeHtml(p.title)}</a></h2>
        ${p.excerpt ? `<p>${escapeHtml(p.excerpt)}</p>` : ""}
      </li>`
    )
    .join("\n");
  const body = posts.length ? `<ul class="post-list">${items}</ul>` : `<p style="color:var(--ink-soft)">No posts yet.</p>`;
  return layout({ siteName, description, body, pages });
}

export function renderPost({ siteName, title, date, contentHtml, giscus, pages = [], math = false }) {
  const body = `<article class="post">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta"><time datetime="${date}">${formatDate(date)}</time></div>
    ${contentHtml}
  </article>
  ${renderGiscus(giscus)}`;
  return layout({ siteName, body, pages, math, comments: !!giscus?.repo });
}

export function renderPage({ siteName, title, contentHtml, pages = [], math = false }) {
  const body = `<article class="post">
    <h1 class="title">${escapeHtml(title)}</h1>
    ${contentHtml}
  </article>`;
  return layout({ siteName, body, pages, math });
}

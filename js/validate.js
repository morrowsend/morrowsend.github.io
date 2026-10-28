// validate.js
// Everything that comes from outside the running code is checked here before use:
// what you type, and also what is read back from your repo (the manifest is just a
// file in the repo, so it is treated as untrusted too).

const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/; // GitHub usernames
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Page slugs become /<slug>.html at the site root, so these names are taken.
export const RESERVED_PAGE_SLUGS = new Set(["index", "prologue", "404", "feed", "posts", "pages", "assets", "vendor", "js", "css", "templates"]);

export const isOwner = (s) => typeof s === "string" && OWNER_RE.test(s);
export const isSlug = (s) => typeof s === "string" && SLUG_RE.test(s);
export const isDate = (s) => typeof s === "string" && DATE_RE.test(s) && !isNaN(new Date(s));
export const isPageSlug = (s) => isSlug(s) && !RESERVED_PAGE_SLUGS.has(s);

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

/** giscus values are pasted by hand and end up in HTML attributes: allow only the characters they can contain. */
export function cleanGiscus(g) {
  if (!g || typeof g !== "object") return null;
  const repo = str(g.repo, 100).trim();
  if (!repo) return null;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("Giscus repo must look like owner/name.");
  const repoId = str(g.repoId, 60).trim();
  const categoryId = str(g.categoryId, 60).trim();
  const category = str(g.category, 80).trim();
  if (!/^[A-Za-z0-9_=-]+$/.test(repoId)) throw new Error("Giscus Repo ID has unexpected characters.");
  if (!/^[A-Za-z0-9_=-]+$/.test(categoryId)) throw new Error("Giscus Category ID has unexpected characters.");
  if (!category || /["<>\n]/.test(category)) throw new Error("Giscus category has unexpected characters.");
  return { repo, repoId, category, categoryId };
}

/**
 * Take whatever JSON was read from the repo and return a manifest that is safe to use:
 * wrong types dropped, entries with unsafe slugs/dates removed.
 */
export function cleanManifest(raw) {
  const m = raw && typeof raw === "object" ? raw : {};
  const dropped = [];
  const posts = [];
  for (const p of Array.isArray(m.posts) ? m.posts : []) {
    if (p && isSlug(p.slug) && isDate(p.date)) {
      posts.push({ slug: p.slug, title: str(p.title, 200) || p.slug, date: p.date, excerpt: str(p.excerpt, 300) });
    } else dropped.push("post");
  }
  const pages = [];
  for (const p of Array.isArray(m.pages) ? m.pages : []) {
    if (p && isPageSlug(p.slug)) {
      pages.push({ slug: p.slug, title: str(p.title, 200) || p.slug, nav: p.nav !== false });
    } else dropped.push("page");
  }
  let giscus = null;
  try { giscus = cleanGiscus(m.giscus); } catch { giscus = null; }
  return {
    manifest: {
      siteName: str(m.siteName, 120) || "My blog",
      description: str(m.description, 300),
      themeId: str(m.themeId, 40) || "editorial",
      posts,
      pages,
      giscus,
    },
    dropped: dropped.length,
  };
}

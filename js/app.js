import { GitHubAPI } from "./github-api.js";
import { vault } from "./vault.js";
import { renderMarkdown } from "./render.js";
import { THEMES, getTheme, renderFeed } from "../templates/registry.js";
import { isOwner, isSlug, isPageSlug, cleanManifest, cleanGiscus, RESERVED_PAGE_SLUGS } from "./validate.js";

// Rules this file follows (see README "Security"):
//  - Anything dynamic put into HTML goes through esc().
//  - Markdown is only ever turned into HTML by render.js (sanitized).
//  - The token is never read here; only vault.js and github-api.js touch it.

// Clickjacking guard. Another site could load this page in an invisible frame and trick you into
// clicking buttons. We can't set the frame-blocking header on GitHub Pages, so refuse to run when framed.
if (window.top !== window.self) {
  document.body.textContent = "For your security, Prologue can't run inside another page. Open it directly in its own tab.";
  throw new Error("Prologue refuses to run inside a frame.");
}

const $ = (sel, root = document) => root.querySelector(sel);
const app = $("#app");
const api = new GitHubAPI();

const MANIFEST_PATH = "prologue/manifest.json";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif" };

const store = {
  get owner() { try { const o = localStorage.getItem("pl_owner") || ""; return isOwner(o) ? o : ""; } catch { return ""; } },
  set owner(v) { try { localStorage.setItem("pl_owner", v); } catch { /* storage unavailable */ } },
};

let manifest = null; // validated copy of prologue/manifest.json
let tab = "posts";
let notice = "";

const repoName = () => `${store.owner}.github.io`;

function esc(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

boot();

// ---------- boot ----------

async function boot() {
  if (!store.owner) return renderConnect();
  if (!vault.has()) return vault.hasSaved() ? renderUnlock() : renderConnect();

  try {
    await api.getUser();
  } catch (e) {
    vault.clear();
    return renderConnect(`Couldn't verify that token (${e.message}). Check it and try again.`);
  }
  try {
    const exists = await api.repoExists(store.owner, repoName());
    if (!exists) return renderInit("create");
    const file = await api.getFile(store.owner, repoName(), MANIFEST_PATH);
    if (!file) return renderInit("adopt");
    const { manifest: m, dropped } = cleanManifest(JSON.parse(file.content));
    manifest = m;
    if (dropped) notice = `${dropped} entr${dropped === 1 ? "y" : "ies"} in the post list had invalid names and were ignored. Your files are untouched.`;
    renderDashboard();
  } catch (e) {
    renderFatal(e);
  }
}

function renderFatal(e) {
  app.innerHTML = `
    <div class="screen center">
      <h1>Something went wrong</h1>
      <p class="error">${esc(e.message)}</p>
      <p class="muted small">Nothing was changed. If this keeps happening, check <code>prologue/manifest.json</code> in your repo
      (restore an earlier version from the repo's History if it was edited by hand).</p>
      <div class="button-row"><button id="retry-btn">Try again</button><button class="secondary" id="out-btn">Sign out</button></div>
    </div>`;
  $("#retry-btn").addEventListener("click", boot);
  $("#out-btn").addEventListener("click", signOut);
}

function signOut(forget = false) {
  vault.clear();
  if (forget === true) vault.forgetSaved();
  manifest = null;
  renderConnect();
}

// ---------- Screen: Connect / Unlock ----------

function renderConnect(error) {
  app.innerHTML = `
    <div class="screen center">
      <h1>Connect your site</h1>
      <p class="muted">Create a GitHub <strong>fine-grained personal access token</strong> limited to your
      <code>&lt;username&gt;.github.io</code> repo with <strong>Contents: Read and write</strong>
      and nothing else. If GitHub Pages isn't on yet, switch it on in the repo's Settings → Pages.</p>
      <p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Create a token on GitHub</a></p>
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ""}
      <form id="connect-form" autocomplete="on">
        <label>GitHub username
          <input name="owner" required maxlength="39" autocomplete="username" placeholder="yourname" value="${esc(store.owner)}">
        </label>
        <label>Personal access token
          <input name="token" required type="password" autocomplete="off" placeholder="github_pat_...">
        </label>
        <label class="check"><input type="checkbox" name="remember"> Remember me on this device (encrypted with a passphrase)</label>
        <label id="pass-row" class="hidden">Passphrase <span class="muted small">(12+ characters; you will type it each visit. It is never stored.)</span>
          <input name="passphrase" type="password" minlength="12" autocomplete="new-password">
        </label>
        <button type="submit">Connect</button>
      </form>
      <p class="muted small">By default your token is held in this tab's memory only and is forgotten when you close or reload it.
      It is only ever sent to api.github.com.</p>
    </div>`;
  const form = $("#connect-form");
  form.elements.remember.addEventListener("change", (e) => {
    $("#pass-row").classList.toggle("hidden", !e.target.checked);
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const owner = String(fd.get("owner")).trim();
    const token = String(fd.get("token")).trim();
    if (!isOwner(owner)) return renderConnect("That doesn't look like a GitHub username.");
    if (!token) return renderConnect("Paste your token to continue.");
    vault.set(token, owner);
    store.owner = owner;
    try {
      if (fd.get("remember")) await vault.save(String(fd.get("passphrase") || ""));
      else vault.forgetSaved();
    } catch (err) {
      vault.clear();
      return renderConnect(err.message);
    }
    form.reset(); // drop token + passphrase from the form fields
    boot();
  });
}

function renderUnlock(error) {
  app.innerHTML = `
    <div class="screen center">
      <h1>Welcome back, ${esc(store.owner)}</h1>
      <p class="muted">Enter your passphrase to unlock the saved sign-in on this device.</p>
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ""}
      <form id="unlock-form">
        <label>Passphrase <input name="passphrase" type="password" autocomplete="current-password" required autofocus></label>
        <button type="submit">Unlock</button>
      </form>
      <p><button class="link" id="forget-btn">Forget this device and sign in differently</button></p>
    </div>`;
  $("#unlock-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = new FormData(e.target).get("passphrase");
    try {
      await vault.unlock(String(pass), store.owner);
    } catch (err) {
      return renderUnlock(err.message);
    }
    e.target.reset();
    boot();
  });
  $("#forget-btn").addEventListener("click", () => { vault.forgetSaved(); renderConnect(); });
}

// ---------- Screen: Init (create or adopt the repo) ----------

function renderInit(mode) {
  const repo = repoName();
  app.innerHTML = `
    <div class="screen center">
      <h1>${mode === "create" ? "Set up your site repo" : "Set up Prologue in this repo"}</h1>
      <p class="muted">${
        mode === "create"
          ? `No <code>${esc(repo)}</code> repo exists yet. Prologue will try to create it, turn on GitHub Pages, and add starter files.`
          : `Found <code>${esc(repo)}</code>, but it isn't set up for Prologue yet. This adds the starter files; nothing else in the repo is touched.`
      }</p>
      <label>Site name <input id="site-name" maxlength="120" value="${esc(store.owner)}'s blog"></label>
      <button id="init-btn">Initialize</button>
      <p id="init-status" class="muted small" role="status"></p>
      <p><button class="link" id="reset-btn">Use a different account</button></p>
    </div>`;
  $("#reset-btn").addEventListener("click", () => signOut());
  $("#init-btn").addEventListener("click", async () => {
    const status = $("#init-status");
    const siteName = $("#site-name").value.trim().slice(0, 120) || store.owner;
    $("#init-btn").disabled = true;
    try {
      if (mode === "create") {
        status.textContent = "Creating repo…";
        await api.createUserSiteRepo(store.owner);
        await sleep(1500); // GitHub needs a moment before the new repo accepts writes
      }
      status.textContent = "Enabling GitHub Pages…";
      try {
        const branch = await api.getDefaultBranch(store.owner, repo);
        await api.enablePages(store.owner, repo, branch);
      } catch (e) {
        // Not fatal: if the token lacks permission for this, switch Pages on by hand (Settings -> Pages).
        console.warn("Could not enable Pages automatically:", e.message);
      }
      // Setup writes the home page, stylesheet and feed. If your repo already has its own versions
      // (an existing site), say so and let you decide before anything is replaced.
      const isOurs = { // each file Prologue writes carries a recognisable mark
        "index.html": (t) => t.includes('name="generator" content="Prologue"'),
        "assets/site.css": (t) => t.includes(".hljs-keyword"),
        "feed.xml": (t) => t.includes("<generator>Prologue</generator>"),
      };
      const clash = [];
      for (const [path, ours] of Object.entries(isOurs)) {
        const f = await api.getFile(store.owner, repo, path);
        if (f && !ours(f.content)) clash.push(path);
      }
      if (clash.length) {
        const ok = confirm(`Your repo already has: ${clash.join(", ")}\n\nPrologue didn't create ${clash.length === 1 ? "it" : "them"}. Continuing will REPLACE ${clash.length === 1 ? "it" : "them"} with Prologue's version. The old version stays in your repo's History, but your live site's front page will change.\n\nReplace?`);
        if (!ok) {
          status.textContent = "Cancelled. Nothing was changed. Use a fresh repo for Prologue, or move your existing files first.";
          $("#init-btn").disabled = false;
          return;
        }
      }
      manifest = { siteName, description: "", themeId: "editorial", posts: [], pages: [], giscus: null };
      status.textContent = "Writing starter files…";
      await api.upsertFile(store.owner, repo, MANIFEST_PATH, JSON.stringify(manifest, null, 2), "prologue: init manifest");
      await writeDerived();
      renderDashboard();
    } catch (e) {
      status.textContent = `Error: ${e.message}`;
      $("#init-btn").disabled = false;
    }
  });
}

// ---------- Screen: Dashboard ----------

function renderDashboard() {
  const repo = repoName();
  const posts = [...manifest.posts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const pages = manifest.pages;
  const rows = tab === "posts"
    ? posts.map((p) => `<li>
          <div><strong>${esc(p.title)}</strong> <span class="muted small">${esc(p.date)}</span></div>
          <div class="row-actions">
            <button class="link" data-edit="${esc(p.slug)}">Edit</button>
            <button class="link danger" data-delete="${esc(p.slug)}">Delete</button>
          </div></li>`)
    : pages.map((p) => `<li>
          <div><strong>${esc(p.title)}</strong> <span class="muted small">/${esc(p.slug)}.html${p.nav ? "" : " (not in menu)"}</span></div>
          <div class="row-actions">
            <button class="link" data-edit="${esc(p.slug)}">Edit</button>
            <button class="link danger" data-delete="${esc(p.slug)}">Delete</button>
          </div></li>`);
  const empty = tab === "posts"
    ? "No posts yet. Click “New post” to write your first one."
    : "No pages yet. Pages are for things like About or Projects that aren't dated posts.";

  app.innerHTML = `
    <div class="screen">
      <header class="app-header">
        <div>
          <h1>${esc(manifest.siteName)}</h1>
          <a class="muted small" href="https://${esc(repo)}" target="_blank" rel="noopener noreferrer">https://${esc(repo)}</a>
        </div>
        <div class="app-header-actions">
          <button class="secondary" id="settings-btn">Settings</button>
          <button id="new-btn">${tab === "posts" ? "New post" : "New page"}</button>
        </div>
      </header>
      ${notice ? `<p class="notice" role="status">${esc(notice)}</p>` : ""}
      <div class="tabs" role="tablist">
        <button class="tab ${tab === "posts" ? "active" : ""}" data-tab="posts" role="tab">Posts (${posts.length})</button>
        <button class="tab ${tab === "pages" ? "active" : ""}" data-tab="pages" role="tab">Pages (${pages.length})</button>
      </div>
      ${rows.length ? `<ul class="post-manage-list">${rows.join("")}</ul>` : `<p class="muted">${esc(empty)}</p>`}
      <p class="muted small"><button class="link" id="rebuild-btn">Rebuild every page</button>
      <span id="rebuild-status" role="status"></span></p>
    </div>`;
  notice = "";
  $("#new-btn").addEventListener("click", () => renderEditor({ kind: tab === "posts" ? "post" : "page" }));
  $("#settings-btn").addEventListener("click", renderSettings);
  app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; renderDashboard(); }));
  app.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => renderEditor({ kind: tab === "posts" ? "post" : "page", slug: b.dataset.edit })));
  app.querySelectorAll("[data-delete]").forEach((b) =>
    b.addEventListener("click", () => deleteItem(tab === "posts" ? "post" : "page", b.dataset.delete)));
  $("#rebuild-btn").addEventListener("click", async () => {
    if (!confirm("Re-generate every post and page with the current theme and settings? This makes one commit per file.")) return;
    const st = $("#rebuild-status");
    try {
      await rebuildAll((i, n) => { st.textContent = ` Rebuilding ${i}/${n}…`; });
      await writeDerived();
      st.textContent = " Done.";
    } catch (e) { st.textContent = ` Failed: ${e.message}`; }
  });
}

async function deleteItem(kind, slug) {
  if (!confirm(`Delete this ${kind}? This removes it from the live site too.`)) return;
  const repo = repoName();
  const srcPath = kind === "post" ? `posts/${slug}.md` : `pages/${slug}.md`;
  const htmlPath = kind === "post" ? `posts/${slug}.html` : `${slug}.html`;
  try {
    for (const path of [srcPath, htmlPath]) {
      const f = await api.getFile(store.owner, repo, path);
      if (f) await api.deleteFile(store.owner, repo, path, f.sha, `prologue: delete ${kind} ${slug}`);
    }
    let wasInMenu = false;
    await updateManifest((m) => {
      if (kind === "post") m.posts = m.posts.filter((p) => p.slug !== slug);
      else {
        wasInMenu = m.pages.some((p) => p.slug === slug && p.nav);
        m.pages = m.pages.filter((p) => p.slug !== slug);
      }
    });
    await writeDerived();
    if (wasInMenu) await offerMenuRefresh();
  } catch (e) {
    alert(`Delete failed: ${e.message}`);
  }
  renderDashboard();
}

// ---------- Screen: Settings ----------

function renderSettings(error) {
  const currentTheme = manifest.themeId;
  const g = manifest.giscus || {};
  app.innerHTML = `
    <div class="screen center">
      <h1>Settings</h1>
      ${typeof error === "string" ? `<p class="error" role="alert">${esc(error)}</p>` : ""}
      <label>Site name <input id="s-name" maxlength="120" value="${esc(manifest.siteName)}"></label>
      <label>Description <span class="muted small">(used for search engines)</span>
        <input id="s-desc" maxlength="300" value="${esc(manifest.description)}"></label>

      <hr>
      <h2>Theme</h2>
      <div class="theme-grid">
        ${THEMES.map((t) => `<label class="theme-card ${t.id === currentTheme ? "selected" : ""}">
            <input type="radio" name="theme" value="${esc(t.id)}" ${t.id === currentTheme ? "checked" : ""}>
            <div class="theme-preview">${t.preview}</div>
            <div class="theme-name">${esc(t.name)}</div>
            <div class="theme-desc muted small">${esc(t.description)}</div>
          </label>`).join("")}
      </div>

      <hr>
      <h2>Comments (giscus)</h2>
      <p class="muted small">Comments use <a href="https://giscus.app" target="_blank" rel="noopener noreferrer">giscus</a>, stored as GitHub Discussions on your repo.
      Enable Discussions in the repo's settings, install the
      <a href="https://github.com/apps/giscus" target="_blank" rel="noopener noreferrer">giscus app</a>, then copy the values from giscus.app below.
      Leave Repo blank to turn comments off.</p>
      <label>Repo <span class="muted small">(owner/name)</span>
        <input id="g-repo" maxlength="100" placeholder="${esc(store.owner)}/${esc(repoName())}" value="${esc(g.repo || "")}"></label>
      <label>Repo ID <input id="g-repoid" maxlength="60" placeholder="R_kg..." value="${esc(g.repoId || "")}"></label>
      <label>Discussion category <input id="g-category" maxlength="80" placeholder="Announcements" value="${esc(g.category || "")}"></label>
      <label>Category ID <input id="g-categoryid" maxlength="60" placeholder="DIC_kw..." value="${esc(g.categoryId || "")}"></label>

      <div class="button-row">
        <button class="secondary" id="cancel-btn">Cancel</button>
        <button id="save-btn">Save and rebuild</button>
      </div>
      <p id="save-status" class="muted small" role="status"></p>

      <hr>
      <h2>This device</h2>
      <div class="button-row">
        <button class="secondary" id="signout-btn">Sign out</button>
        ${vault.hasSaved() ? `<button class="secondary danger" id="forget-btn">Sign out and forget saved sign-in</button>` : ""}
      </div>
    </div>`;
  $("#cancel-btn").addEventListener("click", renderDashboard);
  $("#signout-btn").addEventListener("click", () => signOut());
  $("#forget-btn")?.addEventListener("click", () => signOut(true));
  app.querySelectorAll('input[name="theme"]').forEach((radio) =>
    radio.addEventListener("change", () => {
      app.querySelectorAll(".theme-card").forEach((c) => c.classList.remove("selected"));
      radio.closest(".theme-card").classList.add("selected");
    }));
  $("#save-btn").addEventListener("click", async () => {
    let giscus;
    try {
      giscus = cleanGiscus({
        repo: $("#g-repo").value, repoId: $("#g-repoid").value,
        category: $("#g-category").value, categoryId: $("#g-categoryid").value,
      });
    } catch (e) { return renderSettings(e.message); }
    const themeId = app.querySelector('input[name="theme"]:checked')?.value;
    const btn = $("#save-btn");
    const st = $("#save-status");
    btn.disabled = true;
    try {
      await updateManifest((m) => {
        m.siteName = $("#s-name").value.trim().slice(0, 120) || m.siteName;
        m.description = $("#s-desc").value.trim().slice(0, 300);
        if (THEMES.some((t) => t.id === themeId)) m.themeId = themeId;
        m.giscus = giscus;
      });
      await rebuildAll((i, n) => { st.textContent = `Rebuilding ${i}/${n}…`; });
      await writeDerived();
      renderDashboard();
    } catch (e) {
      st.textContent = `Failed: ${e.message}`;
      btn.disabled = false;
    }
  });
}

// ---------- Screen: Editor (posts and pages) ----------

async function renderEditor({ kind, slug }) {
  const repo = repoName();
  const isPage = kind === "page";
  const existing = slug ? (isPage ? manifest.pages : manifest.posts).find((p) => p.slug === slug) : null;
  let markdownBody = "";
  if (slug) {
    try {
      const file = await api.getFile(store.owner, repo, `${isPage ? "pages" : "posts"}/${slug}.md`);
      markdownBody = file ? file.content : "";
    } catch (e) { alert(`Couldn't load that ${kind}: ${e.message}`); return renderDashboard(); }
  }

  app.innerHTML = `
    <div class="screen editor-screen">
      <header class="app-header">
        <button class="link" id="back-btn">&larr; Back</button>
        <div class="button-row">
          ${slug ? `<button class="secondary danger" id="delete-btn">Delete</button>` : ""}
          <button id="publish-btn">${slug ? "Save" : "Publish"}</button>
        </div>
      </header>
      <input id="e-title" class="title-input" maxlength="200" placeholder="${isPage ? "Page" : "Post"} title" value="${esc(existing?.title || "")}">
      ${isPage ? `<div class="page-opts">
          <label class="inline">Address /<input id="e-slug" maxlength="60" ${slug ? "readonly" : ""} value="${esc(slug || "")}" placeholder="about">.html</label>
          <label class="check inline"><input type="checkbox" id="e-nav" ${existing ? (existing.nav ? "checked" : "") : "checked"}> Show in menu</label>
        </div>` : ""}
      <div class="editor-panes">
        <div class="editor-col">
          <textarea id="e-body" placeholder="Write in Markdown. Code in fences, math in $…$ and $$…$$." spellcheck="true">${esc(markdownBody)}</textarea>
          <p class="muted small" id="img-status" role="status">Drag an image onto the editor, or paste one, to upload it (PNG, JPG, GIF, WebP, AVIF; up to 10 MB).</p>
        </div>
        <div id="e-preview" class="preview"></div>
      </div>
    </div>`;

  const bodyEl = $("#e-body");
  const preview = $("#e-preview");
  const imgStatus = $("#img-status");
  let dirty = false;
  let timer = 0;
  const update = () => {
    try { preview.innerHTML = renderMarkdown(bodyEl.value).html; }
    catch (e) { preview.textContent = e.message; }
  };
  update();
  const markDirty = () => { dirty = true; };
  bodyEl.addEventListener("input", () => { markDirty(); clearTimeout(timer); timer = setTimeout(update, 120); });
  $("#e-title").addEventListener("input", markDirty);
  const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
  window.addEventListener("beforeunload", warn);
  const leave = () => { window.removeEventListener("beforeunload", warn); };

  const imageSlug = slug && !isPage ? slug : "post";
  bodyEl.addEventListener("dragover", (e) => e.preventDefault());
  bodyEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) { markDirty(); handleImageUpload(file, bodyEl, imgStatus, imageSlug, update); }
  });
  bodyEl.addEventListener("paste", (e) => {
    const file = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"))?.getAsFile();
    if (file) { e.preventDefault(); markDirty(); handleImageUpload(file, bodyEl, imgStatus, imageSlug, update); }
  });

  $("#back-btn").addEventListener("click", () => {
    if (dirty && !confirm("Discard your unsaved changes?")) return;
    leave();
    renderDashboard();
  });
  $("#delete-btn")?.addEventListener("click", () => { leave(); deleteItem(kind, slug); });

  $("#publish-btn").addEventListener("click", async () => {
    const title = $("#e-title").value.trim();
    const body = bodyEl.value;
    if (!title) return alert("Give it a title first.");
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = isPage ? ($("#e-slug").value.trim().toLowerCase() || slugify(title, false)) : slugify(title, true);
      if (isPage) {
        if (!isPageSlug(finalSlug)) {
          return alert(RESERVED_PAGE_SLUGS.has(finalSlug)
            ? `“${finalSlug}” is reserved. Choose another address.`
            : "Use only lowercase letters, numbers and hyphens for the address.");
        }
        if (manifest.pages.some((p) => p.slug === finalSlug)) return alert("A page with that address already exists.");
      }
    }
    const btn = $("#publish-btn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      if (!slug) {
        // New item: never overwrite a file that already exists in the repo (for example your own
        // hand-made simulation-lab.html), because Prologue didn't create it.
        // Pages Prologue wrote carry a generator tag, so a retry after a failed save is fine.
        const target = isPage ? `${finalSlug}.html` : `posts/${finalSlug}.html`;
        const found = await api.getFile(store.owner, repo, target);
        if (found && !found.content.includes('name="generator" content="Prologue"')) {
          throw new Error(`“${target}” already exists in your repo and wasn't created by Prologue, so it won't be overwritten. ${isPage ? "Choose a different address." : "Try a slightly different title."}`);
        }
      }
      const { html: contentHtml, excerpt, hasMath } = renderMarkdown(body);
      const theme = getTheme(manifest.themeId);
      const srcPath = `${isPage ? "pages" : "posts"}/${finalSlug}.md`;
      const htmlPath = isPage ? `${finalSlug}.html` : `posts/${finalSlug}.html`;
      const date = existing?.date || today();
      const nav = isPage ? $("#e-nav").checked : false;

      await api.upsertFile(store.owner, repo, srcPath, body, `prologue: ${slug ? "update" : "new"} ${kind} "${title.slice(0, 60)}"`);

      let menuChanged = false;
      await updateManifest((m) => {
        if (isPage) {
          const i = m.pages.findIndex((p) => p.slug === finalSlug);
          const entry = { slug: finalSlug, title, nav };
          if (i >= 0) { menuChanged = m.pages[i].nav !== nav || m.pages[i].title !== title; m.pages[i] = entry; }
          else { menuChanged = nav; m.pages.push(entry); }
        } else {
          const entry = { slug: finalSlug, title, date, excerpt };
          const i = m.posts.findIndex((p) => p.slug === finalSlug);
          if (i >= 0) m.posts[i] = entry; else m.posts.push(entry);
        }
      });

      const pageHtml = isPage
        ? theme.renderPage({ siteName: manifest.siteName, title, contentHtml, pages: manifest.pages, math: hasMath })
        : theme.renderPost({ siteName: manifest.siteName, title, date, contentHtml, giscus: manifest.giscus, pages: manifest.pages, math: hasMath });
      await api.upsertFile(store.owner, repo, htmlPath, pageHtml, `prologue: render ${kind} "${title.slice(0, 60)}"`);
      await writeDerived();
      dirty = false;
      leave();
      if (menuChanged) await offerMenuRefresh();
      tab = isPage ? "pages" : "posts";
      renderDashboard();
    } catch (e) {
      alert(`Save failed: ${e.message}\n\nYour text is still in the editor. You can safely try again.`);
      btn.disabled = false;
      btn.textContent = slug ? "Save" : "Publish";
    }
  });
}

// ---------- Image upload ----------

async function handleImageUpload(file, textarea, statusEl, slugHint, onInserted) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) { statusEl.textContent = "Only PNG, JPG, GIF, WebP and AVIF images can be uploaded."; return; }
  if (file.size > MAX_IMAGE_BYTES) { statusEl.textContent = "That image is over 10 MB. Please shrink it first."; return; }
  if (!(await looksLikeImage(file, ext))) { statusEl.textContent = "That file isn't really a " + ext.toUpperCase() + " image, so it wasn't uploaded."; return; }
  const baseName = file.name.replace(/\.[^.]*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const placeholder = `![uploading ${baseName}…]()`;
  insertAtCursor(textarea, placeholder);
  onInserted();
  statusEl.textContent = `Uploading ${baseName}.${ext}…`;
  try {
    const base64 = await readFileAsBase64(file);
    const path = `posts/images/${slugHint}-${Date.now().toString(36)}-${baseName}.${ext}`;
    await api.putFileBase64(store.owner, repoName(), path, base64, `prologue: upload image ${baseName}.${ext}`);
    textarea.value = textarea.value.replace(placeholder, `![${baseName}](/${path})`);
    statusEl.textContent = `Uploaded ${baseName}.${ext}.`;
  } catch (e) {
    textarea.value = textarea.value.replace(placeholder, "");
    statusEl.textContent = `Upload failed: ${e.message}`;
  }
  onInserted();
}

/** Check the file's first bytes, not just its name or declared type. */
async function looksLikeImage(file, ext) {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const at = (i, str) => [...str].every((c, k) => b[i + k] === c.charCodeAt(0));
  switch (ext) {
    case "png": return b[0] === 0x89 && at(1, "PNG");
    case "jpg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "gif": return at(0, "GIF8");
    case "webp": return at(0, "RIFF") && at(8, "WEBP");
    case "avif": return at(4, "ftyp") && (at(8, "avif") || at(8, "avis"));
    default: return false;
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  const pos = start + text.length;
  textarea.setSelectionRange(pos, pos);
}

// ---------- Writing the site ----------

/**
 * Change the post list safely. Re-reads the manifest from the repo first, so a change
 * made from another device a moment ago isn't overwritten with this tab's older copy.
 */
async function updateManifest(mutator) {
  const repo = repoName();
  const f = await api.getFile(store.owner, repo, MANIFEST_PATH);
  const base = f ? cleanManifest(JSON.parse(f.content)).manifest : manifest;
  mutator(base);
  await api.putFile(store.owner, repo, MANIFEST_PATH, JSON.stringify(base, null, 2), "prologue: update manifest", f?.sha);
  manifest = base;
}

/** Stylesheet, home page and feed: everything derived from the manifest alone. */
async function writeDerived() {
  const repo = repoName();
  const theme = getTheme(manifest.themeId);
  await api.upsertFile(store.owner, repo, "assets/site.css", theme.css, "prologue: update stylesheet");
  await api.upsertFile(store.owner, repo, "index.html", theme.renderIndex(manifest), "prologue: regenerate index");
  await api.upsertFile(store.owner, repo, "feed.xml",
    renderFeed({ siteName: manifest.siteName, description: manifest.description, siteUrl: `https://${repo}`, posts: manifest.posts }),
    "prologue: regenerate feed");
}

/** Re-render every post and page from its Markdown source (after a theme, menu or settings change). */
async function rebuildAll(onProgress = () => {}) {
  const repo = repoName();
  const theme = getTheme(manifest.themeId);
  const jobs = [
    ...manifest.posts.map((p) => ({ kind: "post", ...p })),
    ...manifest.pages.map((p) => ({ kind: "page", ...p })),
  ];
  let done = 0;
  for (const j of jobs) {
    onProgress(done, jobs.length);
    const src = await api.getFile(store.owner, repo, `${j.kind === "post" ? "posts" : "pages"}/${j.slug}.md`);
    if (src) {
      const { html, hasMath } = renderMarkdown(src.content);
      const out = j.kind === "post"
        ? theme.renderPost({ siteName: manifest.siteName, title: j.title, date: j.date, contentHtml: html, giscus: manifest.giscus, pages: manifest.pages, math: hasMath })
        : theme.renderPage({ siteName: manifest.siteName, title: j.title, contentHtml: html, pages: manifest.pages, math: hasMath });
      const path = j.kind === "post" ? `posts/${j.slug}.html` : `${j.slug}.html`;
      await api.upsertFile(store.owner, repo, path, out, `prologue: rebuild ${j.kind} "${j.title.slice(0, 60)}"`);
    }
    done++;
  }
  onProgress(done, jobs.length);
}

async function offerMenuRefresh() {
  const n = manifest.posts.length + manifest.pages.length;
  if (n <= 1) return;
  if (confirm(`The menu changed. Update it on all ${n} existing pages now? (One commit each; you can also do this later with “Rebuild every page”.)`)) {
    try { await rebuildAll(); } catch (e) { alert(`Rebuild stopped: ${e.message}\nUse “Rebuild every page” on the dashboard to finish.`); }
  }
}

function slugify(title, withSuffix) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/g, "") || "untitled";
  const out = withSuffix ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;
  return isSlug(out) ? out : `item-${Math.random().toString(36).slice(2, 8)}`;
}

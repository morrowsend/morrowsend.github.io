# Prologue (a project log)

A static site and blog generator that lives inside your `<username>.github.io`
repo and runs in your browser: no build step, no npm, no server. Sign in on your
own site, write in Markdown, publish, switch themes. Prologue commits the
rendered HTML straight to your repo through the GitHub API.

**Why "Prologue"?** Short for *project log*: a place to write up what you're
working on as you go. It works just as well as a plain blog.

A spiritual successor to [isnowfy/simple](https://github.com/isnowfy/simple),
rebuilt with plain modern JavaScript and a short list of vendored libraries.

## Features

- Posts and standalone **pages** (About, Projects...) with an optional menu entry
- Markdown with **syntax-highlighted code** (about 30 languages) and **math** (`$x^2$`, `$$...$$`)
- **YouTube embeds**: paste a video link on its own line
- Live preview that matches what gets published
- Four layouts: Editorial, Sidebar, Grid, Minimal. Switching rebuilds everything
- Drag-and-drop or paste images
- RSS feed, regenerated automatically
- Optional comments through giscus (GitHub Discussions)
- Published pages need no JavaScript at all (math and code are rendered when you publish)

## Before you try it

Try Prologue on a throwaway site first, not on a site you care about. It treats the root of
`<username>.github.io` as its own: setup writes `index.html`, `feed.xml`, `assets/` and `prologue/`.
If an `index.html` or similar already exists, Prologue warns you and asks before replacing it, and every
change is a normal git commit you can revert from History. Prologue only works with the repo named
exactly `<username>.github.io`, so a test needs its own account name or a GitHub organization
(an organization gets `<orgname>.github.io` and is free).

## Setup

Prologue is a set of static files. It has to be served from a web address (your
GitHub Pages site), not opened by double-clicking, because browsers block ES
modules loaded from `file://`.

1. **Create the repo** named exactly `<username>.github.io` on GitHub
   (tick "Add a README"). A token scoped to one repo can't create repos, so do
   this by hand.
2. **Upload these files** to the repo root: "Add file" → "Upload files", and drag
   in the contents of this folder. Keep the structure (`js/`, `css/`,
   `templates/`, `vendor/`, `prologue.html`).
3. **Turn on Pages**: Settings → Pages → Deploy from branch → `main` / root.
4. **Create a token** at
   [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
   - Repository access: only `<username>.github.io`
   - Permissions: **Contents**: Read and write
   - Nothing else. (If GitHub Pages isn't on yet, switch it on yourself in step 3.)
   - Set a short expiry (30 to 90 days) and make a new one when it lapses.
5. **Open** `https://<username>.github.io/prologue.html` (give Pages a minute after
   the first upload). Enter your username and token, click **Initialize**, and write.

## Writing

- **Code**: fence it with a language: <code>```python</code>, <code>```js</code>, <code>```bash</code>...
  Unknown languages are shown plain.
- **Math**: `$E = mc^2$` inline, or `$$ ... $$` on its own lines for a displayed equation.
  `$5 and $10` is not treated as math. Write `\$` for a literal dollar sign.
- **YouTube**: put a YouTube link on a line by itself (`https://www.youtube.com/watch?v=...`, a `youtu.be` link, a Shorts link, or one with `?t=90` / `&t=1m30s` to start partway in). You can also paste YouTube's own "Embed" code. Either way Prologue builds a privacy-enhanced (`youtube-nocookie.com`), sandboxed player for you. Other iframes are removed.
- **Images**: drag onto the editor or paste. PNG, JPG, GIF, WebP and AVIF up to 10 MB.
- **Pages** live at `/<address>.html`. `index`, `prologue`, `404` and a few folder names are reserved.
  Menu order is the order the pages were created.

## Themes

Settings has a visual picker. Each theme is one file in `templates/themes/`
containing both its CSS and its page structure. To make your own, copy one and
add it to `templates/registry.js` (one line). Every theme also gets the shared
code-highlighting and math styles automatically.

## Security

What Prologue does, and what it can't promise.

**Your token**
- By default it's held in a private variable in memory only. It is never written to
  localStorage, sessionStorage, cookies, the page, or the URL. Closing or reloading the tab forgets it.
- "Remember me" stores it **encrypted** with a passphrase you choose (at least 12 characters;
  AES-256-GCM, PBKDF2 with 600,000 rounds). Only ciphertext is saved; the passphrase never is.
- Other code can't read the token: the module that holds it exposes no way to
  return it, only a way to send a request to `api.github.com`, and the object is frozen.
- It is only ever sent to `api.github.com`, and only for requests about your own `<username>.github.io`
  repo. Even code that managed to call the app's request function could not use your token on any other repo.
- The editor refuses to run inside another site's frame (clickjacking), and Prologue never overwrites a
  file in your repo that it didn't create.

**Stopping foreign scripts**
- The editor page has a strict Content-Security-Policy: only the files in your repo
  may run as scripts (no inline scripts, no `eval`, no CDNs), and it may only contact `api.github.com`.
- Published pages carry their own policy that allows no scripts at all, except giscus if you turn comments on.

**Everything you type**
- All Markdown goes through one renderer (`js/render.js`) and is sanitized with DOMPurify.
  Scripts, event handlers, `javascript:` links, iframes, forms and inline styles are removed.
  *Raw `<iframe>` embeds are removed, except YouTube video links and YouTube embed code, which are rebuilt from a checked video id (see Writing).*
- Math is rendered by KaTeX with its link/URL commands disabled, and inserted only after sanitizing.
- Titles, site name, descriptions and giscus fields are escaped or validated. Slugs, dates and
  GitHub usernames are checked against strict patterns, and the post list read from your repo is
  treated as untrusted too.

**What can't be guaranteed**
- No page can promise that *no* script could ever read a token the page itself uses. The
  protections above make it very hard to get a script running in the editor at all, and make the
  token unreadable even if one did, but a compromised browser, a malicious browser extension, or
  a hijacked GitHub account are outside what this app can defend against.
- The editor and your blog share an address (`<username>.github.io`). That's why published pages
  allow no scripts, and why the token isn't kept where a page could read it.
- Use a token limited to this one repo with Contents access only, and a short expiry.

See [SECURITY.md](SECURITY.md) for the attacks I tried against this design, what was fixed, and the
risks that remain.

If something looks wrong, every change Prologue makes is a normal git commit in your repo, so
you can revert it from the repo's History.

## Comments (giscus, optional)

**What it is:** a free comment box for the bottom of your posts. Visitors sign in with their GitHub
account to comment, and each post's comments are stored as a GitHub Discussion in your own repo. No ads,
no tracking, no separate account for you. It's **off by default**; skip this section if you don't want comments.
**Trade-off:** it runs a script from giscus.app on your post pages, which is the one third-party script
this project allows (see SECURITY.md).

To turn it on: enable Discussions on the repo, install the
[giscus app](https://github.com/apps/giscus), copy the four values from giscus.app
into Settings, and save. Leave Repo blank to turn comments off.

## Vendored libraries

Copied into `vendor/` as plain files so nothing is fetched from a CDN. See
`vendor/README.md` for versions and `vendor/licenses/` for licenses:
marked, DOMPurify, highlight.js, KaTeX.

## License

MIT, same as the project it's inspired by.

# Security notes

This is the list I made by trying to break Prologue's design, what each attack would do,
and what was done about it. Every "fixed" item has an automated test (a script that tries the attack
against the running app and fails if it works).

## Attacks tried

| # | Attack | What it would cause | Status |
|---|---|---|---|
| 1 | Script slipped into a post (`<script>`, `onerror=`, `javascript:` links, odd HTML that confuses parsers) | Code runs on your site | **Blocked.** DOMPurify strips it, and a Content-Security-Policy refuses scripts even if something got through. 17 known payloads tested |
| 2 | Hostile math (`\href{javascript:...}`, `\url`, `\htmlStyle`) | Script link or CSS injection | **Blocked.** KaTeX runs with those commands off; math is inserted only after sanitizing, only into text |
| 3 | A raw `<iframe>` (fake video, `srcdoc`, `javascript:` source, lookalike host) | Phishing frame or script on your page | **Blocked.** All iframes are removed. Only a checked YouTube video id is turned into a player, built by Prologue from fixed parts |
| 4 | Fake YouTube addresses (`youtube.com.evil.example`, bad id, extra characters) | Embed of a hostile page | **Blocked.** Exact host list, 11-character id check, at most 20 videos per page |
| 5 | Guessing the internal placeholder used for math/video | Smuggling markup past the sanitizer | **Blocked.** Placeholders are random per render, and only swapped inside text, never attributes |
| 6 | Another site loads the editor in an invisible frame and tricks you into clicking | You delete or publish something unintended | **Fixed.** The editor refuses to run when framed |
| 7 | A script on your site calls the app's own GitHub function to push to another repo | Damage beyond your blog | **Fixed.** The token can only be used for your own `<username>.github.io` repo. `..`, encoded dots, lookalike repo names and other endpoints are refused before any request is made |
| 8 | Reading the token out of the app | Account access | **Blocked.** No function returns the token; the object is frozen; it's never stored in readable form |
| 9 | Stealing the saved ciphertext and guessing the passphrase offline | Account access | **Hardened.** Passphrase must be 12+ characters; 600,000 key-stretching rounds. A weak passphrase is still the weak point |
| 10 | Creating a page named like one of your own files (`simulation-lab`) | Silently overwrites your page | **Fixed.** Prologue won't overwrite a file it didn't create |
| 11 | `id="..."` or `name="..."` in a post taking over the editor's buttons | Editor behaves wrongly | **Fixed.** These values are prefixed, so they can't collide |
| 12 | Disguised file (`evil.png` that is really HTML), or SVG with script | Hostile file in your repo | **Fixed.** First bytes are checked; SVG isn't accepted |
| 13 | Control characters in a title | RSS feed becomes invalid; readers reject it | **Fixed.** Illegal XML characters are removed |
| 14 | Giant post, thousands of formulas, huge code block | Editor freezes; post too big for GitHub to return | **Fixed.** Size and count limits, with clear messages |
| 15 | Hand-edited or tampered `manifest.json` in the repo | Injection through titles/slugs, path tricks | **Blocked.** Everything read from the repo is checked; bad entries are dropped with a notice |
| 16 | Vendored library files swapped | Malicious code | **Detectable.** `vendor/SHA256SUMS` lets you verify every file |

## Risks that remain (I can't remove these)

- **Comments (giscus).** If you turn comments on, giscus.app's script runs on your post pages, on the same
  web address as the editor. It can't read your token, but if giscus were ever compromised it could read
  what's in local storage (only your username and the *encrypted* token) and, if the editor is open in
  another tab, drive its buttons. Leaving comments off removes this entirely; signing out when you're done
  limits it.
- **YouTube.** When a visitor plays a video, YouTube sees them (the privacy-enhanced domain reduces cookies,
  it doesn't remove it). I couldn't test real playback from this environment; the player URL and the
  policies follow YouTube's documented embed format.
- **Out-of-date libraries.** The vendored libraries don't update themselves. A future security bug in
  DOMPurify, KaTeX, highlight.js or marked would stay until you replace the file. The Content-Security-Policy
  is the backstop. Check the releases now and then (see `vendor/README.md`).
- **Things outside the app:** a malicious browser extension, malware on your computer, a hijacked GitHub
  account, or a phishing site that asks you to paste your token. Open Prologue from a bookmark, and use a
  token limited to one repo with a short expiry.
- **Limits of a meta-tag policy.** GitHub Pages can't send security headers, so the policies are set in
  the page itself. That works for what's listed here, but can't set `frame-ancestors` (hence the
  frame check in code).

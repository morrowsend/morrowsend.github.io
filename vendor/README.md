# Vendored libraries

These are copied into the repo as plain files (no CDN, no install step) so the
site cannot break because a third-party host disappears. Licenses are in `licenses/`.

| File | Library | Version | License |
|---|---|---|---|
| `marked.js` | marked | 12.0.2 | MIT |
| `purify.js` | DOMPurify | 3.4.17 | Apache-2.0 or MPL-2.0 |
| `highlight/` | highlight.js (ES build, selected languages) | 11.11.2 | BSD-3-Clause |
| `katex/` | KaTeX (ES module, CSS, woff2 fonts only) | 0.16.47 | MIT |

To update one, replace the file(s) with the new release's equivalent. Nothing else changes.

## Verifying the files

`SHA256SUMS` lists the checksum of every vendored file as it was when this version was assembled
(downloaded from the official npm releases of each library). To check that nothing has been changed,
run `sha256sum -c vendor/SHA256SUMS` from the repo root (or compare any file's hash by hand).
Vendored files don't update themselves, so check each library's release notes now and then,
especially DOMPurify (security fixes land there). Replace the files, then regenerate `SHA256SUMS`.

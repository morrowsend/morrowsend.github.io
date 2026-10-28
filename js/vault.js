// vault.js
// Holds the GitHub token. Design rules:
//
//  * By default the token lives ONLY in a private variable inside this module's
//    closure. It is never written to localStorage, sessionStorage, a cookie, the
//    DOM, or the URL, and no other module can read it (they can only ask this
//    module to send a request to api.github.com). Reloading or closing the tab forgets it.
//  * Optional "remember on this device": the token is encrypted with a passphrase
//    you choose (AES-256-GCM, key derived with PBKDF2-SHA256, 600,000 rounds) and
//    only the ciphertext is stored. Anything that reads localStorage gets
//    unusable bytes without the passphrase. The passphrase is never stored.

let token = null; // module-private
let scope = null; // which API paths this token may be used for (set at sign-in)

const VAULT_KEY = "pl_vault";
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, salt, usage) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

export const vault = {
  /**
   * Give the vault a token for this tab session. `owner` limits what the token may be used for:
   * only your own `<owner>.github.io` repo (plus reading who you are and creating that one repo).
   * So even code that got hold of fetchGitHub() could not use your token on any other repository.
   */
  set(t, owner) {
    token = String(t).trim();
    scope = String(owner).toLowerCase();
  },
  has() { return token !== null; },
  clear() { token = null; scope = null; },

  /**
   * The only way to use the token: send a request to api.github.com with it attached.
   * The token itself is never returned or passed to the caller, so code that imports this
   * module can ask for GitHub requests but cannot read the secret or send it elsewhere.
   * `path` must start with "/" (it is always appended to https://api.github.com).
   */
  fetchGitHub(path, init = {}) {
    if (token === null) return Promise.reject(new Error("Not signed in."));
    let url;
    try {
      // Parse first: this resolves "..", "%2e%2e" and "//host" tricks before we judge the path.
      url = new URL(String(path), "https://api.github.com");
    } catch { return Promise.reject(new Error("Invalid API path.")); }
    if (!String(path).startsWith("/") || url.origin !== "https://api.github.com") return Promise.reject(new Error("Invalid API path."));
    const p = url.pathname.toLowerCase();
    const repo = `/repos/${scope}/${scope}.github.io`;
    const allowed = p === "/user" || p === "/user/repos" || p === repo || p.startsWith(`${repo}/`);
    if (!allowed) return Promise.reject(new Error("This app may only touch your own site repository."));
    return fetch(url.href, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error", // never follow a redirect to another host with the token attached
    });
  },

  hasSaved() {
    try { return !!localStorage.getItem(VAULT_KEY); } catch { return false; }
  },

  async save(passphrase) {
    if (token === null) throw new Error("Not signed in.");
    if (!passphrase || passphrase.length < 12) throw new Error("Use a passphrase of at least 12 characters (four random words works well).");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt, "encrypt");
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(token));
    localStorage.setItem(VAULT_KEY, JSON.stringify({ v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
  },

  async unlock(passphrase, owner) {
    let blob;
    try { blob = JSON.parse(localStorage.getItem(VAULT_KEY)); } catch { blob = null; }
    if (!blob || blob.v !== 1) throw new Error("No saved sign-in on this device.");
    try {
      const key = await deriveKey(passphrase, unb64(blob.salt), "decrypt");
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.ct));
      token = dec.decode(pt);
      scope = String(owner).toLowerCase();
    } catch {
      throw new Error("That passphrase didn't unlock the saved sign-in.");
    }
  },

  forgetSaved() {
    try { localStorage.removeItem(VAULT_KEY); } catch { /* ignore */ }
  },
};

Object.freeze(vault); // nothing can replace set()/save()/fetchGitHub() with a version that leaks the token

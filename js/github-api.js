// github-api.js
// Minimal wrapper around the GitHub REST API using plain fetch().
// No SDK, no dependency. This file never sees the token: requests go through
// vault.fetchGitHub(), which attaches it internally (see vault.js).

import { vault } from "./vault.js";
import { isOwner } from "./validate.js";

const API = "https://api.github.com";
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

function checkRepo(owner, repo) {
  if (!isOwner(owner) || !REPO_RE.test(repo)) throw new Error("Invalid repository name.");
}

// Build /repos/<owner>/<repo>/contents/<path>, refusing anything that could escape it.
function contentsPath(owner, repo, path) {
  checkRepo(owner, repo);
  const segs = String(path).split("/");
  if (segs.some((s) => s === "" || s === "." || s === ".." || /[\\\0]/.test(s))) throw new Error("Invalid file path.");
  return `/repos/${owner}/${repo}/contents/${segs.map(encodeURIComponent).join("/")}`;
}

export class GitHubAPI {
  async _request(path, options = {}) {
    const res = await vault.fetchGitHub(path, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message; } catch { /* ignore */ }
      const err = new Error(`GitHub ${res.status}: ${detail || res.statusText}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // Who am I? Also doubles as a token-validity check.
  getUser() { return this._request("/user"); }

  repoExists(owner, repo) {
    checkRepo(owner, repo);
    return this._request(`/repos/${owner}/${repo}`).then(
      () => true,
      (err) => { if (err.status === 404) return false; throw err; }
    );
  }

  createUserSiteRepo(owner) {
    // Must be named exactly "<owner>.github.io" for GitHub Pages to serve it at the root.
    if (!isOwner(owner)) throw new Error("Invalid username.");
    return this._request("/user/repos", {
      method: "POST",
      body: JSON.stringify({ name: `${owner}.github.io`, description: "My static blog", auto_init: true }),
    });
  }

  // Enable GitHub Pages to build from the given branch root.
  async enablePages(owner, repo, branch = "main") {
    checkRepo(owner, repo);
    try {
      await this._request(`/repos/${owner}/${repo}/pages`, {
        method: "POST",
        body: JSON.stringify({ source: { branch, path: "/" } }),
      });
    } catch (err) {
      if (err.status !== 409) throw err; // 409 = already enabled, fine
    }
  }

  async getDefaultBranch(owner, repo) {
    checkRepo(owner, repo);
    return (await this._request(`/repos/${owner}/${repo}`)).default_branch;
  }

  // Returns { content, sha } or null if the file doesn't exist yet.
  async getFile(owner, repo, path) {
    try {
      const data = await this._request(contentsPath(owner, repo, path));
      return { content: b64DecodeUtf8(data.content), sha: data.sha };
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  // Creates or updates a file. Pass the previous sha (from getFile) to update.
  putFile(owner, repo, path, content, message, sha) {
    return this._request(contentsPath(owner, repo, path), {
      method: "PUT",
      body: JSON.stringify({ message, content: b64EncodeUtf8(content), ...(sha ? { sha } : {}) }),
    });
  }

  // Create-or-update: looks up the current sha so overwriting an existing file works.
  async upsertFile(owner, repo, path, content, message) {
    const existing = await this.getFile(owner, repo, path);
    return this.putFile(owner, repo, path, content, message, existing?.sha);
  }

  // Like putFile, but `base64Content` is already base64 (images/PDFs), so the
  // UTF-8 text encoding putFile() uses doesn't corrupt the bytes.
  putFileBase64(owner, repo, path, base64Content, message, sha) {
    return this._request(contentsPath(owner, repo, path), {
      method: "PUT",
      body: JSON.stringify({ message, content: base64Content, ...(sha ? { sha } : {}) }),
    });
  }

  deleteFile(owner, repo, path, sha, message) {
    return this._request(contentsPath(owner, repo, path), {
      method: "DELETE",
      body: JSON.stringify({ message, sha }),
    });
  }
}

function b64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64DecodeUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

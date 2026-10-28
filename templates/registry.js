// registry.js
// Add a new theme by dropping a file in themes/ (copy an existing one as a
// starting point) and adding it to this list. No build step or config elsewhere.

import * as editorial from "./themes/editorial.js";
import * as sidebar from "./themes/sidebar.js";
import * as grid from "./themes/grid.js";
import * as minimal from "./themes/minimal.js";
import { CODE_CSS } from "./shared.js";

// Every theme gets the shared code-highlighting and math styles appended to its own CSS.
const withShared = (t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
  preview: t.preview,
  css: t.css + CODE_CSS,
  renderIndex: t.renderIndex,
  renderPost: t.renderPost,
  renderPage: t.renderPage,
});

export const THEMES = [editorial, sidebar, grid, minimal].map(withShared);

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export { renderFeed } from "./shared.js";

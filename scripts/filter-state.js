const MODULE_ID = "d35e-compendium-browser";

// Foundry's legacy Application renderer replaces the browser template whenever
// a search/filter/page change occurs. Native <details> elements therefore lose
// their user-controlled open/closed state and fall back to the template's
// defaults. Keep that purely visual state outside the rendered template.
//
// UX rule for v0.1.6:
// - every filter group starts CLOSED whenever the browser is opened;
// - every filter group starts CLOSED whenever the user changes category;
// - while staying in the same category, the user's open/closed choices survive
//   result re-renders caused by search, checkbox filters and pagination.
const filterUiState = new Map();
const initializedShells = new WeakSet();
let observer;
let scanQueued = false;
let browserVisible = false;
let activeCategory = null;

function stateFor(category) {
  let state = filterUiState.get(category);
  if (!state) {
    state = { groups: new Map(), scrollTop: 0 };
    filterUiState.set(category, state);
  }
  return state;
}

function currentCategory(shell) {
  return shell.querySelector(".d35e-acb-tab.active[data-category]")?.dataset?.category ?? "items";
}

function filterKey(details) {
  return details.dataset?.filterKey
    ?? details.querySelector('input[data-filter-key]')?.dataset?.filterKey
    ?? null;
}

function resetVisualState(category) {
  const state = stateFor(category);
  state.groups.clear();
  state.scrollTop = 0;
  return state;
}

function installOnShell(shell, { reset = false } = {}) {
  if (!(shell instanceof HTMLElement) || initializedShells.has(shell)) return;
  initializedShells.add(shell);

  const category = currentCategory(shell);
  const state = reset ? resetVisualState(category) : stateFor(category);
  const panel = shell.querySelector(".d35e-acb-filters");

  // Restore remembered group state before attaching toggle listeners so our
  // own restoration cannot be mistaken for a new user preference. A group
  // without remembered state always starts closed, regardless of the template
  // default or whether it currently contains a selected checkbox.
  shell.querySelectorAll(".d35e-acb-filter-group").forEach(details => {
    const key = filterKey(details);
    if (!key) return;

    if (reset || !state.groups.has(key)) {
      details.open = false;
      state.groups.set(key, false);
    } else {
      details.open = state.groups.get(key) === true;
    }

    details.addEventListener("toggle", event => {
      const current = event.currentTarget;
      const currentKey = filterKey(current);
      if (!currentKey) return;
      stateFor(currentCategory(shell)).groups.set(currentKey, current.open);
    });
  });

  if (panel) {
    requestAnimationFrame(() => {
      if (panel.isConnected) panel.scrollTop = reset ? 0 : (state.scrollTop ?? 0);
    });

    panel.addEventListener("scroll", () => {
      stateFor(currentCategory(shell)).scrollTop = panel.scrollTop;
    }, { passive: true });
  }
}

function scan() {
  scanQueued = false;
  const shells = [...document.querySelectorAll(".d35e-acb-shell")];

  // When the browser window is actually closed, remember that the next shell
  // represents a fresh opening. Ordinary Foundry re-renders replace the shell
  // in the same mutation batch, so they do not trigger this reset.
  if (!shells.length) {
    browserVisible = false;
    activeCategory = null;
    return;
  }

  const freshOpen = !browserVisible;

  for (const shell of shells) {
    const category = currentCategory(shell);
    const categoryChanged = !freshOpen && activeCategory != null && category !== activeCategory;
    installOnShell(shell, { reset: freshOpen || categoryChanged });
    activeCategory = category;
  }

  browserVisible = true;
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  queueMicrotask(scan);
}

function startObserver() {
  scan();
  if (observer || !document.body) return;
  observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
}

Hooks.once("ready", startObserver);

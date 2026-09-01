const MODULE_ID = "d35e-compendium-browser";

// Foundry's legacy Application renderer replaces the browser template whenever
// a search/filter/page change occurs. Native <details> elements therefore lose
// their user-controlled open/closed state and fall back to the template's
// defaults. Keep that purely visual state outside the rendered template.
const filterUiState = new Map();
const initializedShells = new WeakSet();
let observer;
let scanQueued = false;

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

function installOnShell(shell) {
  if (!(shell instanceof HTMLElement) || initializedShells.has(shell)) return;
  initializedShells.add(shell);

  const category = currentCategory(shell);
  const state = stateFor(category);
  const panel = shell.querySelector(".d35e-acb-filters");

  // Restore remembered group state before attaching toggle listeners so our
  // own restoration cannot be mistaken for a new user preference.
  shell.querySelectorAll(".d35e-acb-filter-group").forEach(details => {
    const key = filterKey(details);
    if (!key) return;
    if (state.groups.has(key)) details.open = state.groups.get(key);

    details.addEventListener("toggle", event => {
      const current = event.currentTarget;
      const currentKey = filterKey(current);
      if (!currentKey) return;
      stateFor(currentCategory(shell)).groups.set(currentKey, current.open);
    });
  });

  if (panel) {
    requestAnimationFrame(() => {
      if (panel.isConnected) panel.scrollTop = state.scrollTop ?? 0;
    });

    panel.addEventListener("scroll", () => {
      stateFor(currentCategory(shell)).scrollTop = panel.scrollTop;
    }, { passive: true });
  }
}

function scan() {
  scanQueued = false;
  document.querySelectorAll(".d35e-acb-shell").forEach(installOnShell);
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

const MODULE_ID = "d35e-compendium-browser";

// Foundry's legacy Application renderer replaces the browser template whenever
// a search/filter/page change occurs. Native <details> elements therefore lose
// their user-controlled open/closed state and scroll positions unless we keep
// that visual state outside the rendered template.
//
// UX rules:
// - every filter group starts CLOSED whenever the browser is opened;
// - every filter group starts CLOSED whenever the user changes category;
// - while staying in the same category, the user's open/closed choices survive
//   result re-renders caused by search, checkbox filters and pagination;
// - both the main filter column scroll and the scroll inside each individual
//   filter group survive checkbox-triggered re-renders.
const filterUiState = new Map();
const initializedShells = new WeakSet();
let observer;
let scanQueued = false;
let browserVisible = false;
let activeCategory = null;

function stateFor(category) {
  let state = filterUiState.get(category);
  if (!state) {
    state = {
      groups: new Map(),
      scrollTop: 0,
      optionScrolls: new Map()
    };
    filterUiState.set(category, state);
  }
  state.groups ??= new Map();
  state.optionScrolls ??= new Map();
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
  state.optionScrolls.clear();
  state.scrollTop = 0;
  return state;
}

function rememberCurrentScrollPositions(shell) {
  if (!(shell instanceof HTMLElement)) return;
  const category = currentCategory(shell);
  const state = stateFor(category);
  const panel = shell.querySelector(".d35e-acb-filters");
  if (panel) state.scrollTop = panel.scrollTop;

  shell.querySelectorAll(".d35e-acb-filter-group").forEach(details => {
    const key = filterKey(details);
    const options = details.querySelector(".d35e-acb-filter-options");
    if (!key || !options) return;
    state.optionScrolls.set(key, options.scrollTop);
  });
}

function installOnShell(shell, { reset = false } = {}) {
  if (!(shell instanceof HTMLElement) || initializedShells.has(shell)) return;
  initializedShells.add(shell);

  const category = currentCategory(shell);
  const state = reset ? resetVisualState(category) : stateFor(category);
  const panel = shell.querySelector(".d35e-acb-filters");

  // Capture scroll positions before the browser's checkbox listener triggers a
  // render. Capture phase is intentional: browser.js handles checkbox changes
  // on the input itself, so this runs first and records the exact viewport the
  // user was looking at.
  shell.addEventListener("change", event => {
    if (!event.target?.matches?.('.d35e-acb-filter-option input[type="checkbox"]')) return;
    rememberCurrentScrollPositions(shell);
  }, true);

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

    const options = details.querySelector(".d35e-acb-filter-options");
    if (options) {
      requestAnimationFrame(() => {
        if (!options.isConnected) return;
        options.scrollTop = reset ? 0 : (state.optionScrolls.get(key) ?? 0);
      });

      options.addEventListener("scroll", () => {
        stateFor(currentCategory(shell)).optionScrolls.set(key, options.scrollTop);
      }, { passive: true });
    }
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

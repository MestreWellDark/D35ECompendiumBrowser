const MODULE_ID = "d35e-compendium-browser";
const TEMPLATE = `modules/${MODULE_ID}/templates/browser.hbs`;
const PAGE_SIZE = 100;

const CATEGORIES = [
  { id: "items", label: "D35EACB.Category.Items", icon: "fas fa-sack-dollar", documentName: "Item" },
  { id: "spells", label: "D35EACB.Category.Spells", icon: "fas fa-wand-magic-sparkles", documentName: "Item" },
  { id: "feats", label: "D35EACB.Category.Feats", icon: "fas fa-award", documentName: "Item" },
  { id: "abilities", label: "D35EACB.Category.Abilities", icon: "fas fa-bolt", documentName: "Item" },
  { id: "classes", label: "D35EACB.Category.Classes", icon: "fas fa-user-graduate", documentName: "Item" },
  { id: "races", label: "D35EACB.Category.Races", icon: "fas fa-people-group", documentName: "Item" },
  { id: "enhancements", label: "D35EACB.Category.Enhancements", icon: "fas fa-gem", documentName: "Item" },
  { id: "buffs", label: "D35EACB.Category.Buffs", icon: "fas fa-shield-heart", documentName: "Item" },
  { id: "bestiary", label: "D35EACB.Category.Bestiary", icon: "fas fa-dragon", documentName: "Actor" }
];

const ITEM_INDEX_FIELDS = [
  "name", "type", "img",
  "system.uniqueId", "system.source", "system.price",
  "system.weaponType", "system.weaponSubtype", "system.properties",
  "system.equipmentType", "system.equipmentSubtype", "system.slot",
  "system.consumableType", "system.subType",
  "system.level", "system.school", "system.subschool", "system.types", "system.isPower",
  "system.learnedAt.class", "system.learnedAt.domain", "system.learnedAt.subDomain", "system.learnedAt.bloodline",
  "system.featType", "system.abilityType", "system.tags", "system.associations.classes", "system.assocations.classes",
  "system.classType", "system.hd", "system.bab", "system.maxLevel", "system.spellcastingType",
  "system.spellcastingAbility", "system.spellcastingSpontaneus", "system.creatureType",
  "system.la", "system.subTypes", "system.enhancementType", "system.enh", "system.allowedTypes",
  "system.snip", "system.shortDescription"
];

const ACTOR_INDEX_FIELDS = [
  "name", "type", "img",
  "system.details.cr", "system.details.totalCr", "system.details.type", "system.details.environment",
  "system.attributes.creatureType", "system.attributes.hd.total", "system.traits.size", "system.traits.actualSize"
];

function i18n(key) {
  return game.i18n.localize(key);
}

function resolveLabel(value) {
  if (value == null) return "";
  const text = String(value);
  if (/^(D35E|D35EACB)\./.test(text)) {
    const localized = game.i18n.localize(text);
    return localized === text ? text.split(".").pop() : localized;
  }
  return text;
}

function gp(path, object) {
  return foundry.utils.getProperty(object, path);
}

function normalizeScalar(value) {
  if (value == null || value === "") return [];
  if (typeof value === "boolean") return [value ? "true" : "false"];
  if (typeof value === "number") return [String(value)];
  return [String(value).trim()].filter(Boolean);
}

function normalizePairs(value) {
  if (!Array.isArray(value)) return normalizeScalar(value);
  const out = [];
  for (const part of value) {
    if (Array.isArray(part)) {
      if (part[0] != null && String(part[0]).trim()) out.push(String(part[0]).trim());
    } else if (part && typeof part === "object") {
      const v = part.name ?? part.label ?? part.key ?? part.value;
      if (v != null && String(v).trim()) out.push(String(v).trim());
    } else if (part != null && String(part).trim()) {
      out.push(String(part).trim());
    }
  }
  return [...new Set(out)];
}

function normalizeDelimited(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return normalizePairs(value);
  return String(value)
    .split(/[,;|]/g)
    .map(v => v.trim())
    .filter(Boolean);
}

function normalizeProperties(value) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return normalizePairs(value);
  return Object.entries(value).filter(([, enabled]) => !!enabled).map(([key]) => key);
}

function normText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function compareNatural(a, b) {
  const an = Number(a.value);
  const bn = Number(b.value);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return a.label.localeCompare(b.label, game.i18n.lang, { numeric: true, sensitivity: "base" });
}

function documentTypeLabel(type) {
  const keys = {
    weapon: "D35E.ItemTypeWeapon",
    equipment: "D35E.ItemTypeEquipment",
    consumable: "D35E.ItemTypeConsumable",
    loot: "D35E.Misc",
    valuable: "D35E.Misc",
    class: "D35E.Class",
    spell: "D35E.Spell",
    feat: "D35E.Feat",
    buff: "D35E.Buff",
    aura: "D35E.Aura",
    race: "D35E.Race",
    enhancement: "D35E.Enhancement",
    material: "D35E.Material",
    attack: "D35E.Attack",
    "full-attack": "D35E.FullAttack",
    npc: "D35E.NPC",
    character: "D35E.Character",
    trap: "D35E.Trap",
    object: "D35E.Object"
  };
  const key = keys[type];
  if (!key) return String(type ?? "-");
  const localized = game.i18n.localize(key);
  return localized === key ? String(type) : localized;
}

function flattenConfig(config, labelsOnly = false) {
  const result = {};
  for (const [key, value] of Object.entries(config ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!labelsOnly && value._label) result[key] = resolveLabel(value._label);
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subKey.startsWith("_")) continue;
        result[subKey] ??= resolveLabel(subValue);
      }
    } else {
      result[key] = resolveLabel(value);
    }
  }
  return result;
}

function categoryMatches(category, item, pack) {
  const type = item.type;
  const featType = gp("system.featType", item);
  const packText = `${pack?.metadata?.id ?? ""} ${pack?.metadata?.label ?? ""}`.toLowerCase();
  switch (category) {
    case "items":
      return ["weapon", "equipment", "consumable", "loot", "valuable", "material"].includes(type);
    case "spells":
      return type === "spell" || type === "card";
    case "feats":
      return type === "feat";
    case "abilities":
      return ["attack", "full-attack", "aura"].includes(type)
        || (type === "feat" && (featType === "classFeat" || featType === "racial" || /abilit|spell.?like|racial.?feature/.test(packText)));
    case "classes":
      return type === "class";
    case "races":
      return type === "race";
    case "enhancements":
      return ["enhancement", "damage-type"].includes(type);
    case "buffs":
      return ["buff", "aura"].includes(type);
    case "bestiary":
      return ["npc", "trap", "object"].includes(type);
    default:
      return false;
  }
}

function configLabel(key, value) {
  const C = CONFIG.D35E ?? {};
  const maps = {
    weaponType: Object.fromEntries(Object.entries(C.weaponTypes ?? {}).map(([k, v]) => [k, resolveLabel(v?._label ?? k)])),
    weaponSubtype: flattenConfig(C.weaponTypes),
    weaponProperties: Object.fromEntries(Object.entries(C.weaponProperties ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    equipmentType: Object.fromEntries(Object.entries(C.equipmentTypes ?? {}).map(([k, v]) => [k, resolveLabel(v?._label ?? k)])),
    equipmentSubtype: flattenConfig(C.equipmentTypes),
    slot: flattenConfig(C.equipmentSlots),
    consumableType: Object.fromEntries(Object.entries(C.consumableTypes ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    miscType: Object.fromEntries(Object.entries(C.lootTypes ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    school: Object.fromEntries(Object.entries(C.spellSchools ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    featType: Object.fromEntries(Object.entries(C.featTypes ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    classType: Object.fromEntries(Object.entries(C.classTypes ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    bab: Object.fromEntries(Object.entries(C.classBAB ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    spellcastingType: Object.fromEntries(Object.entries(C.spellcastingType ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    creatureType: Object.fromEntries(Object.entries(C.creatureTypes ?? {}).map(([k,v]) => [k, resolveLabel(v)])),
    enhancementType: Object.fromEntries(Object.entries(C.enhancementType ?? {}).map(([k,v]) => [k, resolveLabel(v)]))
  };
  if (key === "castingAbility") {
    const ability = C.abilities?.[value] ?? C.abilityAbbreviations?.[value];
    return resolveLabel(ability ?? String(value).toUpperCase());
  }
  if (key === "power") return value === "true" ? "Sim" : "Não";
  if (key === "hitDie") return `d${value}`;
  if (key === "hd") return `${value} DV`;
  if (key === "cr") return value;
  if (key === "la") return Number(value) > 0 ? `+${value}` : value;
  return maps[key]?.[value] ?? String(value);
}

function buildFacets(item, pack) {
  const system = item.system ?? {};
  const learned = system.learnedAt ?? {};
  const actorCreatureType = gp("system.attributes.creatureType", item) ?? gp("system.details.type", item);
  const associations = gp("system.associations.classes", item) ?? gp("system.assocations.classes", item);
  const facets = {
    source: [pack.collection],
    package: [pack.metadata?.packageName ?? pack.metadata?.package ?? pack.metadata?.system ?? "world"],
    documentType: normalizeScalar(item.type),
    weaponType: normalizeScalar(system.weaponType),
    weaponSubtype: normalizeScalar(system.weaponSubtype),
    weaponProperties: normalizeProperties(system.properties),
    equipmentType: normalizeScalar(system.equipmentType),
    equipmentSubtype: normalizeScalar(system.equipmentSubtype),
    slot: normalizeScalar(system.slot),
    consumableType: normalizeScalar(system.consumableType),
    miscType: normalizeScalar(system.subType),
    spellLevel: normalizeScalar(system.level),
    school: normalizeScalar(system.school),
    subschool: normalizeScalar(system.subschool),
    spellClass: normalizePairs(learned.class),
    domain: normalizePairs(learned.domain),
    descriptors: normalizeDelimited(system.types),
    power: normalizeScalar(!!system.isPower),
    featType: normalizeScalar(system.featType),
    abilityType: normalizeScalar(system.abilityType),
    tags: normalizePairs(system.tags),
    associatedClass: normalizePairs(associations),
    classType: normalizeScalar(system.classType),
    hitDie: normalizeScalar(system.hd),
    bab: normalizeScalar(system.bab),
    spellcastingType: normalizeScalar(system.spellcastingType),
    castingAbility: normalizeScalar(system.spellcastingAbility),
    maxLevel: normalizeScalar(system.maxLevel),
    creatureType: normalizeScalar(system.creatureType ?? actorCreatureType),
    la: normalizeScalar(system.la),
    subtypes: normalizePairs(system.subTypes),
    enhancementType: normalizeScalar(system.enhancementType),
    enhancementBonus: normalizeScalar(system.enh),
    cr: normalizeScalar(gp("system.details.cr", item) ?? gp("system.details.totalCr", item)),
    environment: normalizeScalar(gp("system.details.environment", item)),
    hd: normalizeScalar(gp("system.attributes.hd.total", item))
  };
  return Object.fromEntries(Object.entries(facets).map(([k, values]) => [k, [...new Set(values.filter(Boolean))]]));
}

function filterDefinitions(category) {
  const global = [
    ["source", "D35EACB.Source"],
    ["package", "D35EACB.Package"],
    ["documentType", "D35EACB.DocumentType"]
  ];
  const byCategory = {
    items: [
      ["weaponType", "D35EACB.WeaponType"], ["weaponSubtype", "D35EACB.WeaponSubtype"],
      ["weaponProperties", "D35EACB.WeaponProperties"], ["equipmentType", "D35EACB.EquipmentType"],
      ["equipmentSubtype", "D35EACB.EquipmentSubtype"], ["slot", "D35EACB.Slot"],
      ["consumableType", "D35EACB.ConsumableType"], ["miscType", "D35EACB.MiscType"]
    ],
    spells: [
      ["spellLevel", "D35EACB.SpellLevel"], ["school", "D35EACB.SpellSchool"],
      ["subschool", "D35EACB.Subschool"], ["spellClass", "D35EACB.SpellClass"],
      ["domain", "D35EACB.Domain"], ["descriptors", "D35EACB.Descriptors"], ["power", "D35EACB.Power"]
    ],
    feats: [
      ["featType", "D35EACB.FeatType"], ["abilityType", "D35EACB.AbilityType"],
      ["tags", "D35EACB.Tags"], ["associatedClass", "D35EACB.AssociatedClass"]
    ],
    abilities: [
      ["featType", "D35EACB.FeatType"], ["abilityType", "D35EACB.AbilityType"],
      ["tags", "D35EACB.Tags"], ["associatedClass", "D35EACB.AssociatedClass"]
    ],
    classes: [
      ["classType", "D35EACB.ClassType"], ["hitDie", "D35EACB.HitDie"], ["bab", "D35EACB.BAB"],
      ["spellcastingType", "D35EACB.Spellcasting"], ["castingAbility", "D35EACB.CastingAbility"],
      ["maxLevel", "D35EACB.MaxLevel"], ["creatureType", "D35EACB.CreatureType"]
    ],
    races: [
      ["creatureType", "D35EACB.CreatureType"], ["la", "D35EACB.LevelAdjustment"], ["subtypes", "D35EACB.Subtypes"]
    ],
    enhancements: [
      ["enhancementType", "D35EACB.EnhancementType"], ["enhancementBonus", "D35EACB.EnhancementBonus"]
    ],
    buffs: [
      ["documentType", "D35EACB.DocumentType"], ["abilityType", "D35EACB.AbilityType"], ["tags", "D35EACB.Tags"]
    ],
    bestiary: [
      ["cr", "D35EACB.CR"], ["creatureType", "D35EACB.CreatureType"], ["environment", "D35EACB.Environment"], ["hd", "D35EACB.HD"]
    ]
  };
  const defs = [...global, ...(byCategory[category] ?? [])];
  const seen = new Set();
  return defs.filter(([key]) => !seen.has(key) && seen.add(key));
}

function summarize(entry) {
  const s = entry.system ?? {};
  switch (entry.category) {
    case "spells": {
      const level = s.level ?? "-";
      const school = configLabel("school", s.school ?? "-");
      return `${i18n("D35EACB.SpellLevel")} ${level} • ${school}`;
    }
    case "feats":
    case "abilities":
      return `${configLabel("featType", s.featType ?? entry.type)}${s.abilityType ? ` • ${s.abilityType}` : ""}`;
    case "classes":
      return `${configLabel("classType", s.classType ?? "-")} • d${s.hd ?? "?"} • BBA ${configLabel("bab", s.bab ?? "-")}`;
    case "races":
      return `${configLabel("creatureType", s.creatureType ?? "-")} • LA ${Number(s.la ?? 0) > 0 ? "+" : ""}${s.la ?? 0}`;
    case "enhancements":
      return `${configLabel("enhancementType", s.enhancementType ?? entry.type)}${s.enh != null ? ` • +${s.enh}` : ""}`;
    case "bestiary": {
      const cr = gp("system.details.cr", entry.raw) ?? gp("system.details.totalCr", entry.raw) ?? "-";
      const type = gp("system.attributes.creatureType", entry.raw) ?? gp("system.details.type", entry.raw) ?? entry.type;
      return `ND ${cr} • ${configLabel("creatureType", type)}`;
    }
    default: {
      if (entry.type === "weapon") return `${configLabel("weaponType", s.weaponType ?? "-")} • ${configLabel("weaponSubtype", s.weaponSubtype ?? "-")}${s.price != null ? ` • ${s.price} gp` : ""}`;
      if (entry.type === "equipment") return `${configLabel("equipmentType", s.equipmentType ?? "-")} • ${configLabel("equipmentSubtype", s.equipmentSubtype ?? "-")}${s.price != null ? ` • ${s.price} gp` : ""}`;
      if (entry.type === "consumable") return `${configLabel("consumableType", s.consumableType ?? entry.type)}${s.price != null ? ` • ${s.price} gp` : ""}`;
      return documentTypeLabel(entry.type);
    }
  }
}

class D35EAdvancedCompendiumBrowser extends Application {
  constructor(options = {}) {
    super(options);
    this.category = "items";
    this.search = "";
    this.page = 1;
    this.filters = {};
    this.cache = new Map();
    this.loading = new Map();
    this._restoreSearchFocus = false;
    this._dragInProgress = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "d35e-advanced-compendium-browser",
      title: i18n("D35EACB.Title"),
      template: TEMPLATE,
      width: Math.min(1240, Math.max(900, window.innerWidth - 90)),
      height: Math.min(850, Math.max(620, window.innerHeight - 90)),
      resizable: true,
      classes: ["d35e-acb-window"]
    });
  }

  get title() {
    return i18n("D35EACB.Title");
  }

  openCategory(category, { reset = true, filters = null, search = null } = {}) {
    if (!CATEGORIES.some(c => c.id === category)) category = "items";
    if (category !== this.category || reset) {
      this.category = category;
      this.search = search ?? "";
      this.filters = {};
      this.page = 1;
    }

    if (filters && typeof filters === "object") {
      this.filters = {};
      for (const [key, values] of Object.entries(filters)) {
        const normalized = Array.isArray(values) ? values : [values];
        const clean = normalized.filter(v => v != null && String(v) !== "").map(v => String(v));
        if (clean.length) this.filters[key] = new Set(clean);
      }
      this.page = 1;
    }
    if (search != null) this.search = String(search);

    this.render(true);
    return this;
  }

  async getData() {
    const cache = this.cache.get(this.category);
    if (!cache) {
      this._queueLoad(this.category);
      return this._viewData(null, true);
    }
    return this._viewData(cache, false);
  }

  _queueLoad(category) {
    if (this.loading.has(category)) return;
    const promise = this._loadCategory(category)
      .then(cache => {
        this.cache.set(category, cache);
        if (this.category === category) this.render(false);
      })
      .catch(err => {
        console.error(`${MODULE_ID} | Failed to load category ${category}`, err);
        ui.notifications.error(`${i18n("D35EACB.Title")}: ${err.message}`);
      })
      .finally(() => this.loading.delete(category));
    this.loading.set(category, promise);
  }

  async _loadCategory(category) {
    const config = CATEGORIES.find(c => c.id === category);
    const entries = [];
    const sourceLabels = {};
    const packageLabels = {};
    const fields = config.documentName === "Actor" ? ACTOR_INDEX_FIELDS : ITEM_INDEX_FIELDS;

    for (const pack of game.packs.values()) {
      if (pack.private && !game.user.isGM) continue;
      const documentName = pack.documentName ?? pack.metadata?.type ?? pack.entity;
      if (documentName !== config.documentName) continue;

      let index;
      try {
        index = await pack.getIndex({ fields });
      } catch (err) {
        console.warn(`${MODULE_ID} | Could not index ${pack.collection}`, err);
        continue;
      }

      const packageId = pack.metadata?.packageName ?? pack.metadata?.package ?? pack.metadata?.system ?? "world";
      const packageTitle = game.modules.get(packageId)?.title ?? (game.system?.id === packageId ? game.system.title : packageId);
      sourceLabels[pack.collection] = `${pack.metadata?.label ?? pack.collection} (${pack.collection})`;
      packageLabels[packageId] = packageTitle || packageId;

      for (const indexed of index) {
        const raw = indexed?.toObject ? indexed.toObject() : indexed;
        if (!raw || !categoryMatches(category, raw, pack)) continue;
        const uuid = raw.uuid ?? `Compendium.${pack.collection}.${raw._id}`;
        const entry = {
          id: raw._id,
          uuid,
          name: raw.name ?? "Unnamed",
          img: raw.img || "icons/svg/item-bag.svg",
          type: raw.type,
          documentName,
          pack: pack.collection,
          packLabel: pack.metadata?.label ?? pack.collection,
          packageId,
          packageLabel: packageLabels[packageId],
          category,
          system: raw.system ?? {},
          raw,
          facets: buildFacets(raw, pack)
        };
        entry.summary = summarize(entry);
        entry.searchText = normText([
          entry.name,
          entry.packLabel,
          entry.packageLabel,
          entry.summary,
          entry.system.source,
          ...Object.values(entry.facets).flat()
        ].join(" "));
        entries.push(entry);
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang, { numeric: true, sensitivity: "base" }));
    return { entries, sourceLabels, packageLabels };
  }

  _viewData(cache, loading) {
    const categories = CATEGORIES.map(c => ({
      ...c,
      label: i18n(c.label),
      active: c.id === this.category,
      countKnown: this.cache.has(c.id),
      count: this.cache.get(c.id)?.entries?.length ?? 0
    }));

    if (loading || !cache) {
      return {
        categories,
        loading: true,
        search: this.search,
        total: 0,
        filters: [],
        results: [],
        hasResults: false,
        showPagination: false
      };
    }

    const filtered = this._applyFilters(cache.entries);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    this.page = Math.min(Math.max(1, this.page), pages);
    const start = (this.page - 1) * PAGE_SIZE;
    const results = filtered.slice(start, start + PAGE_SIZE);

    const filters = this._buildFilterView(cache);
    return {
      categories,
      loading: false,
      search: this.search,
      total: filtered.length,
      filters,
      results,
      hasResults: results.length > 0,
      page: this.page,
      pages,
      canPrevious: this.page > 1,
      canNext: this.page < pages,
      showPagination: filtered.length > PAGE_SIZE
    };
  }

  _applyFilters(entries) {
    const query = normText(this.search.trim());
    return entries.filter(entry => {
      if (query && !entry.searchText.includes(query)) return false;
      for (const [key, selected] of Object.entries(this.filters)) {
        if (!selected?.size) continue;
        const values = entry.facets[key] ?? [];
        if (!values.some(v => selected.has(String(v)))) return false;
      }
      return true;
    });
  }

  _buildFilterView(cache) {
    const defs = filterDefinitions(this.category);
    const baseEntries = cache.entries.filter(entry => {
      const query = normText(this.search.trim());
      return !query || entry.searchText.includes(query);
    });

    return defs.map(([key, labelKey], index) => {
      const counts = new Map();
      for (const entry of baseEntries) {
        for (const value of entry.facets[key] ?? []) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
      }
      const selected = this.filters[key] ?? new Set();
      const options = [...counts.entries()].map(([value, count]) => ({
        value,
        count,
        checked: selected.has(value),
        label: this._facetLabel(key, value, cache)
      })).sort(compareNatural);
      return { key, label: i18n(labelKey), options, open: index < 3 || selected.size > 0 };
    }).filter(f => f.options.length > 0);
  }

  _facetLabel(key, value, cache) {
    if (key === "source") return cache.sourceLabels[value] ?? value;
    if (key === "package") return cache.packageLabels[value] ?? value;
    if (key === "documentType") return documentTypeLabel(value);
    return configLabel(key, value);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html?.nodeType === 1 ? html : html?.[0] ?? html;
    if (!root) return;

    root.querySelectorAll(".d35e-acb-tab").forEach(button => button.addEventListener("click", event => {
      const category = event.currentTarget.dataset.category;
      if (!category || category === this.category) return;
      this.openCategory(category);
    }));

    const search = root.querySelector('input[name="search"]');
    if (search) {
      search.addEventListener("input", event => {
        this.search = event.currentTarget.value;
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this.page = 1;
          this._restoreSearchFocus = true;
          this.render(false);
        }, 350);
      });

      if (this._restoreSearchFocus) {
        this._restoreSearchFocus = false;
        requestAnimationFrame(() => {
          if (!search.isConnected) return;
          search.focus({ preventScroll: true });
          const end = search.value.length;
          try { search.setSelectionRange(end, end); } catch (_) {}
        });
      }
    }

    root.querySelectorAll('.d35e-acb-filter-option input[type="checkbox"]').forEach(input => input.addEventListener("change", event => {
      const key = event.currentTarget.dataset.filterKey;
      const value = event.currentTarget.value;
      this.filters[key] ??= new Set();
      if (event.currentTarget.checked) this.filters[key].add(value);
      else this.filters[key].delete(value);
      if (this.filters[key].size === 0) delete this.filters[key];
      this.page = 1;
      this.render(false);
    }));

    root.querySelector(".d35e-acb-clear")?.addEventListener("click", () => {
      this.search = "";
      this.filters = {};
      this.page = 1;
      this.render(false);
    });

    root.querySelector(".d35e-acb-reload")?.addEventListener("click", () => {
      this.cache.clear();
      this.filters = {};
      this.page = 1;
      this.render(false);
    });

    root.querySelector(".d35e-acb-page-prev")?.addEventListener("click", () => {
      if (this.page > 1) {
        this.page--;
        this.render(false);
      }
    });
    root.querySelector(".d35e-acb-page-next")?.addEventListener("click", () => {
      this.page++;
      this.render(false);
    });

    const openEntry = async row => {
      const uuid = row?.dataset?.uuid;
      if (!uuid) return;
      const doc = await fromUuid(uuid);
      if (doc?.sheet) doc.sheet.render(true);
    };

    root.querySelectorAll(".d35e-acb-entry").forEach(row => {
      row.addEventListener("click", async event => {
        if (this._dragInProgress) return;
        event.preventDefault();
        await openEntry(event.currentTarget);
      });

      row.addEventListener("keydown", async event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        await openEntry(event.currentTarget);
      });

      row.addEventListener("dragstart", event => {
        this._dragInProgress = true;
        const uuid = event.currentTarget.dataset.uuid;
        const type = event.currentTarget.dataset.documentName;
        event.dataTransfer.setData("text/plain", JSON.stringify({ type, uuid }));
      });

      row.addEventListener("dragend", () => {
        setTimeout(() => { this._dragInProgress = false; }, 0);
      });
    });
  }
}

const D35E_DIRECT_PACK_ROUTES = new Map([
  ["D35E.classes", { category: "classes" }],
  ["D35E.minion-classes", { category: "classes" }],
  ["D35E.racialfeatures", { category: "races" }],
  ["D35E.feats", { category: "feats", filters: { featType: ["feat"] } }],
  ["D35E.spell-schools-domains", { category: "feats", filters: { featType: ["spellSpecialization"] } }],
  ["D35E.class-abilities", { category: "abilities" }],
  ["D35E.racial-abilities", { category: "abilities" }],
  ["D35E.natural-attacks", { category: "abilities" }],
  ["D35E.spelllike", { category: "abilities" }],
  ["D35E.spells", { category: "spells" }],
  ["D35E.powers", { category: "spells" }],
  ["D35E.commonbuffs", { category: "buffs", filters: { documentType: ["buff"] } }],
  ["D35E.item-buffs", { category: "buffs", filters: { documentType: ["buff"] } }],
  ["D35E.common-auras", { category: "buffs", filters: { documentType: ["aura"] } }],
  ["D35E.items", { category: "items" }],
  ["D35E.armors-and-shields", { category: "items" }],
  ["D35E.weapons-and-ammo", { category: "items" }],
  ["D35E.magicitems", { category: "items" }],
  ["D35E.materials", { category: "items", filters: { documentType: ["material"] } }],
  ["D35E.enhancements", { category: "enhancements" }],
  ["D35E.damage-types", { category: "enhancements" }]
]);

function nativeRouteForPack(pack) {
  if (!pack) return null;
  pack = String(pack);

  if (pack.startsWith("inline:")) {
    const parts = pack.split(":");
    const entityType = parts[1] ?? "";
    const type = parts[2] ?? "";
    const subtype = parts[3] ?? "-";

    if (entityType === "items") {
      const documentTypes = type.split(",").map(v => v.trim()).filter(Boolean);
      const filters = {};
      if (documentTypes.length) filters.documentType = documentTypes;
      if (subtype && subtype !== "-" && documentTypes.includes("loot")) filters.miscType = [subtype];
      return { category: "items", filters };
    }

    if (entityType === "feats") {
      const filters = { documentType: ["feat"] };
      if (subtype && subtype !== "-") filters.featType = [subtype];
      return { category: "feats", filters };
    }

    if (entityType === "enhancements") return { category: "enhancements" };
    if (entityType === "buffs") return { category: "buffs" };
    if (entityType === "spells") return { category: "spells" };
  }

  if (pack.startsWith("browser:")) {
    const entityType = pack.split(":")[1] ?? "";
    if (entityType === "spells") return { category: "spells" };
    if (entityType === "buffs") return { category: "buffs", filters: { documentType: ["buff"] } };
    if (entityType === "feats") return { category: "feats", filters: { featType: ["feat"] } };
    if (entityType === "items") return { category: "items" };
    if (entityType === "enhancements") return { category: "enhancements" };
  }

  return D35E_DIRECT_PACK_ROUTES.get(pack) ?? null;
}

function openNativeRoute(route) {
  if (!route) return false;
  getBrowser().openCategory(route.category, {
    reset: true,
    filters: route.filters ?? null,
    search: route.search ?? null
  });
  return true;
}

function interceptNativeCompendiumLink(event) {
  if (game.system.id !== "D35E") return;
  if (event.button != null && event.button !== 0) return;
  const link = event.target?.closest?.(".open-compendium-pack");
  if (!link) return;
  const pack = link.dataset?.pack ?? link.getAttribute?.("data-pack");
  const route = nativeRouteForPack(pack);
  if (!route) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  openNativeRoute(route);
}

function drawerEntityTypeForLink(link) {
  const app = link?.closest?.(".app, .window-app, .application");
  const appId = app?.dataset?.appid ?? app?.dataset?.appId ?? app?.id?.replace(/^app-/, "");
  if (appId) {
    const direct = sessionStorage.getItem(`D35E-last-ent-type-${appId}`);
    if (direct) return direct;
  }

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith("D35E-opened-") || sessionStorage.getItem(key) !== "true") continue;
    const suffix = key.slice("D35E-opened-".length);
    const entityType = sessionStorage.getItem(`D35E-last-ent-type-${suffix}`);
    if (entityType) return entityType;
  }
  return null;
}

function interceptNativeOpenBrowser(event) {
  if (game.system.id !== "D35E") return;
  if (event.button != null && event.button !== 0) return;
  const link = event.target?.closest?.(".open-compendium-browser");
  if (!link) return;

  const entityType = drawerEntityTypeForLink(link) ?? "items";
  const route = {
    items: { category: "items" },
    feats: { category: "feats", filters: { featType: ["feat"] } },
    spells: { category: "spells" },
    buffs: { category: "buffs", filters: { documentType: ["buff"] } },
    enhancements: { category: "enhancements" }
  }[entityType];
  if (!route) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  openNativeRoute(route);
}

let browser;

function getBrowser() {
  browser ??= new D35EAdvancedCompendiumBrowser();
  return browser;
}

function unwrapHtml(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  if (html?.element?.[0] instanceof HTMLElement) return html.element[0];
  return null;
}

function isCompendiumSidebar(app, html) {
  const root = unwrapHtml(html);
  const appId = String(app?.options?.id ?? app?.id ?? app?.tabName ?? app?.tab ?? "").toLowerCase();
  const cls = String(app?.constructor?.name ?? "").toLowerCase();
  if (appId.includes("compendium") || cls.includes("compendiumdirectory")) return true;
  return !!root?.matches?.('#compendium, [data-tab="compendium"], .compendium-sidebar, .compendium.directory')
    || !!root?.querySelector?.('#compendium, [data-tab="compendium"], .compendium-sidebar, .compendium.directory');
}

function findCompendiumRoot(scope = document) {
  const candidates = [
    '#compendium',
    '#sidebar [data-tab="compendium"]',
    '#sidebar .sidebar-tab[data-tab="compendium"]',
    '#sidebar .compendium-sidebar',
    '#sidebar .compendium.directory',
    '[data-tab="compendium"].sidebar-tab'
  ];
  for (const selector of candidates) {
    const el = scope.querySelector?.(selector);
    if (el) return el;
  }
  return null;
}

function createSidebarButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "d35e-acb-open";
  button.dataset.tooltip = i18n("D35EACB.Title");
  button.innerHTML = `<i class="fas fa-filter"></i><span>${i18n("D35EACB.Button")}</span>`;
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    getBrowser().render(true);
  });
  return button;
}

function installButtonIntoRoot(root) {
  if (!root || !(root instanceof HTMLElement)) return false;
  if (root.querySelector(":scope > .d35e-acb-sidebar-launch, .d35e-acb-sidebar-launch")) return true;

  const directoryHeader = root.querySelector(".directory-header") ?? root;
  const headerActions = directoryHeader.querySelector(".header-actions") ?? root.querySelector(".header-actions");
  const searchArea = directoryHeader.querySelector(".header-search, search, input[type='search']")?.closest?.(".header-search, search, form, div");

  const row = document.createElement("div");
  row.className = "d35e-acb-sidebar-launch";
  row.append(createSidebarButton());

  if (headerActions?.parentElement) {
    headerActions.insertAdjacentElement("afterend", row);
  } else if (searchArea?.parentElement) {
    searchArea.insertAdjacentElement("beforebegin", row);
  } else {
    directoryHeader.prepend(row);
  }
  return true;
}

function installSidebarButton(app, html) {
  const renderedRoot = unwrapHtml(html);
  if (renderedRoot && isCompendiumSidebar(app, html)) {
    const compendiumRoot = renderedRoot.matches?.('#compendium, [data-tab="compendium"], .compendium-sidebar, .compendium.directory')
      ? renderedRoot
      : findCompendiumRoot(renderedRoot) ?? renderedRoot;
    installButtonIntoRoot(compendiumRoot);
    return;
  }

  const root = findCompendiumRoot(document);
  if (root) installButtonIntoRoot(root);
}

let sidebarObserver;
function startSidebarObserver() {
  if (sidebarObserver || !document.body) return;
  sidebarObserver = new MutationObserver(() => {
    const root = findCompendiumRoot(document);
    if (root) installButtonIntoRoot(root);
  });
  sidebarObserver.observe(document.body, { childList: true, subtree: true });
}

function ensureSidebarButtonSoon() {
  installSidebarButton(null, null);
  for (const delay of [50, 250, 750, 1500]) {
    window.setTimeout(() => installSidebarButton(null, null), delay);
  }
}

Hooks.once("init", () => {
  if (game.system.id !== "D35E") return;
  console.log(`${MODULE_ID} | Initializing`);
});

Hooks.once("ready", () => {
  if (game.system.id !== "D35E") return;
  game.d35eAdvancedCompendiumBrowser = {
    open: (category = "items") => getBrowser().openCategory(category, { reset: false }),
    openCategory: (category) => getBrowser().openCategory(category),
    refresh: () => {
      const app = getBrowser();
      app.cache.clear();
      app.render(false);
    },
    app: () => getBrowser()
  };
  document.addEventListener("click", interceptNativeCompendiumLink, true);
  document.addEventListener("mouseup", interceptNativeOpenBrowser, true);
  startSidebarObserver();
  ensureSidebarButtonSoon();
});

Hooks.on("renderSidebarTab", installSidebarButton);
Hooks.on("renderCompendiumDirectory", installSidebarButton);
Hooks.on("renderCompendiumDirectoryPF", installSidebarButton);
Hooks.on("changeSidebarTab", () => ensureSidebarButtonSoon());

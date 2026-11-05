(async () => {
  "use strict";
  const boardId = new URLSearchParams(location.search).get("board") || "asthme";
  let boardModel;
  try {
    boardModel = BoardStore.get(boardId);
    if (!boardModel) throw Error("Tableau introuvable.");
  } catch (e) {
    const box = document.createElement("p");
    box.textContent = e.message + " Revenez à l’accueil pour choisir un tableau.";
    box.setAttribute("role", "alert");
    const a = document.createElement("a");
    a.href = "../";
    a.textContent = "Retour à mes tableaux";
    document.body.replaceChildren(box, a);
    return;
  }

  document.addEventListener("keydown", (e) => {
    const boxes = [...document.querySelectorAll(".overlay.show")].sort((a, b) => +b.style.zIndex - +a.style.zIndex),
      box = boxes[0];
    if (!box) return;
    if (e.key === "Escape") {
      e.preventDefault();
      hide(box.id);
    }
    if (e.key === "Tab") {
      const fields = [...box.querySelectorAll("button,input,select,textarea,a[href],summary")].filter((x) => !x.disabled && x.getClientRects().length),
        first = fields[0],
        last = fields.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  const $ = (id) => document.getElementById(id),
    KEY = BoardStore.stateKey(boardId),
    ACTIVE = BoardStore.activeKey(boardId),
    clone = (o) => JSON.parse(JSON.stringify(o));
  function canConfigure() {
    if (S.settings.locked) {
      note("Réglages verrouillés : le comptage et les corrections restent disponibles.");
      return false;
    }
    if (otherTabChanged || corruptStorage) {
      storageWarning("Rechargez ou restaurez avant de modifier la configuration.");
      return false;
    }
    return true;
  }
  const COLORS = ["#d85c66", "#c87b4b", "#c3a84b", "#5fa675", "#4a9fa8", "#557fb8", "#7a67b0", "#ad638f", "#8a9099"];
  const EMOJIS = [
    ["✅", "fait validation tâche"],
    ["⭐", "favori étoile"],
    ["🔥", "motivation feu"],
    ["💧", "eau hydratation"],
    ["💪", "sport force"],
    ["🏃", "course sport"],
    ["🚶", "marche pas"],
    ["🚴", "vélo sport"],
    ["🧠", "cerveau étude"],
    ["📚", "livre lecture"],
    ["✍️", "écrire"],
    ["💻", "travail ordinateur"],
    ["❤️", "coeur santé"],
    ["💊", "médicament"],
    ["😴", "sommeil nuit"],
    ["🍎", "repas nourriture"],
    ["💰", "argent finance"],
    ["📞", "appel téléphone"],
    ["📧", "mail courrier"],
    ["📦", "colis livraison"],
    ["☕", "café"],
    ["🚭", "tabac arrêt"],
    ["🧹", "ménage"],
    ["🌱", "plante"],
    ["🎯", "objectif"],
    ["⏱️", "temps"],
    ["📅", "calendrier"],
    ["🔁", "récurrence"],
    ["#", "nombre"],
    ["+", "plus"],
    ["%", "pourcentage"],
    ["@", "contact"],
  ];
  const defaultTheme = {
    bg: "#111318",
    panel: "#1b1e24",
    panel2: "#242830",
    line: "#353a44",
    text: "#f2f4f7",
    accent: "#e9edf3",
    customCSS: "",
  };
  const defaults = {
    tabs: [{ id: "general", name: "Général", color: "#4d5562" }],
    tallies: [],
    logs: [],
    layouts: {},
    theme: defaultTheme,
    settings: {
      unified: true,
      countSize: 44,
      iconSize: 27,
      nameSize: 11,
      sound: false,
      volume: 30,
      locked: false,
      favoriteColors: COLORS,
      reminderEnabled: false,
      reminderPreset: "7",
      reminderDays: 7,
      reminderEmail: "",
      reminderNext: 0,
      exportSections: {
        history: true,
        layouts: true,
        settings: true,
        theme: true,
      },
      exportOutlineOpen: { counters: true, config: true },
    },
  };
  let memory = {},
    storageOK = true,
    corruptStorage = false,
    otherTabChanged = false;
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      otherTabChanged = true;
      storageWarning("La V2 a changé dans un autre onglet. Rechargez cette page avant de continuer pour ne pas écraser ses modifications.");
    }
  });
  function get(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      storageOK = false;
      return memory[k] || null;
    }
  }
  function set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      storageOK = false;
      memory[k] = v;
    }
    globalThis.KountRDB?.put(k, v).catch(() => {});
  }
  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function iso() {
    return new Date().toISOString();
  }
  function esc(v) {
    return String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function contrast(hex) {
    const v = (hex || "#555555").replace("#", ""),
      n = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0);
    return (0.299 * n[0] + 0.587 * n[1] + 0.114 * n[2]) / 255 > 0.62 ? "#111318" : "#f7f8fa";
  }
  if (!get(KEY)) {
    const recovered = await globalThis.KountRDB?.get(KEY).catch(() => null);
    if (recovered) set(KEY, recovered);
  }
  function load() {
    try {
      const x = JSON.parse(get(KEY));
      if (x && typeof x === "object") return BipoCore.validate(x);
    } catch (e) {
      corruptStorage = true;
    }
    return clone(defaults);
  }
  let S = load();
  if (!corruptStorage && (boardId !== "bipo" || boardModel.revision !== "builtin-1")) BoardStore.apply(boardModel, S);
  S.tabs = Array.isArray(S.tabs) && S.tabs.length ? S.tabs : clone(defaults.tabs);
  S.tallies = Array.isArray(S.tallies) ? S.tallies : [];
  S.logs = Array.isArray(S.logs) ? S.logs : [];
  S.layouts = S.layouts && typeof S.layouts === "object" ? S.layouts : {};
  S.theme = { ...defaultTheme, ...(S.theme || {}) };
  S.settings = { ...defaults.settings, ...(S.settings || {}) };
  S.tabs.forEach((t) => (t.color = t.color || "#4d5562"));
  S.tallies.forEach((t) => {
    t.tabId = t.tabId || S.tabs[0].id;
    t.step = Math.max(0.000001, +t.step || 1);
    t.count = +t.count || 0;
    if (!["third", "half", "full"].includes(t.size)) t.size = t.size === "twothirds" ? "half" : "third";
  });
  let active = get(ACTIVE) || S.tabs[0].id;
  if (!S.tabs.some((t) => t.id === active)) active = S.tabs[0].id;
  function save() {
    if (otherTabChanged) {
      storageWarning("La V2 a changé dans un autre onglet. Rechargez avant de continuer.");
      return;
    }
    if (corruptStorage) {
      storageWarning("Données locales illisibles : elles sont conservées. Rechargez ou restaurez une sauvegarde complète valide dans les préférences.");
      return;
    }
    set(KEY, JSON.stringify(S));
    if (!storageOK) storageWarning("Stockage indisponible : modifications en mémoire seulement. Sauvegardez en JSON avant de fermer cette page.");
  }
  S.settings.favoriteColors = Array.isArray(S.settings.favoriteColors) && S.settings.favoriteColors.length ? S.settings.favoriteColors : clone(COLORS);
  S.settings.exportSections = {
    ...defaults.settings.exportSections,
    ...(S.settings.exportSections || {}),
  };
  S.settings.exportOutlineOpen = {
    ...defaults.settings.exportOutlineOpen,
    ...(S.settings.exportOutlineOpen || {}),
  };
  S.tallies.forEach((t) => {
    if (typeof t.autoExport !== "boolean") t.autoExport = true;
    if (!["never", "optional", "required"].includes(t.noteMode)) t.noteMode = "never";
  });
  let editing = null,
    editingTab = null,
    pendingSlot = null,
    pickedColor = COLORS[5],
    pickedSize = "third",
    pickedEmoji = "#",
    lastAction = null,
    deleted = [],
    deleteTimer = null,
    fileMode = "all",
    confirmFn = null,
    audioCtx = null;
  function ensureLayout(tabId) {
    const valid = new Set(S.tallies.filter((t) => t.tabId === tabId).map((t) => t.id));
    let layout = Array.isArray(S.layouts[tabId]) ? S.layouts[tabId].filter((x) => x === null || valid.has(x)) : [];
    const present = new Set(layout.filter(Boolean));
    valid.forEach((tid) => {
      if (!present.has(tid)) layout.push(tid);
    });
    while (layout.filter((x) => x === null).length < 3) layout.push(null);
    S.layouts[tabId] = layout;
    return layout;
  }
  let sheetLayer = 50;
  const focusBefore = new Map();
  function show(id) {
    if (["counterModal", "tabModal", "prefsModal"].includes(id) && !canConfigure()) return;
    focusBefore.set(id, document.activeElement);
    const box = $(id);
    box.classList.add("show");
    box.style.zIndex = ++sheetLayer;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", box.querySelector("h2")?.textContent || "Confirmation");
    box.querySelector("button,input,select,textarea")?.focus();
  }
  function hide(id) {
    $(id).classList.remove("show");
    focusBefore.get(id)?.focus();
  }
  function note(s) {
    $("toast").textContent = s;
    $("toast").classList.add("show");
    clearTimeout(note.t);
    note.t = setTimeout(() => $("toast").classList.remove("show"), 1600);
  }
  function ask(text, fn) {
    $("confirmText").textContent = text;
    confirmFn = fn;
    show("confirmModal");
  }
  async function play() {
    if (!S.settings.sound) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      audioCtx = audioCtx || new C();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const o = audioCtx.createOscillator(),
        g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = 620;
      g.gain.setValueAtTime(Math.max(0.001, (S.settings.volume / 100) * 0.09), audioCtx.currentTime);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
      o.stop(audioCtx.currentTime + 0.075);
    } catch (e) {
      note("Son indisponible sur ce navigateur");
    }
  }
  function periodLabel(t) {
    const m = {
      none: "",
      hours: `/${t.hours || 1}h`,
      morning: "/matin",
      noon: "/midi",
      afternoon: "/après-midi",
      dinner: "/dîner",
      evening: "/soirée",
      night: "/nuit",
      week: "/semaine",
      month: "/mois",
      year: "/année",
    };
    return m[t.period || "none"] || "";
  }
  function applyTheme() {
    const r = document.documentElement.style;
    for (const [k, v] of Object.entries(S.theme)) if (k !== "customCSS") r.setProperty("--" + k, v);
    $("customTheme").textContent = S.theme.customCSS || "";
  }

  function render() {
    syncBipoDay();
    applyTheme();
    document.body.classList.toggle("locked", S.settings.locked);
    $("lock").textContent = S.settings.locked ? "🔒" : "🔓";
    $("lock").setAttribute("aria-pressed", String(S.settings.locked));
    $("lock").setAttribute("aria-label", S.settings.locked ? "Déverrouiller les réglages" : "Verrouiller les réglages");
    $("lock").classList.toggle("on", S.settings.locked);
    $("lock").title = S.settings.locked ? "Débloquer les réglages" : "Bloquer les réglages";
    $("prefs").disabled = S.settings.locked;
    renderTabs();
    const grid = $("grid");
    grid.innerHTML = "";
    ensureLayout(active).forEach((tid, slot) => {
      if (tid === null) {
        const a = document.createElement("button");
        a.className = "addTile third";
        a.textContent = "+";
        a.title = "Ajouter un compteur ici";
        a.dataset.slot = slot;
        a.addEventListener("click", () => {
          if (!S.settings.locked) openCounter(null, "third", slot);
        });
        grid.appendChild(a);
        return;
      }
      const t = S.tallies.find((x) => x.id === tid);
      if (!t) return;
      const el = document.createElement("article");
      el.className = "tile " + (t.size || "third");
      el.dataset.tallyId = t.id;
      el.style.background = t.color;
      el.style.color = contrast(t.color);
      el.style.setProperty("--count-size", (S.settings.unified ? S.settings.countSize : t.countSize || S.settings.countSize) + "px");
      el.style.setProperty("--icon-size", (S.settings.unified ? S.settings.iconSize : t.iconSize || S.settings.iconSize) + "px");
      el.innerHTML = `<div class="tileTop"><button class="dots" aria-label="Régler ${esc(t.name)}">⋮</button><div class="count">${displayBipo(t)}${t.unit ? '<small class="tileUnit"> ' + esc(t.unit) + "</small>" : ""}</div><div class="emoji">${esc(t.icon)}</div></div><div class="tileBottom"><span style="font-size:${S.settings.nameSize}px">${esc(t.name)}</span><span class="goal">${t.goal ? `${t.count ?? "—"}/${t.goal}${periodLabel(t)}` : ""}</span><button class="entryButton" aria-label="Saisir ${esc(t.name)}">✎</button></div>`;
      el.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        clickBipo(t);
      });
      el.setAttribute("role", "group");
      el.setAttribute("aria-label", t.name);
      el.tabIndex = 0;
      el.addEventListener("keydown", (e) => {
        if (e.target !== el) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          clickBipo(t);
        }
      });
      el.querySelector(".entryButton").onclick = () => openBipoEntry(t);
      el.querySelector(".dots").addEventListener("click", () => {
        if (!S.settings.locked) openCounter(t);
      });
      grid.appendChild(el);
    });
    CounterV2.enhance();
  }
  function renderTabs() {
    const nav = $("tabs");
    nav.innerHTML = "";
    S.tabs.forEach((t) => {
      const w = document.createElement("div");
      w.className = "tabWrap";
      w.style.background = t.color;
      w.style.color = contrast(t.color);
      const b = document.createElement("button");
      b.className = "tab" + (t.id === active ? " active" : "");
      b.textContent = t.name;
      b.style.background = "inherit";
      b.style.color = "inherit";
      b.addEventListener("click", () => {
        active = t.id;
        set(ACTIVE, active);
        render();
      });
      const s = document.createElement("button");
      s.className = "tabSettings";
      s.textContent = "⋮";
      s.title = "Réglages de l’onglet";
      s.addEventListener("click", () => {
        if (!S.settings.locked) openTab(t);
      });
      w.append(b, s);
      nav.appendChild(w);
    });
    const a = document.createElement("button");
    a.className = "tab add";
    a.textContent = "+";
    a.addEventListener("click", () => {
      if (!S.settings.locked) openTab();
    });
    nav.appendChild(a);
  }
  function buildEmoji() {
    const q = $("emojiSearch").value.trim().toLowerCase(),
      box = $("emojiGrid");
    box.innerHTML = "";
    EMOJIS.filter(([e, w]) => !q || e === q || w.includes(q)).forEach(([e, w]) => {
      const b = document.createElement("button");
      b.textContent = e;
      b.title = w;
      b.className = e === pickedEmoji ? "sel" : "";
      b.addEventListener("click", () => {
        pickedEmoji = e;
        $("emojiSearch").value = e;
        buildEmoji();
      });
      box.appendChild(b);
    });
  }
  function addFavoriteColor(color) {
    if (!canConfigure()) return;
    const c = String(color).toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(c)) return;
    if (!S.settings.favoriteColors.includes(c)) S.settings.favoriteColors.push(c);
    save();
    buildColors();
    buildTabColors();
    note("Couleur ajoutée aux favorites");
  }
  function removeFavoriteColor(color) {
    if (!canConfigure()) return;
    if (S.settings.favoriteColors.length <= 1) return;
    S.settings.favoriteColors = S.settings.favoriteColors.filter((c) => c !== color);
    save();
    buildColors();
    buildTabColors();
    note("Couleur favorite supprimée");
  }
  function buildColors() {
    const box = $("colors");
    box.innerHTML = "";
    S.settings.favoriteColors.forEach((c) => {
      const b = document.createElement("button");
      b.className = "swatch removeable" + (c === pickedColor ? " sel" : "");
      b.style.background = c;
      b.title = "Choisir · double-clic pour retirer";
      b.addEventListener("click", () => {
        pickedColor = c;
        $("customColor").value = c;
        buildColors();
      });
      b.addEventListener("dblclick", (e) => {
        e.preventDefault();
        removeFavoriteColor(c);
      });
      box.appendChild(b);
    });
  }
  function buildTabColors() {
    const box = $("tabColors"),
      current = $("tabColor").value.toLowerCase();
    box.innerHTML = "";
    S.settings.favoriteColors.forEach((c) => {
      const b = document.createElement("button");
      b.className = "swatch removeable" + (c === current ? " sel" : "");
      b.style.background = c;
      b.title = "Choisir · double-clic pour retirer";
      b.addEventListener("click", () => {
        $("tabColor").value = c;
        buildTabColors();
      });
      b.addEventListener("dblclick", (e) => {
        e.preventDefault();
        removeFavoriteColor(c);
      });
      box.appendChild(b);
    });
  }
  function syncParentColor() {
    const t = S.tallies.find((x) => x.id === $("parent").value);
    $("parent").style.background = t?.color || "";
    $("parent").style.color = t ? contrast(t.color) : "";
  }
  function openCounter(t, size, slot = null) {
    if (!canConfigure()) return;
    editing = t?.id || null;
    pendingSlot = t ? null : slot;
    pickedColor = t?.color || COLORS[5];
    pickedSize = t?.size || size || "third";
    pickedEmoji = t?.icon || "#";
    $("bipoCounterType").value = t?.bipoType || "count";
    $("bipoMin").value = t?.bipoMin ?? "";
    $("bipoMax").value = t?.bipoMax ?? "";
    $("bipoPrescription").value = t?.prescription || "";
    $("noteMode").value = t?.noteMode || "never";
    $("counterAdvanced").open = false;
    $("counterTitle").textContent = t ? "Modifier le compteur" : "Nouveau compteur";
    $("name").value = t?.name || "";
    $("emojiSearch").value = pickedEmoji;
    $("customColor").value = pickedColor;
    $("step").value = t?.step || 1;
    $("goal").value = t?.goal || "";
    $("period").value = t?.period || "none";
    $("hoursField").style.display = $("period").value === "hours" ? "block" : "none";
    $("hours").value = t?.hours || 1;
    $("countSize").value = t?.countSize || S.settings.countSize;
    $("iconSize").value = t?.iconSize || S.settings.iconSize;
    $("autoExport").checked = t?.autoExport !== false;
    $("countSizeVal").textContent = $("countSize").value + "px";
    $("iconSizeVal").textContent = $("iconSize").value + "px";
    $("customSizing").style.opacity = S.settings.unified ? ".35" : "1";
    $("countSize").disabled = $("iconSize").disabled = S.settings.unified;
    $("resetCounter").textContent = t?.bipoType === "value" || t?.bipoType === "med" ? "Effacer la valeur du jour" : "Remettre à zéro";
    $("editActions").style.display = t ? "flex" : "none";
    $("deleteCounterHint").style.display = t ? "block" : "none";
    $("parent").innerHTML =
      '<option value="">aucun</option>' +
      S.tallies
        .filter((x) => x.id !== editing)
        .map((x) => `<option value="${x.id}" style="background:${x.color};color:${contrast(x.color)}">${esc(x.name)}</option>`)
        .join("");
    $("parent").value = t?.parentId || "";
    syncParentColor();
    buildEmoji();
    buildColors();
    [...$("sizes").children].forEach((b) => b.classList.toggle("primary", b.dataset.size === pickedSize));
    show("counterModal");
  }
  function saveCounter() {
    if (!canConfigure()) return;
    const name = $("name").value.trim() || "Sans nom",
      typed = $("emojiSearch").value.trim(),
      icon = EMOJIS.some((x) => x[0] === typed) ? typed : pickedEmoji,
      fixedSlot = Number.isInteger(pendingSlot);
    const data = {
      bipoType: $("bipoCounterType").value,
      bipoMin: $("bipoMin").value === "" ? null : +$("bipoMin").value,
      bipoMax: $("bipoMax").value === "" ? null : +$("bipoMax").value,
      prescription: $("bipoPrescription").value.trim(),
      name,
      icon,
      color: pickedColor,
      size: pickedSize,
      step: Math.max(0.000001, +$("step").value || 1),
      goal: +$("goal").value || null,
      period: $("period").value,
      hours: Math.max(1, +$("hours").value || 1),
      parentId: $("parent").value || null,
      countSize: +$("countSize").value,
      iconSize: +$("iconSize").value,
      autoExport: $("autoExport").checked,
      noteMode: $("noteMode").value,
    };
    if (data.bipoMin !== null && data.bipoMax !== null && data.bipoMin > data.bipoMax) {
      note("Le minimum doit être inférieur au maximum");
      return;
    }
    if (editing)
      Object.assign(
        S.tallies.find((t) => t.id === editing),
        data,
      );
    else {
      const tally = {
          id: id(),
          tabId: active,
          count: 0,
          createdAt: iso(),
          ...data,
        },
        layout = ensureLayout(active),
        slot = fixedSlot && layout[pendingSlot] === null ? pendingSlot : layout.indexOf(null);
      S.tallies.push(tally);
      if (slot >= 0) layout[slot] = tally.id;
      else layout.push(tally.id);
      layout.push(null);
      pendingSlot = null;
    }
    save();
    hide("counterModal");
    render();
    note("Enregistré");
  }
  function openTab(t) {
    if (!canConfigure()) return;
    editingTab = t?.id || null;
    $("tabTitle").textContent = t ? "Modifier l’onglet" : "Nouvel onglet";
    $("tabName").value = t?.name || "";
    $("tabColor").value = t?.color || "#4d5562";
    buildTabColors();
    $("deleteTab").style.display = t && S.tabs.length > 1 ? "block" : "none";
    show("tabModal");
  }
  function saveTab() {
    if (!canConfigure()) return;
    const name = $("tabName").value.trim();
    if (!name) return;
    const color = $("tabColor").value;
    if (editingTab)
      Object.assign(
        S.tabs.find((t) => t.id === editingTab),
        { name, color },
      );
    else {
      const t = { id: id(), name, color };
      S.tabs.push(t);
      active = t.id;
      set(ACTIVE, active);
    }
    save();
    hide("tabModal");
    render();
  }
  function reminderInterval() {
    return Math.max(1, +S.settings.reminderDays || 1);
  }
  function scheduleReminder() {
    S.settings.reminderNext = Date.now() + reminderInterval() * 86400000;
    save();
    updateReminderUI();
  }
  function updateReminderUI() {
    $("reminderPreset").value = S.settings.reminderPreset || "7";
    $("reminderDays").value = reminderInterval();
    $("reminderCustomField").style.display = S.settings.reminderPreset === "custom" ? "block" : "none";
    $("reminderNext").textContent = S.settings.reminderEnabled && S.settings.reminderNext ? "Prochain rappel : " + new Date(S.settings.reminderNext).toLocaleDateString("fr-FR") : "";
  }
  function renderExportExplorer() {
    const box = $("exportExplorer"),
      open = S.settings.exportOutlineOpen,
      section = S.settings.exportSections;
    box.innerHTML = "";
    const check = (value, onchange, disabled = false) => {
      const el = document.createElement("input");
      el.type = "checkbox";
      el.className = "outlineCheck";
      el.checked = value;
      el.disabled = disabled;
      el.addEventListener("click", (e) => e.stopPropagation());
      el.addEventListener("change", onchange);
      return el;
    };
    const group = (key, label, checked, partial, onchange, children, icon, count) => {
      const d = document.createElement("details"),
        s = document.createElement("summary"),
        c = check(checked, onchange, !count && key !== "config"),
        ico = document.createElement("span"),
        name = document.createElement("span"),
        badge = document.createElement("span"),
        branch = document.createElement("div");
      d.className = "outlineGroup";
      d.open = open[key] !== false;
      d.addEventListener("toggle", () => {
        open[key] = d.open;
        save();
      });
      c.indeterminate = partial;
      ico.className = "outlineIcon";
      ico.textContent = icon;
      name.className = "outlineName";
      name.textContent = label;
      badge.className = "outlineCount";
      badge.textContent = String(count);
      branch.className = "outlineChildren";
      children(branch);
      s.append(c, ico, name, badge);
      d.append(s, branch);
      return d;
    };
    const leaf = (label, value, onchange, icon, dotColor) => {
      const row = document.createElement("label"),
        ico = document.createElement("span"),
        name = document.createElement("span");
      row.className = "outlineLeaf";
      ico.className = "outlineIcon";
      ico.textContent = icon;
      if (dotColor) {
        ico.textContent = "";
        ico.className = "colorDot";
        ico.style.background = dotColor;
      }
      name.className = "outlineName";
      name.textContent = label;
      row.append(check(value, onchange), ico, name);
      return row;
    };
    const selected = S.tallies.filter((t) => t.autoExport !== false).length,
      total = S.tallies.length;
    box.appendChild(
      group(
        "counters",
        "Compteurs",
        !!total && selected === total,
        selected > 0 && selected < total,
        (e) => {
          S.tallies.forEach((t) => (t.autoExport = e.target.checked));
          save();
          renderExportExplorer();
        },
        (branch) => {
          if (!S.tabs.length) {
            const empty = document.createElement("div");
            empty.className = "outlineEmpty";
            empty.textContent = "Aucun onglet";
            branch.appendChild(empty);
            return;
          }
          S.tabs.forEach((tab) => {
            const tallies = S.tallies.filter((t) => t.tabId === tab.id),
              n = tallies.filter((t) => t.autoExport !== false).length,
              key = "tab_" + tab.id;
            branch.appendChild(
              group(
                key,
                tab.name,
                !!tallies.length && n === tallies.length,
                n > 0 && n < tallies.length,
                (e) => {
                  tallies.forEach((t) => (t.autoExport = e.target.checked));
                  save();
                  renderExportExplorer();
                },
                (items) => {
                  if (!tallies.length) {
                    const empty = document.createElement("div");
                    empty.className = "outlineEmpty";
                    empty.textContent = "Aucun compteur";
                    items.appendChild(empty);
                  }
                  tallies.forEach((t) =>
                    items.appendChild(
                      leaf(
                        (t.icon || "#") + "  " + t.name,
                        t.autoExport !== false,
                        (e) => {
                          t.autoExport = e.target.checked;
                          save();
                          renderExportExplorer();
                        },
                        "",
                        t.color,
                      ),
                    ),
                  );
                },
                "▣",
                tallies.length,
              ),
            );
          });
        },
        "◫",
        total,
      ),
    );
    const configItems = [
        ["settings", "Préférences générales", "⚙"],
        ["theme", "Thème et CSS", "◐"],
        ["history", "Historique des compteurs", "↶"],
        ["layouts", "Disposition des grilles", "▦"],
      ],
      configSelected = configItems.filter(([key]) => section[key]).length;
    box.appendChild(
      group(
        "config",
        "Configuration",
        configSelected === configItems.length,
        configSelected > 0 && configSelected < configItems.length,
        (e) => {
          configItems.forEach(([key]) => (section[key] = e.target.checked));
          save();
          renderExportExplorer();
        },
        (branch) => {
          configItems.forEach(([key, label, icon]) =>
            branch.appendChild(
              leaf(
                label,
                !!section[key],
                (e) => {
                  section[key] = e.target.checked;
                  save();
                  renderExportExplorer();
                },
                icon,
              ),
            ),
          );
        },
        "◇",
        configItems.length,
      ),
    );
  }
  function syncPrefs() {
    for (const [id, k] of [
      ["unified", "unified"],
      ["sound", "sound"],
    ])
      $(id).checked = !!S.settings[k];
    for (const [id, k] of [
      ["globalCount", "countSize"],
      ["globalIcon", "iconSize"],
      ["globalName", "nameSize"],
      ["volume", "volume"],
    ]) {
      $(id).value = S.settings[k];
      $(id + "Val").textContent = S.settings[k] + (id === "volume" ? "%" : "px");
    }
    for (const [id, k] of [
      ["themeBg", "bg"],
      ["themePanel", "panel"],
      ["themePanel2", "panel2"],
      ["themeText", "text"],
      ["themeAccent", "accent"],
      ["themeLine", "line"],
    ])
      $(id).value = S.theme[k];
    $("customCSS").value = S.theme.customCSS || "";
    $("reminderEnabled").checked = !!S.settings.reminderEnabled;
    $("reminderEmail").value = S.settings.reminderEmail || "";
    updateReminderUI();
    renderExportExplorer();
  }
  function visibleLogs() {
    let a = S.logs.filter((l) => (!$("bipoHistoryDay").checked || logDay(l) === bipoDay) && ($("historyFilter").value === "all" || l.tallyId === $("historyFilter").value));
    const mode = $("historySort").value;
    return [...a].sort((x, y) => (mode === "old" ? new Date(x.ts) - new Date(y.ts) : mode === "name" ? x.name.localeCompare(y.name) : new Date(y.ts) - new Date(x.ts)));
  }
  function renderHistory() {
    const f = $("historyFilter"),
      keep = f.value;
    f.innerHTML = '<option value="all">Tous</option>' + S.tallies.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
    f.value = [...f.options].some((o) => o.value === keep) ? keep : "all";
    $("historyList").innerHTML =
      visibleLogs()
        .slice(0, 300)
        .map((l) => `<div class="historyItem"><div><b>${esc(l.name)}</b> ${l.delta > 0 ? "+" : ""}${l.delta} · ${l.total ?? "—"}${l.bipoStatus === "skipped" ? " · non prise déclarée" : l.bipoStatus === "taken" ? " · prise confirmée" : ""}${l.note ? " · " + esc(l.note) : ""}<div class="hint">${new Date(l.ts).toLocaleString("fr-FR")}</div></div><button class="deleteLog" data-id="${l.id}">×</button></div>`)
        .join("") || '<p class="hint">Aucune entrée.</p>';
    document.querySelectorAll(".deleteLog").forEach((b) => (b.onclick = () => deleteLog(b.dataset.id)));
  }
  function deleteLog(logId) {
    const l = S.logs.find((x) => x.id === logId);
    if (!l) return;
    deleted.push(l);
    S.logs = S.logs.filter((x) => x.id !== logId);
    recompute(l.tallyId);
    save();
    render();
    renderHistory();
    clearTimeout(deleteTimer);
    $("undoText").textContent = deleted.length + " entrée" + (deleted.length > 1 ? "s" : "") + " supprimée" + (deleted.length > 1 ? "s" : "");
    $("undoBar").classList.add("show");
    deleteTimer = setTimeout(() => {
      deleted = [];
      $("undoBar").classList.remove("show");
    }, 5000);
  }
  function recompute(tid) {
    const t = S.tallies.find((t) => t.id === tid);
    if (t) t.count = readBipo(t, bipoDay).value;
  }

  function csv(logs) {
    return "compteur,date_suivie,date_iso,variation,total,statut,note\n" + logs.map((l) => `"${String(l.name).replaceAll('"', '""')}","${logDay(l)}","${l.ts}",${l.delta},${l.total ?? ""},"${String(l.bipoStatus || "").replaceAll('"', '""')}","${String(l.note || "").replaceAll('"', '""')}"`).join("\n");
  }
  function download(content, name, type = "application/json") {
    const u = URL.createObjectURL(new Blob([content], { type })),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 100);
  }
  function backup(setupOnly = false) {
    const tab = S.tabs.find((t) => t.id === active),
      ts = S.tallies.filter((t) => !setupOnly || t.tabId === active),
      ids = new Set(ts.map((t) => t.id)),
      data = setupOnly
        ? {
            app: "COUNTr",
            version: 3,
            tabs: [tab],
            tallies: ts,
            logs: S.logs.filter((l) => ids.has(l.tallyId)),
            settings: S.settings,
            theme: S.theme,
          }
        : { app: "COUNTr", version: 3, ...S };
    download(JSON.stringify(data, null, 2), setupOnly ? "tallycounter-setup.json" : "tallycounter-backup.json");
  }
  function automaticExportData() {
    const tallies = S.tallies.filter((t) => t.autoExport !== false),
      ids = new Set(tallies.map((t) => t.id)),
      tabIds = new Set(tallies.map((t) => t.tabId)),
      tabs = S.tabs.filter((t) => tabIds.has(t.id)),
      section = S.settings.exportSections,
      data = { app: "COUNTr", version: 3, exportedAt: iso(), tabs, tallies };
    if (section.history) data.logs = S.logs.filter((l) => ids.has(l.tallyId));
    if (section.layouts) {
      data.layouts = {};
      tabs.forEach((tab) => (data.layouts[tab.id] = ensureLayout(tab.id).filter((x) => x === null || ids.has(x))));
    }
    if (section.settings) data.settings = S.settings;
    if (section.theme) data.theme = S.theme;
    return data;
  }
  function mailBackup() {
    const data = JSON.stringify(automaticExportData()),
      to = encodeURIComponent(S.settings.reminderEmail || ""),
      subject = encodeURIComponent("Sauvegarde COUNTr"),
      body = encodeURIComponent("Données COUNTr sélectionnées au format JSON :\n\n" + data);
    if (S.settings.reminderEnabled) scheduleReminder();
    location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }
  function checkReminder() {
    if (!S.settings.reminderEnabled) return;
    if (!S.settings.reminderNext) {
      scheduleReminder();
      return;
    }
    if (Date.now() >= S.settings.reminderNext) {
      scheduleReminder();
      ask("Rappel : envoyer maintenant la sauvegarde COUNTr ?", mailBackup);
    }
  }
  function exportGlobalConfig() {
    download(
      JSON.stringify(
        {
          app: "COUNTr",
          version: 3,
          kind: "global-config",
          settings: { ...S.settings, locked: false },
          theme: S.theme,
        },
        null,
        2,
      ),
      "tallycounter-global.json",
    );
  }
  function exportTabConfig() {
    const tab = S.tabs.find((t) => t.id === active),
      tallies = S.tallies.filter((t) => t.tabId === active).map((t) => ({ ...t, count: 0, createdAt: null }));
    download(
      JSON.stringify(
        {
          app: "COUNTr",
          version: 3,
          kind: "tab-config",
          tab: { name: tab.name, color: tab.color },
          tallies,
          layout: ensureLayout(active),
        },
        null,
        2,
      ),
      "tallycounter-" + tab.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-") + ".json",
    );
  }
  function importGlobalConfig(data) {
    if (!canConfigure()) return;
    if (data?.kind !== "global-config" || !data.settings) throw Error("Configuration globale invalide");
    S.settings = { ...defaults.settings, ...data.settings, locked: false };
    S.theme = { ...defaultTheme, ...(data.theme || {}) };
    save();
    syncPrefs();
    render();
    note("Configuration globale chargée");
  }
  function importTabConfig(data) {
    if (!canConfigure()) return;
    if (data?.kind !== "tab-config" || !Array.isArray(data.tallies)) throw Error("Configuration d’onglet invalide");
    const tab = {
        id: id(),
        name: data.tab?.name || "Configuration importée",
        color: data.tab?.color || "#4d5562",
      },
      map = {};
    S.tabs.push(tab);
    data.tallies.forEach((t) => {
      const old = t.id,
        n = { ...t, id: id(), tabId: tab.id, count: 0, createdAt: iso() };
      map[old] = n.id;
      S.tallies.push(n);
    });
    S.layouts[tab.id] = Array.isArray(data.layout) ? data.layout.map((x) => (x === null ? null : map[x])).filter((x) => x !== undefined) : Object.values(map);
    active = tab.id;
    ensureLayout(active);
    set(ACTIVE, active);
    save();
    render();
    note("Onglet chargé");
  }
  function advancedConfig() {
    return {
      app: "COUNTr",
      version: 3,
      kind: "advanced-config",
      step: Math.max(0.000001, +$("step").value || 1),
      goal: +$("goal").value || null,
      period: $("period").value,
      hours: Math.max(1, +$("hours").value || 1),
      countSize: +$("countSize").value,
      iconSize: +$("iconSize").value,
    };
  }
  function exportAdvancedConfig() {
    download(JSON.stringify(advancedConfig(), null, 2), "tallycounter-reglages-avances.json");
  }
  function importAdvancedConfig(data) {
    if (!canConfigure()) return;
    if (data?.kind !== "advanced-config") throw Error("Réglages avancés invalides");
    $("step").value = data.step || 1;
    $("goal").value = data.goal || "";
    $("period").value = data.period || "none";
    $("hours").value = data.hours || 1;
    $("countSize").value = data.countSize || S.settings.countSize;
    $("iconSize").value = data.iconSize || S.settings.iconSize;
    $("countSizeVal").textContent = $("countSize").value + "px";
    $("iconSizeVal").textContent = $("iconSize").value + "px";
    $("hoursField").style.display = $("period").value === "hours" ? "block" : "none";
    note("Réglages avancés chargés");
  }
  function importData(data, setupOnly) {
    if (!canConfigure()) return;
    BipoCore.validate(data);
    if (!setupOnly) {
      if (!confirm("Remplacer les données de cette V2 par la sauvegarde ? Exportez d’abord vos données actuelles si vous souhaitez les conserver.")) return;
      corruptStorage = false;
    }
    if (!data || !Array.isArray(data.tallies)) throw Error("Format invalide");
    if (setupOnly) {
      const nt = {
          ...(data.tabs?.[0] || { name: "Setup importé", color: "#4d5562" }),
          id: id(),
        },
        map = {};
      S.tabs.push(nt);
      data.tallies.forEach((t) => {
        const old = t.id,
          n = { ...t, id: id(), tabId: nt.id };
        map[old] = n.id;
        S.tallies.push(n);
      });
      (data.logs || []).forEach((l) => map[l.tallyId] && S.logs.push({ ...l, id: id(), tallyId: map[l.tallyId] }));
      active = nt.id;
    } else {
      S = {
        boardRevision: data.boardRevision,
        retiredTallies: Array.isArray(data.retiredTallies) ? data.retiredTallies : [],
        bipo: data.bipo && typeof data.bipo === "object" ? data.bipo : { notes: {}, signals: "", actions: "", events: [] },
        tabs: data.tabs || defaults.tabs,
        tallies: data.tallies,
        logs: data.logs || [],
        layouts: data.layouts && typeof data.layouts === "object" ? data.layouts : {},
        theme: { ...defaultTheme, ...(data.theme || {}) },
        settings: { ...defaults.settings, ...(data.settings || {}) },
      };
      active = S.tabs[0].id;
    }
    save();
    set(ACTIVE, active);
    render();
    note("Import réussi");
  }
  document.addEventListener("click", (e) => {
    const c = e.target.dataset.close;
    if (c) hide(c);
  });
  $("lock").onclick = () => {
    if (otherTabChanged || corruptStorage) {
      note("Rechargez avant de changer de mode.");
      return;
    }
    S.settings.locked = !S.settings.locked;
    save();
    render();
    note(S.settings.locked ? "Réglages bloqués" : "Réglages débloqués");
  };
  $("prefs").onclick = () => {
    syncPrefs();
    show("prefsModal");
  };
  $("history").onclick = () => {
    renderHistory();
    show("historyModal");
  };
  $("saveCounter").onclick = $("saveCounterBottom").onclick = saveCounter;
  $("saveTab").onclick = $("saveTabBottom").onclick = saveTab;
  $("emojiSearch").oninput = buildEmoji;
  $("customColor").oninput = (e) => {
    pickedColor = e.target.value;
    buildColors();
  };
  $("tabColor").oninput = buildTabColors;
  $("sizes").onclick = (e) => {
    const s = e.target.dataset.size;
    if (s) {
      pickedSize = s;
      [...$("sizes").children].forEach((b) => b.classList.toggle("primary", b.dataset.size === s));
    }
  };
  $("countSize").oninput = (e) => ($("countSizeVal").textContent = e.target.value + "px");
  $("iconSize").oninput = (e) => ($("iconSizeVal").textContent = e.target.value + "px");
  $("period").onchange = (e) => ($("hoursField").style.display = e.target.value === "hours" ? "block" : "none");
  $("parent").onchange = syncParentColor;
  $("saveFavoriteColor").onclick = () => addFavoriteColor($("customColor").value);
  $("saveTabFavoriteColor").onclick = () => addFavoriteColor($("tabColor").value);
  $("reminderEnabled").onchange = (e) => {
    S.settings.reminderEnabled = e.target.checked;
    if (e.target.checked) scheduleReminder();
    else {
      S.settings.reminderNext = 0;
      save();
      updateReminderUI();
    }
  };
  $("reminderPreset").onchange = (e) => {
    S.settings.reminderPreset = e.target.value;
    if (e.target.value !== "custom") S.settings.reminderDays = +e.target.value;
    scheduleReminder();
  };
  $("reminderDays").onchange = (e) => {
    S.settings.reminderDays = Math.max(1, +e.target.value || 1);
    S.settings.reminderPreset = "custom";
    scheduleReminder();
  };
  $("reminderEmail").onchange = (e) => {
    S.settings.reminderEmail = e.target.value.trim();
    save();
  };
  $("mailBackupNow").onclick = mailBackup;
  $("undo").onclick = () => {
    if (!lastAction) return;
    S.logs = S.logs.filter((l) => l.id !== lastAction.id);
    recompute(lastAction.tallyId);
    lastAction = null;
    $("undo").disabled = true;
    save();
    render();
  };
  $("resetCounter").onclick = () =>
    ask("Réinitialiser la valeur de ce compteur pour le jour sélectionné ?", () => {
      const t = S.tallies.find((x) => x.id === editing);
      recordBipo(t, t.bipoType === "value" || t.bipoType === "med" || t.bipoMin > 0 ? null : 0, "", null);
      hide("counterModal");
    });
  $("deleteCounter").onclick = () =>
    ask("Supprimer ce compteur ET tout son historique ?", () => {
      const layout = ensureLayout(active),
        slot = layout.indexOf(editing);
      if (slot >= 0) layout[slot] = null;
      S.tallies = S.tallies.filter((t) => t.id !== editing);
      S.logs = S.logs.filter((l) => l.tallyId !== editing);
      save();
      hide("counterModal");
      render();
    });
  $("deleteTab").onclick = () =>
    ask("Supprimer cet onglet ET tous ses compteurs ?", () => {
      const ids = new Set(S.tallies.filter((t) => t.tabId === editingTab).map((t) => t.id));
      S.tabs = S.tabs.filter((t) => t.id !== editingTab);
      S.tallies = S.tallies.filter((t) => t.tabId !== editingTab);
      S.logs = S.logs.filter((l) => !ids.has(l.tallyId));
      delete S.layouts[editingTab];
      active = S.tabs[0].id;
      save();
      hide("tabModal");
      render();
    });
  $("confirmNo").onclick = () => hide("confirmModal");
  $("confirmYes").onclick = () => {
    hide("confirmModal");
    const f = confirmFn;
    confirmFn = null;
    f?.();
  };
  $("exportAdvanced").onclick = exportAdvancedConfig;
  $("importAdvanced").onclick = () => {
    fileMode = "advanced";
    $("file").click();
  };
  for (const [id, k] of [
    ["unified", "unified"],
    ["sound", "sound"],
  ])
    $(id).onchange = (e) => {
      S.settings[k] = e.target.checked;
      save();
      render();
    };
  for (const [id, k] of [
    ["globalCount", "countSize"],
    ["globalIcon", "iconSize"],
    ["globalName", "nameSize"],
    ["volume", "volume"],
  ])
    $(id).oninput = (e) => {
      S.settings[k] = +e.target.value;
      $(id + "Val").textContent = e.target.value + (id === "volume" ? "%" : "px");
      save();
      render();
    };
  for (const [id, k] of [
    ["themeBg", "bg"],
    ["themePanel", "panel"],
    ["themePanel2", "panel2"],
    ["themeText", "text"],
    ["themeAccent", "accent"],
    ["themeLine", "line"],
  ])
    $(id).oninput = (e) => {
      S.theme[k] = e.target.value;
      save();
      applyTheme();
    };
  $("customCSS").oninput = (e) => {
    S.theme.customCSS = e.target.value;
    save();
    applyTheme();
  };
  $("resetTheme").onclick = () => {
    S.theme = clone(defaultTheme);
    save();
    syncPrefs();
    render();
    note("Thème réinitialisé");
  };
  $("exportGlobal").onclick = exportGlobalConfig;
  $("exportTab").onclick = exportTabConfig;
  $("exportAll").onclick = () => backup(false);
  $("importGlobal").onclick = () => {
    fileMode = "global";
    $("file").click();
  };
  $("importTab").onclick = () => {
    fileMode = "tab";
    $("file").click();
  };
  $("importAll").onclick = () => {
    fileMode = "all";
    $("file").click();
  };
  $("file").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      note("Fichier trop volumineux");
      e.target.value = "";
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (fileMode === "global") importGlobalConfig(data);
        else if (fileMode === "tab") importTabConfig(data);
        else if (fileMode === "advanced") importAdvancedConfig(data);
        else importData(data, false);
      } catch (x) {
        note("Fichier invalide");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };
  $("historyFilter").onchange = renderHistory;
  $("historySort").onchange = renderHistory;
  $("undoDeleted").onclick = () => {
    S.logs.push(...deleted);
    [...new Set(deleted.map((l) => l.tallyId))].forEach(recompute);
    deleted = [];
    clearTimeout(deleteTimer);
    $("undoBar").classList.remove("show");
    save();
    render();
    renderHistory();
  };
  $("mailHistory").onclick = () => (location.href = "mailto:?subject=" + encodeURIComponent("Historique COUNTr") + "&body=" + encodeURIComponent(csv(visibleLogs())));
  $("exportHistoryCsv").onclick = () => download("\ufeff" + csv(visibleLogs()), "countr-historique-" + BipoCore.date(new Date()) + ".csv", "text/csv;charset=utf-8");
  let bipoDay = BipoCore.date(new Date()),
    entryTally = null,
    entryPendingClick = false;
  const logDay = BipoCore.logDay;
  function readBipo(t, day) {
    return BipoCore.read(t, S.logs, day);
  }
  function storageWarning(message) {
    let box = $("bipoStorageWarning");
    if (!box) {
      box = document.createElement("p");
      box.id = "bipoStorageWarning";
      box.className = "bipoHint bipoWarn";
      box.setAttribute("role", "alert");
      document.querySelector(".bipoBar").before(box);
    }
    box.textContent = message;
  }
  function syncBipoDay() {
    S.tallies.forEach((t) => {
      t.count = readBipo(t, bipoDay).value;
    });
    if ($("bipoDate")) {
      $("bipoDate").value = bipoDay;
      $("bipoDate").max = BipoCore.date(new Date());
      $("nextDay").disabled = bipoDay >= BipoCore.date(new Date());
      const due = (S.bipo?.events || []).filter((e) => !e.done && e.date <= BipoCore.date(new Date()));
      $("bipoHint").textContent = (bipoDay === BipoCore.date(new Date()) ? "Aujourd’hui" : new Date(bipoDay + "T12:00:00").toLocaleDateString("fr-FR")) + " · Valeurs du jour, historique conservé." + (due.length ? " " + due.length + " échéance(s) à vérifier dans Suivi." : "");
    }
  }
  function displayBipo(t) {
    const d = readBipo(t, bipoDay);
    if (t.bipoType === "med") return d.status === "skipped" ? "Non pris" : d.value === 1 ? "✓" : "—";
    return d.value === null
      ? "—"
      : Number(d.value).toLocaleString(document.documentElement.lang || "fr", {
          maximumFractionDigits: 6,
        });
  }
  function recordBipo(t, value, noteText = "", status = null, day = bipoDay) {
    if (otherTabChanged || corruptStorage) {
      storageWarning("Rechargez ou restaurez une sauvegarde avant de modifier les données.");
      return false;
    }
    if (!BipoCore.check(t, value)) {
      note("Valeur hors des limites de ce compteur");
      return false;
    }
    const previous = readBipo(t, day).value;
    const l = {
      id: id(),
      tallyId: t.id,
      name: t.name,
      delta: CounterV2.round((value ?? 0) - (previous ?? 0)),
      total: value,
      ts: iso(),
      day,
      bipoOp: "set",
      bipoStatus: status,
      note: noteText,
      kind: t.bipoType || "count",
      prescription: t.prescription || "",
    };
    S.logs.push(l);
    lastAction = l;
    $("undo").disabled = false;
    play();
    save();
    render();
    return true;
  }
  function clickBipo(t) {
    const d = readBipo(t, bipoDay);
    if (t.noteMode && t.noteMode !== "never") {
      openBipoEntry(t, true);
      return;
    }
    if (t.bipoType === "value") {
      openBipoEntry(t);
      return;
    }
    if (t.bipoType === "med") {
      if (d.status === "taken" || d.value === 1) {
        note("Prise déjà confirmée. Utilisez ✎ pour corriger.");
        return;
      }
      recordBipo(t, 1, d.note, "taken");
      note("Prise confirmée");
      return;
    }
    recordBipo(t, CounterV2.round((d.value ?? 0) + (t.step || 1)), d.note);
  }
  function openBipoEntry(t, pendingClick = false) {
    entryTally = t.id;
    entryPendingClick = pendingClick;
    const d = readBipo(t, bipoDay);
    $("bipoEntryTitle").textContent = (t.icon || "") + " " + t.name + " · " + bipoDay;
    $("bipoValueField").hidden = t.bipoType === "med";
    $("bipoStatusField").hidden = t.bipoType !== "med";
    $("bipoValue").value = pendingClick && t.bipoType === "count" ? CounterV2.round((d.value ?? 0) + (t.step || 1)) : (d.value ?? "");
    $("bipoValue").min = t.bipoMin ?? "";
    $("bipoValue").max = t.bipoMax ?? "";
    $("bipoStatus").value = pendingClick && t.bipoType === "med" ? "taken" : d.status || "unknown";
    $("bipoEntryNote").value = d.note || "";
    $("bipoEntryNote").required = pendingClick && t.noteMode === "required";
    $("bipoClearValue").hidden = pendingClick;
    $("bipoRxHint").textContent = t.help || t.prescription || (t.bipoType === "med" ? "Recopiez votre prescription dans ⋮ > Avancées. Une absence de saisie ne signifie pas un oubli." : t.bipoMin !== null && t.bipoMin !== undefined ? "Échelle : " + t.bipoMin + " à " + t.bipoMax : "Saisissez une valeur, ou laissez vide pour non renseigné.");
    show("bipoEntry");
  }
  function selectedDate(d) {
    if (!BipoCore.validDay(d) || d > BipoCore.date(new Date())) return;
    bipoDay = d;
    lastAction = null;
    $("undo").disabled = true;
    render();
  }
  function newBipoTally(tab, key, name, icon, color, type = "count", step = 1, min = 0, max = null) {
    return {
      id: "bipo-" + key,
      tabId: tab,
      count: null,
      createdAt: iso(),
      name,
      icon,
      color,
      size: "third",
      step,
      goal: null,
      period: "none",
      hours: 1,
      parentId: null,
      countSize: 38,
      iconSize: 26,
      autoExport: true,
      bipoType: type,
      bipoMin: min,
      bipoMax: max,
      prescription: "",
    };
  }
  function initBipo() {
    document.title = "COUNTr · " + boardModel.name;
    const brand = document.querySelector(".brand");
    brand.textContent = "COUNTr · " + boardModel.name;
    if (boardModel.logo) {
      const logo = document.createElement("img");
      logo.className = "boardLogo";
      logo.src = boardModel.logo;
      logo.alt = "";
      brand.before(logo);
    }
    $("configureBoard").href = "../config/?id=" + encodeURIComponent(boardId);
    if (boardId !== "bipo") {
      $("copyV1").hidden = true;
      $("copyV1").nextElementSibling.hidden = true;
    }

    S.bipo = S.bipo && typeof S.bipo === "object" ? S.bipo : { notes: {}, signals: "", actions: "", events: [] };
    S.bipo.notes ||= {};
    S.bipo.events = Array.isArray(S.bipo.events) ? S.bipo.events : [];
    if (!S.bipo.initialized && !S.tallies.length && boardId === "bipo" && boardModel.revision === "builtin-1") {
      S.tabs = [
        { id: "daily", name: "Quotidien", color: "#456A8A" },
        { id: "treatment", name: "Traitement", color: "#477354" },
        { id: "feelings", name: "Ressentis", color: "#806080" },
        { id: "habits", name: "Rythme", color: "#8b7445" },
      ];
      active = "daily";
      set(ACTIVE, active);
      const defs = [
        ["daily", "sleep", "Sommeil (h)", "😴", "#7DA0C4", "value", 0.25, 0, 24],
        ["daily", "rest", "Qualité du repos /5", "🌙", "#6687A7", "value", 1, 1, 5],
        ["daily", "mood", "Humeur −3 à +3", "🧠", "#8e9cbd", "value", 1, -3, 3],
        ["daily", "energy", "Énergie /10", "⚡", "#c3ab67", "value", 1, 0, 10],
        ["daily", "stress", "Stress /10", "💭", "#ac8797", "value", 1, 0, 10],
        ["treatment", "morning", "Prise matin", "💊", "#76A98D", "med", 1, 0, 1],
        ["treatment", "noon", "Prise midi", "💊", "#79a29b", "med", 1, 0, 1],
        ["treatment", "evening", "Prise soir", "🌙", "#6687A7", "med", 1, 0, 1],
        ["treatment", "effects", "Effets gênants", "⚠️", "#c89472", "count", 1, 0, null],
        ["treatment", "benefits", "Bénéfices ressentis", "🌱", "#8caf8c", "count", 1, 0, null],
        ["feelings", "agitation", "Agitation", "⚡", "#D66A55", "count", 1, 0, null],
        ["feelings", "thoughts", "Pensées rapides", "💭", "#C95E68", "count", 1, 0, null],
        ["feelings", "withdrawal", "Repli", "🏠", "#8981aa", "count", 1, 0, null],
        ["feelings", "interest", "Perte d’intérêt", "◼️", "#818ba9", "count", 1, 0, null],
        ["feelings", "fatigue", "Fatigue forte", "🔋", "#7a96aa", "count", 1, 0, null],
        ["habits", "meals", "Repas", "🍽️", "#C9A45C", "count", 1, 0, null],
        ["habits", "outside", "Sortie dehors", "☀️", "#D0AE59", "count", 1, 0, null],
        ["habits", "activity", "Activité (min)", "🚶", "#79A879", "count", 10, 0, null],
        ["habits", "water", "Verres d’eau", "💧", "#79a7bd", "count", 1, 0, null],
        ["habits", "coffee", "Café / stimulants", "☕", "#b9987c", "count", 1, 0, null],
      ];
      S.tallies = defs.map((x) => newBipoTally(...x));
      S.layouts = {};
      S.tabs.forEach((tab) => (S.layouts[tab.id] = [...S.tallies.filter((t) => t.tabId === tab.id).map((t) => t.id), null]));
      S.bipo.initialized = true;
    }
    $("bipoDate").onchange = (e) => {
      if (!BipoCore.validDay(e.target.value) || e.target.value > BipoCore.date(new Date())) {
        e.target.value = bipoDay;
        return;
      }
      selectedDate(e.target.value);
    };
    $("previousDay").onclick = () => selectedDate(BipoCore.range(bipoDay, 2)[0]);
    $("nextDay").onclick = () => {
      const d = new Date(bipoDay + "T12:00:00");
      d.setDate(d.getDate() + 1);
      selectedDate(BipoCore.date(d));
    };
    $("bipoToday").onclick = () => selectedDate(BipoCore.date(new Date()));
    $("bipoEntryForm").onsubmit = (e) => {
      e.preventDefault();
      const t = S.tallies.find((t) => t.id === entryTally);
      if (!t) return;
      const noteText = $("bipoEntryNote").value.trim();
      if (entryPendingClick && t.noteMode === "required" && !noteText) {
        note("Une note est requise pour ce compteur");
        $("bipoEntryNote").focus();
        return;
      }
      const status = t.bipoType === "med" ? $("bipoStatus").value : null,
        value = t.bipoType === "med" ? (status === "unknown" ? null : status === "taken" ? 1 : 0) : $("bipoValue").value === "" ? null : Number($("bipoValue").value);
      if (recordBipo(t, value, noteText, status === "unknown" ? null : status)) {
        entryPendingClick = false;
        hide("bipoEntry");
      }
    };
    $("bipoClearValue").onclick = () => {
      const t = S.tallies.find((t) => t.id === entryTally);
      if (t && recordBipo(t, null, $("bipoEntryNote").value.trim(), null)) hide("bipoEntry");
    };
    $("dayNote").onclick = () => {
      $("bipoDailyNote").value = S.bipo.notes[bipoDay] || "";
      show("bipoNote");
    };
    $("bipoNoteForm").onsubmit = (e) => {
      e.preventDefault();
      S.bipo.notes[bipoDay] = $("bipoDailyNote").value.trim();
      save();
      hide("bipoNote");
      note("Note enregistrée");
    };
    $("bipoPlan").onclick = () => {
      $("personalSignals").value = S.bipo.signals || "";
      $("personalActions").value = S.bipo.actions || "";
      $("bipoEventDate").value = BipoCore.date(new Date());
      renderBipoEvents();
      show("bipoPlanModal");
    };
    $("bipoPlanForm").onsubmit = (e) => {
      e.preventDefault();
      S.bipo.signals = $("personalSignals").value.trim();
      S.bipo.actions = $("personalActions").value.trim();
      save();
      note("Repères enregistrés");
    };
    $("bipoEventForm").onsubmit = (e) => {
      e.preventDefault();
      const name = $("bipoEventName").value.trim(),
        date = $("bipoEventDate").value;
      if (!name || !BipoCore.validDay(date)) return;
      S.bipo.events.push({ id: id(), name, date, done: false });
      $("bipoEventName").value = "";
      save();
      renderBipoEvents();
      render();
    };
    $("copyV1").onclick = copyBipoV1;
    $("bipoReview").onclick = () => {
      renderBipoReview();
      show("bipoReviewModal");
    };
    ["bipoReviewDays", "includeDailyNotes", "includePlan"].forEach((x) => ($(x).onchange = renderBipoReview));
    $("downloadBipoText").onclick = () => {
      renderBipoReview();
      download($("bipoReviewText").textContent, "countr-" + boardId + "-bilan-" + bipoDay + ".txt", "text/plain;charset=utf-8");
    };
    $("downloadBipoBackup").onclick = () => backup(false);
    $("bipoHistoryDay").onchange = renderHistory;
  }
  function renderBipoEvents() {
    $("bipoEvents").innerHTML =
      [...S.bipo.events]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => `<label class="check"><input type="checkbox" data-bipo-event="${esc(e.id)}" ${e.done ? "checked" : ""}>${esc(e.date)} · ${esc(e.name)}${e.done ? " · effectué" : ""}</label>`)
        .join("") || '<p class="hint">Aucune échéance ajoutée.</p>';
    document.querySelectorAll("[data-bipo-event]").forEach(
      (x) =>
        (x.onchange = () => {
          const e = S.bipo.events.find((e) => e.id === x.dataset.bipoEvent);
          if (e) {
            e.done = x.checked;
            save();
            renderBipoEvents();
            render();
          }
        }),
    );
  }
  function renderBipoReview() {
    const dates = BipoCore.range(bipoDay, +$("bipoReviewDays").value),
      include = $("includeDailyNotes").checked,
      lines = ["COUNTr · " + boardModel.name + " · du " + dates[0] + " au " + bipoDay, "Observations personnelles ; les jours sans saisie restent non renseignés."];
    const charts = [];
    for (const t of S.tallies) {
      const values = dates.map((day) => readBipo(t, day)),
        known = values.filter((x) => x.value !== null);
      if (t.bipoType === "med") {
        const taken = values.filter((x) => x.status === "taken" || x.value === 1).length,
          skipped = values.filter((x) => x.status === "skipped").length;
        lines.push("\n" + t.name + " : " + taken + " prise(s) confirmée(s), " + skipped + " non prise(s) déclarée(s), " + (dates.length - taken - skipped) + " jour(s) non renseigné(s).");
      } else {
        const avg = known.length ? Math.round((known.reduce((n, x) => n + x.value, 0) / known.length) * 100) / 100 : null;
        lines.push("\n" + t.name + " : " + (avg === null ? "aucune saisie" : "moyenne " + avg + " sur " + known.length + " jour(s) renseigné(s)"));
        if (t.bipoType === "value") {
          const lo = t.bipoMin ?? 0,
            hi = t.bipoMax ?? Math.max(...known.map((x) => x.value), 1);
          charts.push(`<div class="bipoTrend"><b>${esc(t.name)}</b><div class="bipoSpark" role="img" aria-label="${esc(t.name)} : évolution des jours renseignés ; valeurs dans le bilan ci-dessous">${values.map((x, i) => `<span class="${x.value === null ? "missing" : ""}" style="height:${x.value === null ? 2 : Math.max(3, ((x.value - lo) / (hi - lo || 1)) * 36 + 2)}px" title="${dates[i]} : ${x.value ?? "non renseigné"}"></span>`).join("")}</div><span>${avg ?? "—"}</span></div>`);
        }
      }
      for (let i = 0; i < dates.length; i++) {
        const x = values[i];
        if (x.value !== null || x.status || (include && x.note)) lines.push(dates[i] + " : " + (x.status === "taken" ? "prise confirmée" : x.status === "skipped" ? "non prise déclarée" : (x.value ?? "non renseigné")) + (include && x.note ? " · " + x.note : ""));
      }
    }
    const start = dates[0];
    if (include) {
      lines.push("\nNOTES DU JOUR");
      for (const day of dates) if (S.bipo.notes[day]) lines.push(day + " : " + S.bipo.notes[day]);
      const changes = S.logs.filter((l) => l.prescription && logDay(l) >= start && logDay(l) <= bipoDay);
      if (changes.length) {
        lines.push("\nCONSIGNES RECOPIÉES AU MOMENT DES SAISIES");
        changes.forEach((l) => lines.push(logDay(l) + " · " + l.name + " : " + l.prescription));
      }
    }
    if ($("includePlan").checked) {
      lines.push("\nREPÈRES PERSONNELS", S.bipo.signals || "", S.bipo.actions || "");
      S.bipo.events.filter((e) => e.date >= start && e.date <= bipoDay).forEach((e) => lines.push(e.date + " · " + e.name + " · " + (e.done ? "effectué" : "à vérifier")));
    }
    $("bipoReviewText").textContent = lines.filter((x) => x !== "").join("\n");
    $("bipoTrends").innerHTML = charts.join("");
  }
  function copyBipoV1() {
    let old;
    try {
      old = JSON.parse(localStorage.getItem("tallycounter_v2") || "null");
    } catch (e) {
      note("Données V1 illisibles");
      return;
    }
    const tab = old?.tabs?.find((t) => t.preset === "bipolar-v1" || t.name === "Équilibre quotidien");
    if (!tab || !Array.isArray(old.tallies)) {
      note("Aucun onglet Bipo V1 trouvé dans ce navigateur");
      return;
    }
    if (S.bipo.copiedV1) {
      note("La V1 a déjà été copiée dans cette V2");
      return;
    }
    ask("Copier l’onglet Bipo V1 et son historique dans un nouvel onglet ? La V1 restera intacte.", () => {
      const tabId = "v1-" + id(),
        map = new Map(),
        copy = [];
      for (const t of old.tallies.filter((t) => t.tabId === tab.id)) {
        const tid = "v1-" + id();
        map.set(t.id, tid);
        copy.push({
          ...t,
          id: tid,
          tabId,
          count: null,
          bipoType: "count",
          bipoMin: 0,
          bipoMax: null,
        });
      }
      S.tabs.push({
        id: tabId,
        name: "Bipo V1 · copie",
        color: tab.color || "#456A8A",
      });
      S.tallies.push(...copy);
      S.layouts[tabId] = copy.map((t) => t.id);
      for (const l of old.logs || []) {
        if (map.has(l.tallyId) && Number.isFinite(l.delta) && !Number.isNaN(new Date(l.ts).getTime())) S.logs.push({ ...l, id: id(), tallyId: map.get(l.tallyId) });
      }
      S.bipo.copiedV1 = true;
      active = tabId;
      set(ACTIVE, active);
      save();
      render();
      hide("bipoPlanModal");
      note("Onglet V1 copié ; valeurs par jour issues de son historique");
    });
  }

  initBipo();
  save();
  render();
  CounterV2.mount({
    boardId,
    state: () => S,
    tiles: () => S.tallies,
    active: () => active,
    day: () => bipoDay,
    locked: () => S.settings.locked,
    blocked: () => corruptStorage || otherTabChanged,
    validDay: BipoCore.validDay,
    uid: BoardStore.uid,
    read: readBipo,
    record: (t, value, noteText, day) => recordBipo(t, value, noteText, null, day),
    entry: openBipoEntry,
    configure: openCounter,
    layout: ensureLayout,
    save,
    render,
    notify: note,
    backup: () => backup(false),
    history: (t) => {
      renderHistory();
      $("historyFilter").value = t.id;
      renderHistory();
      show("historyModal");
    },
  });
  const protectedActions = ["saveCounter", "saveCounterBottom", "saveTab", "saveTabBottom", "deleteCounter", "deleteTab", "resetCounter", "resetTheme", "importGlobal", "importTab", "importAll", "importAdvanced", "copyV1"];
  document.addEventListener(
    "click",
    (e) => {
      const button = e.target.closest("button,a");
      if (S.settings.locked && button && protectedActions.includes(button.id)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        note("Déverrouillez les réglages pour cette action.");
      }
    },
    true,
  );
  for (const event of ["input", "change"])
    document.addEventListener(
      event,
      (e) => {
        if (S.settings.locked && e.target.closest("#prefsModal,#counterModal,#tabModal")) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  setTimeout(checkReminder, 250);
  if (!storageOK) note("Stockage privé : exportez vos données");
})();

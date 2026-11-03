(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    B = BoardStore;
  const esc = (x) =>
    String(x ?? "").replace(
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
  const params = new URLSearchParams(location.search),
    form = $("#tileForm");
  let model,
    expected,
    active,
    selected,
    dirty = false,
    testing = false,
    tabEditing,
    timer,
    stale = false;
  const examples = new Map();
  function fail(e) {
    $("#editorError").textContent = e.message;
    $("#editorError").hidden = false;
  }
  try {
    model = params.has("new") ? B.blank() : B.editable(params.get("id") || "bipo");
    if (!model) throw Error("Configuration introuvable. Revenez au sélecteur de versions.");
    if (B.isLocked(model.id)) throw Error("Réglages verrouillés : ouvrez le compteur et passez en mode Modifier.");
    expected = model.revision === "new" ? null : model.revision;
    active = model.tabs[0].id;
    selected = model.tiles.find((t) => t.tabId === active)?.id;
  } catch (e) {
    fail(e);
    $("#editorBody").hidden = true;
    $("#saveModel").disabled = $("#openBoard").disabled = true;
    return;
  }
  const tile = () => model.tiles.find((t) => t.id === selected);
  function changed() {
    dirty = true;
    $("#saveState").textContent = "À enregistrer";
    $("#saveState").className = "dirty";
  }
  function notify(text) {
    $("#toast").textContent = text;
    $("#toast").hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => ($("#toast").hidden = true), 3500);
  }
  function metadata() {
    model.name = $("#boardName").value.trim();
    model.condition = $("#condition").value.trim();
    model.description = $("#description").value.trim();
  }
  function save() {
    if (stale) {
      fail(Error("Rechargez l’éditeur : les données ont changé dans un autre onglet."));
      return false;
    }
    metadata();
    if (!form.hidden && !form.reportValidity()) return false;
    try {
      B.validate(model);
      model = B.save(model, expected);
      expected = model.revision;
      dirty = false;
      $("#saveState").textContent = "Enregistré";
      $("#saveState").className = "status";
      $("#editorError").hidden = true;
      history.replaceState(null, "", "?id=" + encodeURIComponent(model.id));
      notify("Configuration enregistrée ; historique conservé.");
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  }
  $("#saveModel").onclick = save;
  $("#openBoard").onclick = () => {
    if (save()) location.href = "../Bipo-V2/?board=" + encodeURIComponent(model.id);
  };
  for (const k of ["boardName", "condition", "description"]) {
    $("#" + k).value = model[k === "boardName" ? "name" : k];
    $("#" + k).oninput = () => {
      metadata();
      changed();
    };
  }
  function showLogo() {
    $("boardLogoPreview").src = model.logo || "";
    $("boardLogoPreview").hidden = !model.logo;
    $("removeBoardLogo").hidden = !model.logo;
  }
  $("boardLogo").onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      fail(Error("Logo trop lourd : 1 Mo maximum."));
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      model.logo = String(reader.result);
      changed();
      showLogo();
    };
    reader.readAsDataURL(file);
  };
  $("removeBoardLogo").onclick = () => {
    model.logo = "";
    $("boardLogo").value = "";
    changed();
    showLogo();
  };
  showLogo();
  $("#saveState").textContent = expected ? "Configuration chargée" : "Nouvelle configuration";
  $("#exportModel").onclick = () => {
    metadata();
    try {
      B.validate(model);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(B.clean(model), null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "countr-modele-" + model.id + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      fail(e);
    }
  };
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === B.LIBKEY || e.key === B.stateKey(model.id)) {
      stale = true;
      fail(Error("La configuration ou le suivi a changé dans un autre onglet. Rechargez avant de continuer."));
    }
  });
  function contrast(c) {
    const n = c
      .slice(1)
      .match(/../g)
      .map((x) => parseInt(x, 16));
    return (0.299 * n[0] + 0.587 * n[1] + 0.114 * n[2]) / 255 > 0.62 ? "#111318" : "#f7f8fa";
  }
  function view(name) {
    document.body.dataset.view = name;
    document.querySelectorAll(".mobile-view button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === name));
  }
  document.querySelectorAll(".mobile-view button").forEach((b) => (b.onclick = () => view(b.dataset.view)));
  function render() {
    if (!model.tabs.some((t) => t.id === active)) active = model.tabs[0].id;
    $("#previewTabs").innerHTML = model.tabs.map((t) => `<button role="tab" aria-selected="${t.id === active}" class="${t.id === active ? "active" : ""}" data-tab="${esc(t.id)}" style="background:${esc(t.color)};color:${contrast(t.color)}">${esc(t.name)}</button>`).join("");
    document.querySelectorAll("[data-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          active = b.dataset.tab;
          selected = model.tiles.find((t) => t.tabId === active)?.id;
          render();
          inspector();
        }),
    );
    $("#previewGrid").innerHTML =
      model.tiles
        .filter((t) => t.tabId === active)
        .map((t) => `<button class="preview-tile ${esc(t.size)} ${t.id === selected && !testing ? "selected" : ""}" data-tile="${esc(t.id)}" ${testing ? "" : `aria-pressed="${t.id === selected}"`} style="background:${esc(t.color)};color:${contrast(t.color)}" aria-label="${testing ? "Tester" : "Modifier"} ${esc(t.name)}"><span class="preview-top"><span class="preview-number">${esc(examples.has(t.id) ? examples.get(t.id) : t.bipoType === "med" ? "—" : t.bipoType === "value" ? (t.bipoMin ?? 0) : 0)}</span><span class="preview-icon">${esc(t.icon)}</span></span><span class="preview-name">${esc(t.name)}${t.unit ? " (" + esc(t.unit) + ")" : ""}</span></button>`)
        .join("") + '<button class="preview-plus" id="addTile" aria-label="Ajouter une tuile">+</button>';
    document.querySelectorAll("[data-tile]").forEach(
      (b) =>
        (b.onclick = () => {
          const t = model.tiles.find((t) => t.id === b.dataset.tile);
          if (testing) {
            let n = examples.has(t.id) ? examples.get(t.id) : t.bipoType === "value" ? (t.bipoMin ?? 0) : 0;
            n = t.bipoType === "med" ? (n === 1 ? 0 : 1) : Math.round((n + t.step) * 1e8) / 1e8;
            if (t.bipoMin != null) n = Math.max(n, t.bipoMin);
            if (t.bipoMax != null) n = Math.min(n, t.bipoMax);
            examples.set(t.id, n);
            render();
          } else {
            selected = t.id;
            render();
            inspector();
            view("edit");
          }
        }),
    );
    $("#addTile").onclick = () => {
      const t = {
        id: B.uid(),
        tabId: active,
        name: "Nouveau compteur",
        icon: "#",
        color: "#557fb8",
        size: "third",
        bipoType: "count",
        step: 1,
        bipoMin: 0,
        bipoMax: null,
        goal: null,
        unit: "",
        help: "",
        noteMode: "never",
      };
      model.tiles.push(t);
      selected = t.id;
      changed();
      render();
      inspector();
      view("edit");
    };
  }
  function choices() {
    const t = tile();
    if (!t) return;
    $("#selectionIcon").textContent = t.icon;
    document.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.size === t.size));
    document.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.kind === t.bipoType));
    document.querySelectorAll("[data-color]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.color.toLowerCase() === t.color.toLowerCase()));
    for (const k of ["step", "goal", "unit", "bipoMin", "bipoMax"]) form.elements[k].disabled = t.bipoType === "med";
    const group = model.tiles.filter((x) => x.tabId === t.tabId),
      i = group.indexOf(t);
    $("#moveUp").disabled = i === 0;
    $("#moveDown").disabled = i === group.length - 1;
  }
  function inspector() {
    const t = tile();
    form.hidden = !t;
    $("#emptySelection").hidden = !!t;
    if (!t) return;
    form.elements.tabId.innerHTML = model.tabs.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
    for (const k of ["name", "icon", "color", "step", "unit", "bipoMin", "bipoMax", "tabId", "goal", "help", "noteMode"]) form.elements[k].value = t[k] ?? "";
    $("#tileError").textContent = "";
    choices();
  }
  function update() {
    const t = tile();
    if (!t) return;
    for (const k of ["name", "icon", "unit", "help", "tabId", "color", "noteMode"]) t[k] = form.elements[k].value;
    for (const k of ["step", "goal", "bipoMin", "bipoMax"]) t[k] = form.elements[k].value === "" ? null : Number(form.elements[k].value);
    active = t.tabId;
    changed();
    render();
    choices();
    try {
      B.validate(model);
      $("#tileError").textContent = "";
    } catch (e) {
      $("#tileError").textContent = "Vérifiez le nom, l’incrément positif et les limites minimum / maximum.";
    }
  }
  form.oninput = update;
  form.onchange = update;
  form.onsubmit = (e) => {
    e.preventDefault();
    save();
  };
  $("#emojiChoices").innerHTML = ["#", "😴", "🌙", "🧠", "⚡", "💊", "☀️", "💧", "☕", "🚶", "🍽️", "✓"].map((x) => `<button type="button" data-emoji="${x}" aria-label="Icône ${x}">${x}</button>`).join("");
  $("#colorChoices").innerHTML = ["#7da0c4", "#6687a7", "#8e9cbd", "#c3ab67", "#ac8797", "#76a98d", "#d66a55", "#c95e68", "#8981aa", "#79a879", "#79a7bd", "#b9987c"].map((c) => `<button type="button" data-color="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join("");
  document.querySelectorAll("[data-emoji]").forEach(
    (b) =>
      (b.onclick = () => {
        form.elements.icon.value = b.dataset.emoji;
        update();
      }),
  );
  document.querySelectorAll("[data-color]").forEach(
    (b) =>
      (b.onclick = () => {
        form.elements.color.value = b.dataset.color;
        update();
      }),
  );
  document.querySelectorAll("[data-size]").forEach(
    (b) =>
      (b.onclick = () => {
        tile().size = b.dataset.size;
        changed();
        render();
        choices();
      }),
  );
  const numericDrafts = new Map();
  document.querySelectorAll("[data-kind]").forEach(
    (b) =>
      (b.onclick = () => {
        const t = tile(),
          next = b.dataset.kind;
        if (t.bipoType === next) return;
        if (next === "med") {
          numericDrafts.set(t.id, Object.fromEntries(["step", "bipoMin", "bipoMax", "goal", "unit"].map((k) => [k, t[k]])));
          Object.assign(t, {
            step: 1,
            bipoMin: 0,
            bipoMax: 1,
            goal: null,
            unit: "",
          });
        } else if (t.bipoType === "med")
          Object.assign(
            t,
            numericDrafts.get(t.id) || {
              step: 1,
              bipoMin: 0,
              bipoMax: null,
              goal: null,
              unit: "",
            },
          );
        t.bipoType = next;
        examples.delete(t.id);
        changed();
        render();
        inspector();
      }),
  );
  function move(dir) {
    const t = tile(),
      group = model.tiles.filter((x) => x.tabId === t.tabId),
      other = group[group.indexOf(t) + dir];
    if (!other) return;
    const a = model.tiles.indexOf(t),
      b = model.tiles.indexOf(other);
    [model.tiles[a], model.tiles[b]] = [model.tiles[b], model.tiles[a]];
    changed();
    render();
    choices();
  }
  $("#moveUp").onclick = () => move(-1);
  $("#moveDown").onclick = () => move(1);
  $("#duplicateTile").onclick = () => {
    const t = tile(),
      copy = { ...t, id: B.uid(), name: (t.name + " · copie").slice(0, 80) };
    model.tiles.splice(model.tiles.indexOf(t) + 1, 0, copy);
    selected = copy.id;
    changed();
    render();
    inspector();
  };
  $("#deleteTile").onclick = () => {
    if (!confirm("Retirer cette tuile ? Son historique reste conservé.")) return;
    model.tiles = model.tiles.filter((t) => t.id !== selected);
    selected = model.tiles.find((t) => t.tabId === active)?.id;
    changed();
    render();
    inspector();
  };
  $("#testPreview").onclick = () => {
    testing = !testing;
    $("#testPreview").setAttribute("aria-pressed", testing);
    $("#testPreview").textContent = testing ? "✎ Revenir à la sélection" : "▶ Tester les interactions";
    $("#previewHint").textContent = testing ? "Touchez une tuile pour essayer sa valeur. Aucune donnée enregistrée." : "Sélectionnez une tuile pour la modifier.";
    render();
  };
  function openTab(isNew) {
    tabEditing = isNew ? null : active;
    const t = isNew ? { name: "Nouvel onglet", color: "#456a8a" } : model.tabs.find((t) => t.id === active);
    $("#tabForm").elements.name.value = t.name;
    $("#tabForm").elements.color.value = t.color;
    $("#deleteTabConfig").hidden = isNew || model.tabs.length === 1;
    $("#tabLeft").disabled = isNew || model.tabs.indexOf(t) === 0;
    $("#tabRight").disabled = isNew || model.tabs.indexOf(t) === model.tabs.length - 1;
    $("#tabDialog").showModal();
  }
  $("#addTab").onclick = () => openTab(true);
  $("#editTab").onclick = () => openTab(false);
  $("#closeTab").onclick = () => $("#tabDialog").close();
  $("#tabForm").onsubmit = (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      t = tabEditing ? model.tabs.find((t) => t.id === tabEditing) : { id: B.uid() };
    if (!f.elements.name.value.trim()) return;
    Object.assign(t, {
      name: f.elements.name.value.trim(),
      color: f.elements.color.value,
    });
    if (!tabEditing) model.tabs.push(t);
    active = t.id;
    selected = model.tiles.find((x) => x.tabId === active)?.id;
    changed();
    render();
    inspector();
    $("#tabDialog").close();
  };
  function moveTab(dir) {
    const i = model.tabs.findIndex((t) => t.id === tabEditing),
      j = i + dir;
    if (i < 0 || j < 0 || j >= model.tabs.length) return;
    [model.tabs[i], model.tabs[j]] = [model.tabs[j], model.tabs[i]];
    changed();
    render();
    $("#tabLeft").disabled = j === 0;
    $("#tabRight").disabled = j === model.tabs.length - 1;
  }
  $("#tabLeft").onclick = () => moveTab(-1);
  $("#tabRight").onclick = () => moveTab(1);
  $("#deleteTabConfig").onclick = () => {
    if (model.tabs.length === 1 || !confirm("Retirer cet onglet et ses tuiles ? Les historiques restent conservés.")) return;
    model.tabs = model.tabs.filter((t) => t.id !== tabEditing);
    model.tiles = model.tiles.filter((t) => t.tabId !== tabEditing);
    active = model.tabs[0].id;
    selected = model.tiles.find((t) => t.tabId === active)?.id;
    changed();
    render();
    inspector();
    $("#tabDialog").close();
  };
  render();
  inspector();
})();

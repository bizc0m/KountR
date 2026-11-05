(function () {
  "use strict";

  const board = document.documentElement.dataset.board || location.pathname.split("/").filter(Boolean).pop() || "countr";
  const key = "countr_skin_" + board;
  const styles = document.getElementById("skinNoteMistress");

  function apply(value) {
    const skin = value === "classic" ? "classic" : "notemistress";
    document.body.dataset.skin = skin;
    if (styles) styles.disabled = skin !== "notemistress";
    localStorage.setItem(key, skin);
    const select = document.getElementById("skinSelector");
    if (select) select.value = skin;
  }

  function buildLayout() {
    const grid = document.getElementById("grid");
    const controls = document.querySelector(".bipoBar");
    const hint = document.getElementById("bipoHint");
    if (!grid || !controls || document.querySelector(".nm-app-shell")) return;
    const shell = document.createElement("div");
    shell.className = "nm-app-shell";
    const sidebar = document.createElement("aside");
    sidebar.className = "nm-sidebar";
    sidebar.setAttribute("aria-label", "Outils du suivi");
    const sideTitle = document.createElement("div");
    sideTitle.className = "nm-sidebar-title";
    sideTitle.textContent = "Outils";
    const workspace = document.createElement("section");
    workspace.className = "nm-workspace";
    controls.parentNode.insertBefore(shell, controls);
    shell.append(sidebar, workspace);
    sidebar.append(sideTitle, controls);
    if (hint) sidebar.append(hint);
    workspace.append(grid);
  }

  function buildSelector() {
    const prefs = document.querySelector("#prefsModal .sheet");
    const firstSection = prefs && prefs.querySelector(".section");
    if (!prefs || !firstSection || document.getElementById("skinSelector")) return;
    const field = document.createElement("div");
    field.className = "field skin-field";
    field.innerHTML = '<label for="skinSelector">Interface</label><select id="skinSelector"><option value="notemistress">NoteMistress</option><option value="classic">COUNTr sombre</option></select>';
    firstSection.insertAdjacentElement("afterend", field);
    field.querySelector("select").addEventListener("change", (event) => apply(event.target.value));
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildLayout();
    buildSelector();
    apply(localStorage.getItem(key) || "notemistress");
  });
})();

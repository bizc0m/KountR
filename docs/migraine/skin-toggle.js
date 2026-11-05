(function () {
  "use strict";
  const SKIN_KEY = "countr_skin_migraine";
  const BRAND_KEY = "countr_white_label_migraine";
  const SKINS = new Set(["dark", "light", "notemistress", "custom"]);
  const defaults = {
    name: "COUNTr",
    subtitle: "",
    logo: "",
    favicon: "",
    primary: "#409cff",
    secondary: "#ffcf40",
    helpUrl: "",
    supportUrl: "https://buymeacoffee.com/bizcom",
    hideCountr: false,
  };
  const byId = (id) => document.getElementById(id);
  const safeGet = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } };
  const isWebUrl = (value) => !value || /^https?:\/\//i.test(value);
  const isImageData = (value) => !value || /^data:image\/(?:png|jpeg|webp|gif|svg\+xml);/i.test(value);

  function normalizedSkin(value) {
    if (value === "classic") return "dark";
    return SKINS.has(value) ? value : "notemistress";
  }

  function applySkin(value, persist = true) {
    const skin = normalizedSkin(value);
    const legacy = byId("noteMistressSkin");
    if (legacy) legacy.disabled = skin !== "notemistress";
    document.body.dataset.skin = skin;
    document.documentElement.dataset.skin = skin;
    if (persist) safeSet(SKIN_KEY, skin);
    const selector = byId("skinSelector");
    if (selector) selector.value = skin;
  }

  function readBrand(boardSubtitle = "") {
    const raw = safeGet(BRAND_KEY);
    try { return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults, subtitle: boardSubtitle }; }
    catch (_) { return { ...defaults }; }
  }

  function ensureBrandNodes() {
    const brand = document.querySelector(".brand");
    if (!brand) return "";
    const previous = brand.textContent.trim();
    if (!byId("whiteLabelName")) {
      const parts = previous.split(/\s*[·|—]\s*/, 2);
      const name = document.createElement("span");
      const subtitle = document.createElement("i");
      name.id = "whiteLabelName";
      subtitle.id = "whiteLabelSubtitle";
      name.textContent = parts[0] || "COUNTr";
      subtitle.textContent = parts[1] || "";
      brand.replaceChildren(name, " ", subtitle);
    }
    return previous.split(/\s*[·|—]\s*/, 2)[1] || "";
  }

  function validBrand(value) {
    const brand = { ...defaults, ...(value || {}) };
    if (!isImageData(brand.logo) || !isImageData(brand.favicon)) throw Error("Le logo ou favicon n’est pas une image Base64/SVG valide.");
    if (!isWebUrl(brand.helpUrl) || !isWebUrl(brand.supportUrl)) throw Error("Les liens doivent commencer par http:// ou https://.");
    if ((brand.logo.length + brand.favicon.length) > 1500000) throw Error("Les images dépassent 1,5 Mo.");
    brand.name = String(brand.name || "").slice(0, 40);
    brand.subtitle = String(brand.subtitle || "").slice(0, 40);
    brand.hideCountr = !!brand.hideCountr;
    return brand;
  }

  function setFavicon(value) {
    let link = document.querySelector('link[rel="icon"]');
    if (!value) { if (link) link.remove(); return; }
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.append(link); }
    link.href = value;
  }

  function applyBrand(value, persist = true) {
    const brand = validBrand(value);
    const visibleName = brand.hideCountr && brand.name.trim().toLowerCase() === "countr" ? "" : brand.name.trim();
    byId("whiteLabelName").textContent = visibleName;
    byId("whiteLabelSubtitle").textContent = brand.subtitle;
    byId("whiteLabelName").closest(".brand").hidden = !visibleName && !brand.subtitle;
    const logo = byId("whiteLabelLogo");
    logo.hidden = !brand.logo;
    if (brand.logo) logo.src = brand.logo; else logo.removeAttribute("src");
    const help = byId("whiteLabelHelp");
    help.hidden = !brand.helpUrl;
    if (brand.helpUrl) help.href = brand.helpUrl; else help.removeAttribute("href");
    const support = byId("whiteLabelSupport");
    support.hidden = !brand.supportUrl;
    if (brand.supportUrl) support.href = brand.supportUrl;
    document.documentElement.style.setProperty("--brand-primary", brand.primary);
    document.documentElement.style.setProperty("--brand-secondary", brand.secondary);
    document.title = [visibleName, brand.subtitle].filter(Boolean).join(" · ") || "Compteur";
    setFavicon(brand.favicon);
    if (persist && !safeSet(BRAND_KEY, JSON.stringify(brand))) throw Error("La marque blanche est trop volumineuse pour ce navigateur.");
    syncBrandForm(brand);
    return brand;
  }

  function syncBrandForm(brand) {
    const fields = { brandNameInput: "name", brandSubtitleInput: "subtitle", brandLogoInput: "logo", brandFaviconInput: "favicon", brandPrimaryInput: "primary", brandSecondaryInput: "secondary", brandHelpInput: "helpUrl", brandSupportInput: "supportUrl" };
    for (const [id, key] of Object.entries(fields)) if (byId(id)) byId(id).value = brand[key] || "";
    if (byId("brandHideCountrInput")) byId("brandHideCountrInput").checked = brand.hideCountr;
  }

  function brandFromForm() {
    return validBrand({
      name: byId("brandNameInput").value,
      subtitle: byId("brandSubtitleInput").value,
      logo: byId("brandLogoInput").value.trim(),
      favicon: byId("brandFaviconInput").value.trim(),
      primary: byId("brandPrimaryInput").value,
      secondary: byId("brandSecondaryInput").value,
      helpUrl: byId("brandHelpInput").value.trim(),
      supportUrl: byId("brandSupportInput").value.trim(),
      hideCountr: byId("brandHideCountrInput").checked,
    });
  }

  function downloadConfig() {
    const data = { app: "COUNTr", kind: "appearance", version: 1, skin: normalizedSkin(safeGet(SKIN_KEY)), brand: readBrand() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "countr-apparence.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  }

  addEventListener("DOMContentLoaded", function () {
    const boardSubtitle = ensureBrandNodes();
    applySkin(safeGet(SKIN_KEY) || "notemistress", false);
    applyBrand(readBrand(boardSubtitle), false);
    byId("skinSelector")?.addEventListener("change", (event) => applySkin(event.target.value));
    byId("whiteLabelPanel")?.addEventListener("input", (event) => {
      if (event.target.id === "brandFile") return;
      try { applyBrand(brandFromForm()); } catch (_) {}
    });
    byId("brandExport")?.addEventListener("click", downloadConfig);
    byId("brandImport")?.addEventListener("click", () => byId("brandFile").click());
    byId("brandReset")?.addEventListener("click", () => applyBrand(defaults));
    byId("brandFile")?.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        if (file.size > 2000000) throw Error("Fichier trop volumineux.");
        const data = JSON.parse(await file.text());
        if (data?.kind !== "appearance" || !data.brand) throw Error("Configuration d’apparence invalide.");
        applyBrand(data.brand); applySkin(data.skin);
      } catch (error) { alert(error.message); }
      event.target.value = "";
    });
  });
})();

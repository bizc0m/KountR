(function () {
  "use strict";
  const key = "countr_skin_migraine";
  const link = document.getElementById("noteMistressSkin");

  function apply(value) {
    const skin = value === "classic" ? "classic" : "notemistress";
    link.disabled = skin === "classic";
    document.body.dataset.skin = skin;
    localStorage.setItem(key, skin);
    const selector = document.getElementById("skinSelector");
    if (selector) selector.value = skin;
  }

  addEventListener("DOMContentLoaded", function () {
    const selector = document.getElementById("skinSelector");
    if (selector) selector.addEventListener("change", function () { apply(selector.value); });
    apply(localStorage.getItem(key) || "notemistress");
  });
})();

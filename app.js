const storageKey = "ring-palette-v1";

const blankState = {
  sizes: [],
  colors: [],
  saved: [],
  theme: "light"
};

const sampleState = {
  sizes: [
    { id: "s1", name: "18g 5/32", note: "small connectors", availableColorIds: ["c2", "c5"] },
    { id: "s2", name: "18g 3/16", note: "Byzantine", availableColorIds: ["c1", "c3", "c5"] },
    { id: "s3", name: "16g 1/4", note: "base rows", availableColorIds: ["c2", "c4", "c5", "c6"] },
    { id: "s4", name: "20g 1/8", note: "detail work", availableColorIds: ["c3", "c4"] }
  ],
  colors: [
    { id: "c1", name: "Matte black", hex: "#141414" },
    { id: "c2", name: "Peacock blue", hex: "#007c89" },
    { id: "c3", name: "Champagne", hex: "#c6a25a" },
    { id: "c4", name: "Ruby", hex: "#a61d3b" },
    { id: "c5", name: "Bright silver", hex: "#cfd7df" },
    { id: "c6", name: "Violet", hex: "#6941c6" }
  ],
  saved: [],
  theme: "light"
};

let state = loadState();
let selectedSizes = new Set();
let currentCombo = null;

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  sizePicker: document.querySelector("#sizePicker"),
  sizeList: document.querySelector("#sizeList"),
  colorList: document.querySelector("#colorList"),
  savedList: document.querySelector("#savedList"),
  sizeName: document.querySelector("#sizeName"),
  sizeNote: document.querySelector("#sizeNote"),
  colorName: document.querySelector("#colorName"),
  colorHex: document.querySelector("#colorHex"),
  colorCount: document.querySelector("#colorCount"),
  patternStyle: document.querySelector("#patternStyle"),
  weaveName: document.querySelector("#weaveName"),
  comboTitle: document.querySelector("#comboTitle"),
  paletteStrip: document.querySelector("#paletteStrip"),
  assignmentList: document.querySelector("#assignmentList"),
  toast: document.querySelector("#toast"),
  emptyTemplate: document.querySelector("#emptyTemplate")
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    const loaded = stored && Array.isArray(stored.sizes) && Array.isArray(stored.colors)
      ? { ...blankState, ...stored }
      : structuredClone(blankState);
    return normalizeState(loaded);
  } catch {
    return structuredClone(blankState);
  }
}

function normalizeState(nextState) {
  const colorIds = nextState.colors.map((color) => color.id);
  return {
    ...nextState,
    sizes: nextState.sizes.map((size) => ({
      ...size,
      availableColorIds: Array.isArray(size.availableColorIds)
        ? size.availableColorIds.filter((id) => colorIds.includes(id))
        : [...colorIds]
    }))
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 1800);
}

function emptyNode(message = "Add a few ring sizes and colors to get started.") {
  const node = els.emptyTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("span").textContent = message;
  return node;
}

function render() {
  document.body.classList.toggle("dark", state.theme === "dark");
  renderSizePicker();
  renderSizes();
  renderColors();
  renderSaved();
}

function renderSizePicker() {
  els.sizePicker.replaceChildren();
  if (!state.sizes.length) {
    els.sizePicker.append(emptyNode("Add ring sizes in the Stash tab."));
    return;
  }

  state.sizes.forEach((size) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${selectedSizes.has(size.id) ? " is-selected" : ""}`;
    button.textContent = `${size.name} (${size.availableColorIds.length})`;
    button.addEventListener("click", () => {
      selectedSizes.has(size.id) ? selectedSizes.delete(size.id) : selectedSizes.add(size.id);
      renderSizePicker();
    });
    els.sizePicker.append(button);
  });
}

function renderSizes() {
  els.sizeList.replaceChildren();
  if (!state.sizes.length) {
    els.sizeList.append(emptyNode("Add the ring sizes you actually keep around."));
    return;
  }

  state.sizes.forEach((size) => {
    const item = document.createElement("article");
    item.className = "size-item";
    item.innerHTML = `
      <div class="section-heading">
        <div>
          <strong></strong>
          <div class="item-note"></div>
        </div>
        <button class="danger-button" type="button" aria-label="Remove size">Remove</button>
      </div>
      <div class="color-toggle-list" aria-label="Available colors"></div>
    `;
    item.querySelector("strong").textContent = size.name;
    item.querySelector(".item-note").textContent = size.note
      ? `${size.note} · ${size.availableColorIds.length} stocked colors`
      : `${size.availableColorIds.length} stocked colors`;
    item.querySelector("button").addEventListener("click", () => {
      state.sizes = state.sizes.filter((entry) => entry.id !== size.id);
      selectedSizes.delete(size.id);
      saveState();
      render();
    });
    renderColorToggles(item.querySelector(".color-toggle-list"), size);
    els.sizeList.append(item);
  });
}

function renderColorToggles(container, size) {
  container.replaceChildren();
  if (!state.colors.length) {
    container.append(emptyNode("Add colors first, then mark which ones exist in this size."));
    return;
  }

  state.colors.forEach((color) => {
    const label = document.createElement("label");
    label.className = `color-toggle${size.availableColorIds.includes(color.id) ? " is-selected" : ""}`;
    label.innerHTML = `
      <input type="checkbox">
      <span class="color-dot"></span>
      <span></span>
    `;
    const input = label.querySelector("input");
    input.checked = size.availableColorIds.includes(color.id);
    label.querySelector(".color-dot").style.background = color.hex;
    label.querySelector("span:last-child").textContent = color.name;
    input.addEventListener("change", () => {
      size.availableColorIds = input.checked
        ? [...new Set([...size.availableColorIds, color.id])]
        : size.availableColorIds.filter((id) => id !== color.id);
      saveState();
      render();
    });
    container.append(label);
  });
}

function renderColors() {
  els.colorList.replaceChildren();
  if (!state.colors.length) {
    els.colorList.append(emptyNode("Add the anodized, painted, or metal colors you like."));
    return;
  }

  state.colors.forEach((color) => {
    const item = document.createElement("article");
    item.className = "item";
    item.innerHTML = `
      <div class="item-main">
        <span class="color-dot"></span>
        <div>
          <strong></strong>
          <div class="item-note"></div>
        </div>
      </div>
      <button class="danger-button" type="button" aria-label="Remove color">Remove</button>
    `;
    item.querySelector(".color-dot").style.background = color.hex;
    item.querySelector("strong").textContent = color.name;
    item.querySelector(".item-note").textContent = color.hex.toUpperCase();
    item.querySelector("button").addEventListener("click", () => {
      state.colors = state.colors.filter((entry) => entry.id !== color.id);
      state.sizes = state.sizes.map((size) => ({
        ...size,
        availableColorIds: size.availableColorIds.filter((id) => id !== color.id)
      }));
      saveState();
      render();
    });
    els.colorList.append(item);
  });
}

function renderSaved() {
  els.savedList.replaceChildren();
  if (!state.saved.length) {
    els.savedList.append(emptyNode("Save a combo from the Build tab when one feels right."));
    return;
  }

  state.saved.forEach((combo) => {
    const item = document.createElement("article");
    item.className = "saved-item";
    item.innerHTML = `
      <div class="section-heading">
        <strong></strong>
        <button class="danger-button" type="button">Delete</button>
      </div>
      <div class="mini-palette"></div>
      <div class="item-note"></div>
    `;
    item.querySelector("strong").textContent = combo.name || "Untitled weave";
    item.querySelector(".item-note").textContent = combo.assignments.map((entry) => `${entry.size}: ${entry.colors.join(", ")}`).join(" | ");
    combo.palette.forEach((color) => {
      const swatch = document.createElement("span");
      swatch.className = "mini-swatch";
      swatch.style.background = color.hex;
      swatch.title = color.name;
      item.querySelector(".mini-palette").append(swatch);
    });
    item.querySelector("button").addEventListener("click", () => {
      state.saved = state.saved.filter((entry) => entry.id !== combo.id);
      saveState();
      renderSaved();
    });
    els.savedList.append(item);
  });
}

function addSize() {
  const name = els.sizeName.value.trim();
  if (!name) {
    showToast("Add a ring size first.");
    return;
  }
  state.sizes.push({ id: uid("s"), name, note: els.sizeNote.value.trim(), availableColorIds: [] });
  els.sizeName.value = "";
  els.sizeNote.value = "";
  saveState();
  render();
}

function addColor() {
  const name = els.colorName.value.trim();
  if (!name) {
    showToast("Name the color first.");
    return;
  }
  state.colors.push({ id: uid("c"), name, hex: els.colorHex.value });
  els.colorName.value = "";
  saveState();
  render();
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function colorDistance(a, b) {
  const ar = hexToRgb(a.hex);
  const br = hexToRgb(b.hex);
  return Math.hypot(ar.r - br.r, ar.g - br.g, ar.b - br.b);
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function pickPalette(count, style, sourceColors = state.colors) {
  const colors = shuffle(sourceColors);
  if (count >= colors.length) return colors;
  if (style === "surprise") return colors.slice(0, count);

  let best = colors.slice(0, count);
  let bestScore = -Infinity;
  for (let i = 0; i < 90; i += 1) {
    const candidate = shuffle(sourceColors).slice(0, count);
    const distances = [];
    for (let a = 0; a < candidate.length; a += 1) {
      for (let b = a + 1; b < candidate.length; b += 1) {
        distances.push(colorDistance(candidate[a], candidate[b]));
      }
    }
    const average = distances.reduce((sum, entry) => sum + entry, 0) / Math.max(distances.length, 1);
    const spread = Math.max(...distances, 0) - Math.min(...distances, 0);
    const score = style === "bold" ? average : style === "soft" ? -average : average - spread * 0.22;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function generateCombo() {
  const sizeIds = [...selectedSizes];
  const count = Math.max(1, Math.min(Number(els.colorCount.value) || 1, 8));
  if (!sizeIds.length) {
    showToast("Choose at least one ring size.");
    return;
  }
  const chosenSizes = state.sizes.filter((size) => selectedSizes.has(size.id));
  const colorById = new Map(state.colors.map((color) => [color.id, color]));
  const emptySize = chosenSizes.find((size) => !size.availableColorIds.length);
  if (emptySize) {
    showToast(`${emptySize.name} has no colors marked in stock.`);
    return;
  }

  const availableIds = [...new Set(chosenSizes.flatMap((size) => size.availableColorIds))];
  const availableColors = availableIds.map((id) => colorById.get(id)).filter(Boolean);
  if (availableColors.length < count) {
    showToast(`Only ${availableColors.length} stocked color${availableColors.length === 1 ? "" : "s"} fit those sizes.`);
    return;
  }

  const palette = pickPalette(count, els.patternStyle.value, availableColors);
  const paletteIds = new Set(palette.map((color) => color.id));
  const assignments = chosenSizes.map((size, index) => {
    const stockedPalette = palette.filter((color) => size.availableColorIds.includes(color.id));
    const fallbackColors = size.availableColorIds.map((id) => colorById.get(id)).filter(Boolean);
    const usableColors = stockedPalette.length ? stockedPalette : fallbackColors;
    const offset = index % usableColors.length;
    const useCount = Math.min(usableColors.length, index % 2 === 0 ? usableColors.length : Math.max(1, usableColors.length - 1));
    const colors = Array.from({ length: useCount }, (_, step) => usableColors[(offset + step) % usableColors.length].name);
    const outsidePalette = usableColors.some((color) => !paletteIds.has(color.id));
    return { size: size.name, colors, note: outsidePalette ? "uses an extra stocked color" : "" };
  });

  currentCombo = {
    id: uid("combo"),
    name: els.weaveName.value.trim() || "Untitled weave",
    palette,
    assignments,
    createdAt: new Date().toISOString()
  };
  renderCombo();
}

function renderCombo() {
  els.comboTitle.textContent = currentCombo.name;
  els.paletteStrip.replaceChildren();
  els.assignmentList.replaceChildren();

  currentCombo.palette.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "palette-swatch";
    swatch.style.background = color.hex;
    swatch.textContent = color.name;
    els.paletteStrip.append(swatch);
  });

  currentCombo.assignments.forEach((assignment) => {
    const item = document.createElement("article");
    item.className = "assignment";
    item.innerHTML = `
      <div>
        <strong></strong>
        <div class="item-note"></div>
      </div>
      <div class="mini-palette"></div>
    `;
    item.querySelector("strong").textContent = assignment.size;
    item.querySelector(".item-note").textContent = assignment.note
      ? `${assignment.colors.join(", ")} · ${assignment.note}`
      : assignment.colors.join(", ");
    assignment.colors.forEach((name) => {
      const color = currentCombo.palette.find((entry) => entry.name === name);
      const swatch = document.createElement("span");
      swatch.className = "mini-swatch";
      swatch.style.background = color?.hex || "#999999";
      swatch.title = name;
      item.querySelector(".mini-palette").append(swatch);
    });
    els.assignmentList.append(item);
  });
}

function comboText(combo) {
  return [
    combo.name,
    `Palette: ${combo.palette.map((color) => `${color.name} ${color.hex}`).join(", ")}`,
    ...combo.assignments.map((entry) => `${entry.size}: ${entry.colors.join(", ")}`)
  ].join("\n");
}

async function copyCombo() {
  if (!currentCombo) {
    showToast("Generate a combo first.");
    return;
  }
  await navigator.clipboard.writeText(comboText(currentCombo));
  showToast("Combo copied.");
}

function saveCombo() {
  if (!currentCombo) {
    showToast("Generate a combo first.");
    return;
  }
  state.saved.unshift({ ...currentCombo, id: uid("saved") });
  saveState();
  renderSaved();
  showToast("Saved.");
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.tabs.forEach((entry) => entry.classList.toggle("is-active", entry === tab));
      els.views.forEach((view) => view.classList.toggle("is-active", view.id === `${tab.dataset.view}View`));
    });
  });

  document.querySelector("#addSize").addEventListener("click", addSize);
  document.querySelector("#addColor").addEventListener("click", addColor);
  document.querySelector("#generateCombo").addEventListener("click", generateCombo);
  document.querySelector("#copyCombo").addEventListener("click", copyCombo);
  document.querySelector("#saveCombo").addEventListener("click", saveCombo);
  document.querySelector("#clearSaved").addEventListener("click", () => {
    state.saved = [];
    saveState();
    renderSaved();
  });
  document.querySelector("#selectAllSizes").addEventListener("click", () => {
    selectedSizes = new Set(state.sizes.map((size) => size.id));
    renderSizePicker();
  });
  document.querySelector("#demoData").addEventListener("click", () => {
    state = structuredClone(sampleState);
    selectedSizes = new Set(state.sizes.slice(0, 3).map((size) => size.id));
    saveState();
    render();
    showToast("Sample stash loaded.");
  });
  document.querySelector("#themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    render();
  });
  [els.sizeName, els.sizeNote].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") addSize();
    });
  });
  els.colorName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addColor();
  });
}

bindEvents();
render();

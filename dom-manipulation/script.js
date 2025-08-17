/* =====================================================
   Dynamic Quote Generator — Final Solution
   Covers:
   - Advanced DOM manipulation (dynamic form, rendering)
   - Local/session storage
   - JSON import & export
   - Category filtering with persistence
   - Server sync simulation + conflict resolution (server wins)
   ===================================================== */

/** Storage keys */
const STORAGE = {
  QUOTES: "dqg.quotes",
  LAST_CATEGORY: "dqg.lastCategory",
  LAST_QUOTE_ID: "dqg.lastQuoteId", // sessionStorage
  LAST_SYNC: "dqg.lastSyncTs"
};

/** Seed data (used only if no localStorage yet) */
const SEED_QUOTES = [
  { id: "seed-1", text: "The only way to do great work is to love what you do.", category: "inspiration", source: "seed", version: 1, lastUpdated: Date.now() },
  { id: "seed-2", text: "Simplicity is the soul of efficiency.", category: "productivity", source: "seed", version: 1, lastUpdated: Date.now() },
  { id: "seed-3", text: "What we think, we become.", category: "mindset", source: "seed", version: 1, lastUpdated: Date.now() },
  { id: "seed-4", text: "Talk is cheap. Show me the code.", category: "programming", source: "seed", version: 1, lastUpdated: Date.now() },
];

let quotes = []; // in-memory model

/* ---------- Element getters ---------- */
const els = {
  quoteText: () => document.getElementById("quoteText"),
  quoteCategory: () => document.getElementById("quoteCategory"),
  newQuoteBtn: () => document.getElementById("newQuote"),
  categoryFilter: () => document.getElementById("categoryFilter"),
  addQuoteArea: () => document.getElementById("addQuoteArea"),
  matchesList: () => document.getElementById("matchesList"),
  importFile: () => document.getElementById("importFile"),
  exportBtn: () => document.getElementById("exportJson"),
  statusBox: () => document.getElementById("statusBox"),
};

/* ---------- Utilities ---------- */
function setStatus(msg, type = "info") {
  const el = els.statusBox();
  el.textContent = msg || "";
  el.className = type === "warn" ? "status warn" : "status";
}

function readLocalQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE.QUOTES);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch { return null; }
}

function saveQuotes() {
  localStorage.setItem(STORAGE.QUOTES, JSON.stringify(quotes));
}

function uniqCategories() {
  const s = new Set(quotes.map(q => (q.category || "").trim()).filter(Boolean));
  return [...s].sort((a, b) => a.localeCompare(b));
}

/* ---------- DOM: build Add Quote form dynamically ---------- */
function createAddQuoteForm() {
  const host = els.addQuoteArea();
  host.innerHTML = ""; // reset

  const wrapper = document.createElement("div");
  wrapper.className = "row";

  const inputText = document.createElement("input");
  inputText.type = "text";
  inputText.id = "newQuoteText";
  inputText.placeholder = "Enter a new quote";
  inputText.style.flex = "1 1 320px";

  const inputCat = document.createElement("input");
  inputCat.type = "text";
  inputCat.id = "newQuoteCategory";
  inputCat.placeholder = "Enter quote category";

  const btn = document.createElement("button");
  btn.textContent = "Add Quote";
  btn.className = "primary";
  btn.addEventListener("click", addQuote);

  wrapper.append(inputText, inputCat, btn);
  host.appendChild(wrapper);
}

/* ---------- Populate categories dropdown ---------- */
function populateCategories() {
  const select = els.categoryFilter();
  const previous = localStorage.getItem(STORAGE.LAST_CATEGORY) || select.value || "all";

  select.innerHTML = `<option value="all">All Categories</option>`;
  for (const cat of uniqCategories()) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }

  // restore selection if still valid, else default to all
  const options = [...select.options].map(o => o.value);
  select.value = options.includes(previous) ? previous : "all";
  localStorage.setItem(STORAGE.LAST_CATEGORY, select.value);
}

/* ---------- Render helper for matches list ---------- */
function renderMatchesList() {
  const ul = els.matchesList();
  ul.innerHTML = "";
  const selected = els.categoryFilter().value;
  const list = selected === "all" ? quotes : quotes.filter(q => q.category === selected);
  list.slice(0, 12).forEach(q => {
    const li = document.createElement("li");
    li.textContent = `"${q.text}" — ${q.category}`;
    ul.appendChild(li);
  });
}

/* ---------- Core actions ---------- */
function showRandomQuote() {
  const selected = els.categoryFilter().value;
  const pool = selected === "all" ? quotes : quotes.filter(q => q.category === selected);

  if (!pool.length) {
    els.quoteText().textContent = "No quotes yet for this view. Add one below!";
    els.quoteCategory().textContent = selected === "all" ? "—" : selected;
    setStatus("No quotes available in this view.", "warn");
    renderMatchesList();
    return;
  }

  const q = pool[Math.floor(Math.random() * pool.length)];
  els.quoteText().textContent = q.text;
  els.quoteCategory().textContent = q.category;

  // remember last viewed quote for current tab
  try { sessionStorage.setItem(STORAGE.LAST_QUOTE_ID, q.id); } catch {}
  setStatus("");
  renderMatchesList();
}

/** Filter handler */
function filterQuotes() {
  const select = els.categoryFilter();
  localStorage.setItem(STORAGE.LAST_CATEGORY, select.value);
  showRandomQuote();
}

/** Add quote from dynamic form */
function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl  = document.getElementById("newQuoteCategory");

  const text = (textEl.value || "").trim();
  const category = (catEl.value || "").trim().toLowerCase();

  if (!text || !category) {
    setStatus("Please enter BOTH quote text and category.", "warn");
    return;
  }

  const q = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    text,
    category,
    source: "local",
    version: 1,
    lastUpdated: Date.now()
  };

  quotes.push(q);
  saveQuotes();
  populateCategories(); // also updates dropdown if new category
  // reflect immediately if filter matches
  if (els.categoryFilter().value === "all" || els.categoryFilter().value === category) {
    showRandomQuote();
  } else {
    renderMatchesList();
  }

  textEl.value = "";
  catEl.value = "";
  setStatus("Quote added ✔");
}

/* ---------- JSON Export ---------- */
function exportToJson() {
  const data = JSON.stringify(quotes, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  setStatus("Exported quotes to JSON file.");
}

/* ---------- JSON Import (with validation + dedupe) ---------- */
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(ev) {
    try {
      const raw = JSON.parse(ev.target.result);
      if (!Array.isArray(raw)) throw new Error("File must contain an array of quotes.");
      const normalized = raw
        .filter(x => x && typeof x.text === "string" && typeof x.category === "string")
        .map(x => ({
          id: x.id || `import-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          text: x.text.trim(),
          category: x.category.trim().toLowerCase(),
          source: x.source || "import",
          version: typeof x.version === "number" ? x.version : 1,
          lastUpdated: typeof x.lastUpdated === "number" ? x.lastUpdated : Date.now()
        }));

      const seenId = new Set(quotes.map(q => q.id));
      let added = 0, skipped = 0;

      for (const q of normalized) {
        // prefer de-dupe by id, then by text+category pair
        if (seenId.has(q.id) || quotes.some(x => x.text === q.text && x.category === q.category)) {
          skipped++; continue;
        }
        quotes.push(q);
        seenId.add(q.id);
        added++;
      }

      saveQuotes();
      populateCategories();
      showRandomQuote();
      setStatus(`Quotes imported successfully! Added ${added}, skipped ${skipped}.`);
    } catch (e) {
      setStatus(`Import failed: ${e.message}`, "warn");
    }
  };
  const file = event.target.files?.[0];
  if (file) fileReader.readAsText(file);
}

/* ---------- Initial load & restore ---------- */
function loadInitialData() {
  const local = readLocalQuotes();
  if (local && local.length) {
    quotes = local;
  } else {
    quotes = [...SEED_QUOTES];
    saveQuotes();
  }
}

function tryRestoreLastViewedOrRandom() {
  const lastId = sessionStorage.getItem(STORAGE.LAST_QUOTE_ID);
  const selected = els.categoryFilter().value;

  if (lastId) {
    const q = quotes.find(x => x.id === lastId);
    if (q && (selected === "all" || q.category === selected)) {
      els.quoteText().textContent = q.text;
      els.quoteCategory().textContent = q.category;
      renderMatchesList();
      return;
    }
  }
  showRandomQuote();
}

/* ---------- Server sync simulation + conflict resolution ---------- */
/**
 * Simulate a server using JSONPlaceholder:
 *   GET https://jsonplaceholder.typicode.com/posts?_limit=10
 * Mapping post -> quote:
 *   id: "server-<post.id>"
 *   text: post.title
 *   category: "server"
 * Conflict rule: If a local quote with the same id exists but differs, SERVER WINS.
 */
async function fetchServerQuotes() {
  const url = "https://jsonplaceholder.typicode.com/posts?_limit=10";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const posts = await res.json();
  const now = Date.now();
  return posts.map(p => ({
    id: `server-${p.id}`,
    text: String(p.title || "").trim() || "(untitled)",
    category: "server",
    source: "server",
    version: 1,
    lastUpdated: now
  }));
}

function mergeServerQuotes(serverQuotes) {
  const localById = new Map(quotes.map(q => [q.id, q]));
  let added = 0, replaced = 0;

  for (const s of serverQuotes) {
    if (!localById.has(s.id)) {
      quotes.push(s);
      localById.set(s.id, s);
      added++;
    } else {
      const local = localById.get(s.id);
      // conflict: same id but different content -> server wins
      if (local.text !== s.text || local.category !== s.category) {
        const idx = quotes.findIndex(q => q.id === s.id);
        if (idx >= 0) quotes[idx] = s;
        localById.set(s.id, s);
        replaced++;
      }
    }
  }
  return { added, replaced };
}

async function syncWithServer() {
  try {
    const serverQuotes = await fetchServerQuotes();
    const { added, replaced } = mergeServerQuotes(serverQuotes);
    if (added || replaced) {
      saveQuotes();
      populateCategories();
      if (["all", "server"].includes(els.categoryFilter().value)) {
        showRandomQuote();
      } else {
        renderMatchesList();
      }
      setStatus(`Synced with server. Added ${added}, resolved ${replaced} conflicts.`);
    } else {
      setStatus("Synced with server. No changes.");
    }
    localStorage.setItem(STORAGE.LAST_SYNC, String(Date.now()));
  } catch (e) {
    setStatus(`Sync error: ${e.message}`, "warn");
  }
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Build dynamic form per requirements
  createAddQuoteForm();

  // Load data & UI
  loadInitialData();
  populateCategories();

  // Wire events
  els.newQuoteBtn().addEventListener("click", showRandomQuote);
  els.exportBtn().addEventListener("click", exportToJson);
  // import file input uses inline onchange (and function is global)

  // First render: try restore last viewed quote in this tab
  tryRestoreLastViewedOrRandom();

  // Periodic server sync (every 30s)
  syncWithServer(); // initial
  setInterval(syncWithServer, 30_000);
});

/* ---------- Expose required functions globally ---------- */
window.showRandomQuote = showRandomQuote;
window.createAddQuoteForm = createAddQuoteForm;
window.addQuote = addQuote;
window.populateCategories = populateCategories;
window.filterQuotes = filterQuotes;
window.importFromJsonFile = importFromJsonFile;
window.exportToJson = exportToJson;
window.syncWithServer = syncWithServer;

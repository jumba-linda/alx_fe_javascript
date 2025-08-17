/* =========================
   Dynamic Quote Generator
   ========================= */

/** Storage keys (so everything is in one place) */
const STORAGE = {
  QUOTES: "dqg.quotes",
  LAST_CATEGORY: "dqg.lastCategory",
  LAST_QUOTE_ID: "dqg.lastQuoteId", // sessionStorage
  LAST_SYNC: "dqg.lastSyncTs"
};

/** Seed data (only used on first load if no localStorage) */
const SEED_QUOTES = [
  { id: "seed-1", text: "The only way to do great work is to love what you do.", category: "inspiration", source: "seed", version: 1, lastUpdated: Date.now() },
  { id: "seed-2", text: "Simplicity is the soul of efficiency.", category: "productivity", source: "seed", version: 1, lastUpdated: Date.now() },
  { id: "seed-3", text: "What we think, we become.", category: "mindset", source: "seed", version: 1, lastUpdated: Date.now() },
  { id: "seed-4", text: "Talk is cheap. Show me the code.", category: "programming", source: "seed", version: 1, lastUpdated: Date.now() },
];

let quotes = []; // in-memory model

/* ---------- Element refs ---------- */
const els = {
  quoteText: () => document.getElementById("quoteText"),
  quoteCategory: () => document.getElementById("quoteCategory"),
  quoteDisplay: () => document.getElementById("quoteDisplay"),
  newQuoteBtn: () => document.getElementById("newQuote"),
  categoryFilter: () => document.getElementById("categoryFilter"),
  addQuoteArea: () => document.getElementById("addQuoteArea"),
  matchesList: () => document.getElementById("matchesList"),
  importFile: () => document.getElementById("importFile"),
  exportBtn: () => document.getElementById("exportJson"),
  statusBox: () => document.getElementById("statusBox"),
};

/* ---------- Helpers ---------- */
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
    // basic validation
    if (!Array.isArray(arr)) return null;
    return arr.filter(q => q && typeof q.text === "string" && typeof q.category === "string");
  } catch {
    return null;
  }
}

function saveQuotes() {
  localStorage.setItem(STORAGE.QUOTES, JSON.stringify(quotes));
}

function uniqCategories() {
  const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/* ---------- UI Builders ---------- */

/** Build the Add Quote form from JS (per the spec) */
function createAddQuoteForm() {
  const host = els.addQuoteArea();
  host.innerHTML = ""; // reset

  const wrapper = document.createElement("div");
  wrapper.className = "row";

  const inputText = document.createElement("input");
  inputText.type = "text";
  inputText.id = "newQuoteText";
  inputText.placeholder = "Enter a new quote";
  inputText.style.flex = "1 1 300px";

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

/** Populate categories in the filter dropdown */
function populateCategories() {
  const select = els.categoryFilter();
  // preserve user's current selection
  const previous = select.value || localStorage.getItem(STORAGE.LAST_CATEGORY) || "all";
  // wipe everything except the first option "All"
  select.innerHTML = `<option value="all">All Categories</option>`;

  for (const cat of uniqCategories()) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }
  // restore selection if it still exists
  if ([...select.options].some(o => o.value === previous)) {
    select.value = previous;
  } else {
    select.value = "all";
  }
  localStorage.setItem(STORAGE.LAST_CATEGORY, select.value);
}

/** Render the small list of matching quotes under the main quote */
function renderMatchesList() {
  const ul = els.matchesList();
  ul.innerHTML = "";
  const selected = els.categoryFilter().value;
  const list = selected === "all" ? quotes : quotes.filter(q => q.category === selected);
  list.slice(0, 10).forEach(q => {
    const li = document.createElement("li");
    li.textContent = `"${q.text}" — ${q.category}`;
    ul.appendChild(li);
  });
}

/* ---------- Actions ---------- */

function showRandomQuote() {
  const selected = els.categoryFilter().value;
  const pool = selected === "all" ? quotes : quotes.filter(q => q.category === selected);

  if (!pool.length) {
    els.quoteText().textContent = "No quotes yet for this category. Add one below!";
    els.quoteCategory().textContent = selected === "all" ? "—" : selected;
    setStatus("No quotes available in this view.", "warn");
    renderMatchesList();
    return;
  }

  const random = pool[Math.floor(Math.random() * pool.length)];
  els.quoteText().textContent = random.text;
  els.quoteCategory().textContent = random.category;

  // Remember last viewed (sessionStorage)
  try {
    sessionStorage.setItem(STORAGE.LAST_QUOTE_ID, random.id);
  } catch {}

  setStatus("");
  renderMatchesList();
}

/** Filter handler – just remembers selection and shows a random in that group */
function filterQuotes() {
  const select = els.categoryFilter();
  localStorage.setItem(STORAGE.LAST_CATEGORY, select.value);
  showRandomQuote();
}

/** Add quote from the form */
function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const text = (textEl.value || "").trim();
  const category = (catEl.value || "").trim().toLowerCase();

  if (!text || !category) {
    setStatus("Please enter both quote text and a category.", "warn");
    return;
  }

  const q = {
    id: `local-${Date.now()}`, // rough unique id
    text,
    category,
    source: "local",
    version: 1,
    lastUpdated: Date.now()
  };

  quotes.push(q);
  saveQuotes();
  populateCategories(); // updates dropdown if new category
  // if user is filtering to this category, show it immediately
  if (els.categoryFilter().value === "all" || els.categoryFilter().value === category) {
    showRandomQuote();
  }
  textEl.value = "";
  catEl.value = "";
  setStatus("Quote added ✔");
}

/** Export quotes as JSON file */
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

/** Validate & normalize imported data */
function normalizeImported(arr) {
  const out = [];
  for (const item of arr) {
    if (!item || typeof item.text !== "string" || typeof item.category !== "string") continue;
    out.push({
      id: item.id || `import-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      text: item.text.trim(),
      category: item.category.trim().toLowerCase(),
      source: item.source || "import",
      version: typeof item.version === "number" ? item.version : 1,
      lastUpdated: typeof item.lastUpdated === "number" ? item.lastUpdated : Date.now()
    });
  }
  return out;
}

/** Import from a selected JSON file */
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(ev) {
    try {
      const raw = JSON.parse(ev.target.result);
      if (!Array.isArray(raw)) throw new Error("File must contain an array of quotes");
      const imported = normalizeImported(raw);

      // de-duplicate by id (id wins), then by text+category pair
      const byId = new Map(quotes.map(q => [q.id, q]));
      let added = 0, skipped = 0;

      for (const q of imported) {
        // by id
        if (byId.has(q.id)) { skipped++; continue; }

        // by (text, category)
        const exists = quotes.some(x => x.text === q.text && x.category === q.category);
        if (exists) { skipped++; continue; }

        quotes.push(q);
        byId.set(q.id, q);
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
  const f = event.target.files[0];
  if (f) fileReader.readAsText(f);
}

/* ---------- Persistence & init ---------- */

function loadInitialData() {
  const fromLocal = readLocalQuotes();
  if (fromLocal && fromLocal.length) {
    quotes = fromLocal;
  } else {
    quotes = [...SEED_QUOTES];
    saveQuotes();
  }
}

/** On first render, try to show user's last viewed quote (sessionStorage) */
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

/* ---------- Filtering utilities ---------- */

function onCategoryChange() {
  filterQuotes();
}

/* ---------- Server sync simulation (JSONPlaceholder) ---------- */
/**
 * We’ll use https://jsonplaceholder.typicode.com/posts?_limit=10
 * Map post -> quote:
 *   id: "server-<post.id>"
 *   text: post.title
 *   category: "server"
 * Conflict strategy: server wins if same id exists locally and content differs.
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
      const existing = localById.get(s.id);
      // conflict: same id, different text -> server wins
      if (existing.text !== s.text || existing.category !== s.category) {
        localById.set(s.id, s);
        const idx = quotes.findIndex(q => q.id === s.id);
        if (idx >= 0) quotes[idx] = s;
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
      // If we're viewing a server category, refresh the random pick
      if (els.categoryFilter().value === "server" || els.categoryFilter().value === "all") {
        showRandomQuote();
      }
      setStatus(`Synced. Added ${added}, resolved ${replaced} conflicts.`);
    } else {
      setStatus(`Synced. No changes.`);
    }
    localStorage.setItem(STORAGE.LAST_SYNC, String(Date.now()));
  } catch (e) {
    setStatus(`Sync error: ${e.message}`, "warn");
  }
}

/* ---------- Wiring everything together ---------- */

document.addEventListener("DOMContentLoaded", () => {
  // Build dynamic form UI
  createAddQuoteForm();

  // Load data (localStorage or seed)
  loadInitialData();

  // Populate categories & restore user's last selection
  populateCategories();

  // Event listeners
  els.newQuoteBtn().addEventListener("click", showRandomQuote);
  els.categoryFilter().addEventListener("change", onCategoryChange);
  els.exportBtn().addEventListener("click", exportToJson);
  els.importFile().addEventListener("change", importFromJsonFile);

  // First render
  tryRestoreLastViewedOrRandom();

  // Start periodic sync (every 30s). You can change to 60_000 for 1 min.
  syncWithServer(); // initial
  setInterval(syncWithServer, 30_000);
});

/* ---------- Expose required names for the tasks (optional) ---------- */
// If your checker expects these names to exist globally:
window.showRandomQuote = showRandomQuote;
window.createAddQuoteForm = createAddQuoteForm;
window.filterQuotes = filterQuotes;
window.importFromJsonFile = importFromJsonFile;
window.populateCategories = populateCategories;
window.addQuote = addQuote;


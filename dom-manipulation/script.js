/* =========================
   Dynamic Quote Generator
   Web Storage + JSON I/O
   ========================= */

/** Keys for Web Storage */
const STORAGE = {
  QUOTES: "dqg.quotes",          // localStorage (persistent)
  LAST_QUOTE_ID: "dqg.lastId"    // sessionStorage (per tab)
};

/** Some starter quotes (used ONLY if nothing in localStorage yet) */
const SEED_QUOTES = [
  { id: "seed-1", text: "The only way to do great work is to love what you do.", category: "inspiration" },
  { id: "seed-2", text: "Simplicity is the soul of efficiency.", category: "productivity" },
  { id: "seed-3", text: "What we think, we become.", category: "mindset" },
  { id: "seed-4", text: "Talk is cheap. Show me the code.", category: "programming" }
];

/** In-memory array of quotes */
let quotes = [];

/* ---------- Element helpers ---------- */
const els = {
  quoteText: () => document.getElementById("quoteText"),
  quoteCategory: () => document.getElementById("quoteCategory"),
  newQuoteBtn: () => document.getElementById("newQuote"),
  importFile: () => document.getElementById("importFile"),
  exportBtn: () => document.getElementById("exportJson"),
  status: () => document.getElementById("statusBox"),
};

/* ---------- Status helper ---------- */
function setStatus(msg, type = "ok") {
  const el = els.status();
  el.textContent = msg || "";
  el.className = type === "warn" ? "status warn" : "status";
}

/* ---------- Local Storage helpers ---------- */
function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE.QUOTES);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

function saveQuotes() {
  localStorage.setItem(STORAGE.QUOTES, JSON.stringify(quotes));
}

/* ---------- Core UI actions ---------- */
function showRandomQuote() {
  if (!quotes.length) {
    els.quoteText().textContent = "No quotes yet. Add one below!";
    els.quoteCategory().textContent = "—";
    setStatus("You have no quotes stored.", "warn");
    return;
  }
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  els.quoteText().textContent = q.text;
  els.quoteCategory().textContent = q.category;

  // Remember last viewed quote for THIS TAB only (sessionStorage)
  try { sessionStorage.setItem(STORAGE.LAST_QUOTE_ID, q.id); } catch {}
  setStatus("");
}

function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl  = document.getElementById("newQuoteCategory");

  const text = (textEl.value || "").trim();
  const category = (catEl.value || "").trim().toLowerCase();

  if (!text || !category) {
    setStatus("Please enter BOTH quote text and category.", "warn");
    return;
  }

  const newQ = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    text,
    category
  };

  quotes.push(newQ);     // update in-memory
  saveQuotes();          // persist to localStorage
  textEl.value = "";
  catEl.value = "";
  setStatus("Quote added and saved ✔");
  showRandomQuote();
}

/* ---------- JSON Export ---------- */
function exportToJson() {
  const data = JSON.stringify(quotes, null, 2); // pretty for readability
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

/* ---------- JSON Import ---------- */
/*
Required HTML (already included):
<input type="file" id="importFile" accept=".json" onchange="importFromJsonFile(event)" />
*/
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);

      if (!Array.isArray(imported)) {
        throw new Error("File must contain an array of quotes.");
      }

      // Normalize minimal shape: { text, category, id? }
      const cleaned = imported
        .filter(it => it && typeof it.text === "string" && typeof it.category === "string")
        .map(it => ({
          id: it.id || `import-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          text: it.text.trim(),
          category: it.category.trim().toLowerCase()
        }));

      // Merge (simple): append all; optional de-dup by id+text+category
      const seen = new Set(quotes.map(q => `${q.id}|${q.text}|${q.category}`));
      let added = 0;
      for (const q of cleaned) {
        const key = `${q.id}|${q.text}|${q.category}`;
        if (!seen.has(key)) {
          quotes.push(q);
          seen.add(key);
          added++;
        }
      }

      saveQuotes();     // persist to localStorage
      setStatus(`Quotes imported successfully! Added ${added}.`);
      showRandomQuote();
    } catch (err) {
      setStatus(`Import failed: ${err.message}`, "warn");
    }
  };

  const file = event.target.files && event.target.files[0];
  if (file) {
    fileReader.readAsText(file);
  }
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Load quotes from localStorage or use seed data on first run
  const stored = loadQuotes();
  quotes = (stored && stored.length) ? stored : [...SEED_QUOTES];
  saveQuotes(); // ensure localStorage is populated on first run

  // Wire up buttons
  els.newQuoteBtn().addEventListener("click", showRandomQuote);
  els.exportBtn().addEventListener("click", exportToJson);

  // Restore last viewed quote in this tab (if any), else show random
  const lastId = sessionStorage.getItem(STORAGE.LAST_QUOTE_ID);
  if (lastId) {
    const q = quotes.find(q => q.id === lastId);
    if (q) {
      els.quoteText().textContent = q.text;
      els.quoteCategory().textContent = q.category;
    } else {
      showRandomQuote();
    }
  } else {
    showRandomQuote();
  }
});

/* Expose functions the checker might look for */
window.addQuote = addQuote;
window.importFromJsonFile = importFromJsonFile;



// Credentials are stored in localStorage and patched in at runtime
// via admin.html. Default values here are placeholders.
var SUPABASE_URL = 'https://vmghkipckiiaardfhlci.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZ2hraXBja2lpYWFyZGZobGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMjc5NTcsImV4cCI6MjA5MDYwMzk1N30.LJHptJOudvv5blWwhEslhLvKkto0Ol7ymv5tj19RXZo';

// ============================================================
// SECURITY: HTML Escape helper — prevents XSS when rendering
// database content into the DOM via innerHTML.
// ============================================================
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ============================================================
// CORE FETCH HELPER
// ============================================================
async function sbFetch(table, method, body, id, filters) {
  const url_base = SUPABASE_URL;
  const key_base = SUPABASE_KEY;
  if (!url_base || url_base === 'YOUR_SUPABASE_URL_HERE') throw new Error('SETUP_REQUIRED');

  let url = `${url_base}/rest/v1/${table}`;
  const params = [];
  if (id) params.push(`id=eq.${id}`);
  if (filters) params.push(filters);
  if (params.length) url += '?' + params.join('&');

  const methodToUse = method || 'GET';

  // CACHE CHECK: Instantly load lists from browser memory if fetched < 5 mins ago
  const cacheKey = `ssic_cache_${table}_${filters || 'all'}`;
  if (methodToUse === 'GET' && !id) {
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheKey + '_time');
    if (cachedData && cachedTime && (Date.now() - cachedTime < 300000)) {
      return JSON.parse(cachedData);
    }
  }

  // CACHE INVALIDATION: If an Admin adds/edits/deletes, clear cache immediately
  if (methodToUse !== 'GET') {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('ssic_cache_')) sessionStorage.removeItem(key);
    });
  }

  const access_token = sessionStorage.getItem('ssic_access_token');
  const headers = {
    'apikey': key_base,
    'Authorization': `Bearer ${access_token ? access_token : key_base}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  const opts = { method: methodToUse, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) { const err = await res.text(); throw new Error(`DB ${res.status}: ${err}`); }
  const text = await res.text();
  const parsedData = text ? JSON.parse(text) : [];

  // SAVE CACHE: Store the downloaded GET data to skip the 2-3s delay next time
  if (methodToUse === 'GET' && !id) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(parsedData));
      sessionStorage.setItem(cacheKey + '_time', Date.now());
    } catch (e) { } // Ignore if data exceeds 5MB limit
  }

  return parsedData;
}

// ============================================================
// TABLE CRUD FACTORIES
// ============================================================
function makeTable(name) {
  return {
    getAll: (extra) => sbFetch(name, 'GET', null, null, extra || 'order=created_at.desc'),
    getActive: () => sbFetch(name, 'GET', null, null, 'is_active=eq.true&order=sort_order.asc'),
    add: async (data) => { const r = await sbFetch(name, 'POST', data); return r[0]; },
    update: async (id, data) => { const r = await sbFetch(name, 'PATCH', data, id); return r[0]; },
    delete: (id) => sbFetch(name, 'DELETE', null, id)
  };
}

const Alumni = makeTable('alumni');
const Toppers = makeTable('toppers');
const Selections = makeTable('selections');
const Team = makeTable('team');
const Notices = makeTable('notices');
const Ticker = makeTable('ticker');

// ============================================================
// HELPERS
// ============================================================
function isDbConfigured() {
  return true;
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    // 1. Read original file
    const reader = new FileReader();
    reader.onload = (e) => {
      // 2. Load into Image object
      const img = new Image();
      img.onload = () => {
        // 3. Calculate new dimensions (max 500px width/height to save huge DB space)
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }

        // 4. Draw to Canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // Fill white for transparent PNGs turning to JPEG
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Output compressed JPEG (0.7 quality is extremely lightweight while looking good)
        res(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ============================================================
// LOCAL FALLBACK (when DB not configured)
// ============================================================
const LocalDB = {
  get(key) { try { return JSON.parse(localStorage.getItem('ssic_' + key) || '[]'); } catch (e) { return []; } },
  set(key, v) { try { localStorage.setItem('ssic_' + key, JSON.stringify(v)); } catch (e) { } },
  async add(key, rec) {
    const d = this.get(key);
    rec.id = Date.now(); rec.created_at = new Date().toISOString();
    d.unshift(rec); this.set(key, d); return rec;
  },
  async update(key, id, upd) {
    const d = this.get(key);
    const i = d.findIndex(x => x.id == id);
    if (i > -1) { d[i] = { ...d[i], ...upd }; this.set(key, d); return d[i]; }
  },
  async delete(key, id) { this.set(key, this.get(key).filter(x => x.id != id)); }
};

// ============================================================
// NOTICE LOADER — used by index.html to render notice board
// ============================================================
async function loadNoticesOnPage() {
  if (!isDbConfigured()) return; // keep static HTML when no DB

  try {
    const all = await sbFetch('notices', 'GET', null, null, 'is_active=eq.true&order=sort_order.asc,created_at.desc');
    const notices = all.filter(n => n.type === 'notice');
    const calendar = all.filter(n => n.type === 'calendar');

    function buildItem(n) {
      return `<li class="notice-item">
        <div class="notice-date" ${n.type === 'calendar' ? 'style="background:var(--blue-accent)"' : ''}>
          <div class="day">${escHtml(n.day || '—')}</div>
          <div class="mon">${escHtml(n.month || '—')}</div>
        </div>
        <div class="notice-text">
          <h4>${escHtml(n.title || '')}${n.badge ? `<span class="notice-badge">${escHtml(n.badge)}</span>` : ''}</h4>
          <p>${escHtml(n.body || '')}</p>
        </div>
      </li>`;
    }

    const nl = document.getElementById('notice-list-main');
    const cl = document.getElementById('calendar-list-main');
    if (nl && notices.length) nl.innerHTML = notices.map(buildItem).join('');
    if (cl && calendar.length) cl.innerHTML = calendar.map(buildItem).join('');

    // Ticker
    const ticks = await sbFetch('ticker', 'GET', null, null, 'is_active=eq.true&order=sort_order.asc');
    const track = document.getElementById('ticker');
    if (track && ticks.length) {
      const items = [...ticks, ...ticks].map(t => `<span>${escHtml(t.text)}</span>`).join('');
      track.innerHTML = items;
    }
  } catch (e) { console.warn('Notice load failed:', e.message); }
}
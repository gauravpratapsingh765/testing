// ===== SECURITY: HTML escape helper to prevent XSS =====
function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ===== DATA STORE =====
let alumniList = [];

let editingId = null;
let deletingId = null;
let currentFilter = 'all';
let currentSearch = '';

// ===== INIT =====
async function initAlumni() {
  try {
    if (typeof isDbConfigured === 'function' && isDbConfigured() && typeof Alumni !== 'undefined') {
      alumniList = await Alumni.getAll();
    } else {
      alumniList = JSON.parse(localStorage.getItem('ssic_alumni') || '[]');
    }
  } catch (e) {
    console.error('Error loading alumni:', e);
    alumniList = JSON.parse(localStorage.getItem('ssic_alumni') || '[]');
  }
  renderAlumni();
}

// ===== RENDER =====
function renderAlumni() {
  const grid = document.getElementById('alumniGrid');
  const emptyState = document.getElementById('emptyState');
  let filtered = alumniList.filter(a => {
    const matchCat = currentFilter === 'all' || a.category === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || (a.org || '').toLowerCase().includes(q) || (a.batch || '').includes(q);
    return matchCat && matchSearch;
  });

  // Update counts
  document.getElementById('countBadge').textContent = filtered.length + ' Alumni';
  document.getElementById('heroCount').textContent = alumniList.length + '+';

  // Clear grid (keep add card)
  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    grid.appendChild(makeAddCard());
    return;
  }
  emptyState.style.display = 'none';

  filtered.forEach((a, i) => {
    const card = makeCard(a, i);
    grid.appendChild(card);
  });
  grid.appendChild(makeAddCard());
}

function getCategoryLabel(cat) {
  const m = { engineering: 'Engineering', medical: 'Medical', government: 'Govt. Services', business: 'Business', other: 'Other' };
  return m[cat] || cat;
}
function getCategoryClass(cat) {
  if (cat === 'engineering') return 'blue';
  if (cat === 'medical') return 'gold';
  if (cat === 'government') return '';
  return 'gold';
}

function makeCard(a, index) {
  const div = document.createElement('div');
  div.className = 'alumni-card';
  div.style.animationDelay = (index * 0.06) + 's';
  div.setAttribute('data-id', a.id);

  const photoHtml = a.photo
    ? `<img src="${escHtml(a.photo)}" alt="${escHtml(a.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : `<i class="fas fa-user-tie" style="font-size:44px;color:#c8c8c8;"></i>`;

  const quoteHtml = a.quote
    ? `<div class="alumni-quote">&ldquo;${escHtml(a.quote)}&rdquo;</div>`
    : '';

  const branchBadge = a.branch
    ? `<span class="alumni-tag blue" style="font-size:10px">${escHtml(a.branch)}</span>` : '';

  div.innerHTML = `
    <div class="card-top-bar"></div>
    <div class="alumni-card-inner">
      <div class="alumni-photo-wrap">
        <div class="alumni-photo" id="card-photo-${escHtml(String(a.id))}">${photoHtml}</div>
        <div class="upload-photo-btn" onclick="quickUploadPhoto(${Number(a.id)})" title="Change Photo">
          <i class="fas fa-camera"></i>
        </div>
      </div>
      <div class="alumni-name">${escHtml(a.name)}</div>
      <div class="alumni-role">${escHtml(a.role)}</div>
      ${a.org ? `<div class="alumni-org"><i class="fas fa-building"></i>${escHtml(a.org)}</div>` : ''}
      ${a.location ? `<div class="alumni-batch"><i class="fas fa-map-marker-alt" style="color:var(--red);margin-right:4px;font-size:10px"></i>${escHtml(a.location)}</div>` : ''}
      <div class="alumni-batch">Batch ${escHtml(a.batch || '—')}</div>
      <div class="alumni-tags">
        <span class="alumni-tag ${getCategoryClass(a.category)}">${escHtml(getCategoryLabel(a.category))}</span>
        ${branchBadge}
      </div>
      ${quoteHtml}
      <div class="card-actions">
        <button class="card-btn card-btn-red" onclick="openEditModal(${Number(a.id)})"><i class="fas fa-edit"></i> Edit</button>
        <button class="card-btn card-btn-ghost" onclick="openDeleteModal(${Number(a.id)})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  return div;
}

function makeAddCard() {
  const div = document.createElement('div');
  div.className = 'add-alumni-card';
  div.id = 'addCard';
  div.onclick = openAddModal;
  div.innerHTML = `
    <i class="fas fa-user-plus"></i>
    <span>Add New Alumni</span>
    <small>Click to add an alumni profile</small>`;
  return div;
}

// ===== FILTER & SEARCH =====
function filterAlumni(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAlumni();
}
function searchAlumni() {
  currentSearch = document.getElementById('searchInput').value;
  renderAlumni();
}

// ===== MODAL =====
function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = '✨ Add New Alumni';
  clearForm();
  document.getElementById('addModal').classList.add('open');
}

function openEditModal(id) {
  const a = alumniList.find(x => x.id === id);
  if (!a) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = '✏️ Edit Alumni';
  document.getElementById('f-name').value = a.name || '';
  document.getElementById('f-batch').value = a.batch || '';
  document.getElementById('f-role').value = a.role || '';
  document.getElementById('f-org').value = a.org || '';
  document.getElementById('f-location').value = a.location || '';
  document.getElementById('f-category').value = a.category || 'other';
  document.getElementById('f-branch').value = a.branch || '';
  document.getElementById('f-quote').value = a.quote || '';
  document.getElementById('photoData').value = a.photo || '';
  if (a.photo) {
    document.getElementById('photoPreviewImg').src = a.photo;
    document.getElementById('photoPreviewImg').style.display = 'block';
    document.getElementById('photoIcon').style.display = 'none';
  } else {
    document.getElementById('photoPreviewImg').style.display = 'none';
    document.getElementById('photoIcon').style.display = 'block';
  }
  document.getElementById('addModal').classList.add('open');
}

function openDeleteModal(id) {
  deletingId = id;
  document.getElementById('deleteModal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function clearForm() {
  ['f-name', 'f-batch', 'f-role', 'f-org', 'f-location', 'f-quote'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-category').value = 'engineering';
  document.getElementById('f-branch').value = '';
  document.getElementById('photoData').value = '';
  document.getElementById('photoPreviewImg').src = '';
  document.getElementById('photoPreviewImg').style.display = 'none';
  document.getElementById('photoIcon').style.display = 'block';
}

// ===== PHOTO UPLOAD =====
function handlePhotoUpload(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('photoData').value = e.target.result;
    document.getElementById('photoPreviewImg').src = e.target.result;
    document.getElementById('photoPreviewImg').style.display = 'block';
    document.getElementById('photoIcon').style.display = 'none';
  };
  reader.readAsDataURL(input.files[0]);
}

function quickUploadPhoto(id) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const a = alumniList.find(x => x.id === id);
      if (a) {
        a.photo = ev.target.result;
        saveToStorage();
        renderAlumni();
        showToast('Photo updated!', 'success');
      }
    };
    reader.readAsDataURL(e.target.files[0]);
  };
  input.click();
}

// ===== SAVE =====
function saveAlumni() {
  const name = document.getElementById('f-name').value.trim();
  const role = document.getElementById('f-role').value.trim();
  const batch = document.getElementById('f-batch').value.trim();
  if (!name || !role) {
    showToast('Please fill Name and Role fields.', 'error');
    return;
  }
  const data = {
    name, role, batch,
    org: document.getElementById('f-org').value.trim(),
    location: document.getElementById('f-location').value.trim(),
    category: document.getElementById('f-category').value,
    branch: document.getElementById('f-branch').value,
    quote: document.getElementById('f-quote').value.trim(),
    photo: document.getElementById('photoData').value
  };
  if (editingId) {
    const idx = alumniList.findIndex(x => x.id === editingId);
    if (idx > -1) alumniList[idx] = { ...alumniList[idx], ...data };
    showToast('Alumni updated successfully!', 'success');
  } else {
    data.id = Date.now();
    alumniList.push(data);
    showToast('Alumni added successfully!', 'success');
  }
  saveToStorage();
  closeModal('addModal');
  renderAlumni();
}

// ===== DELETE =====
function confirmDelete() {
  alumniList = alumniList.filter(x => x.id !== deletingId);
  saveToStorage();
  closeModal('deleteModal');
  renderAlumni();
  showToast('Alumni removed.', 'success');
}

// ===== STORAGE =====
function saveToStorage() {
  try { localStorage.setItem('ssic_alumni', JSON.stringify(alumniList)); } catch (e) { }
}

// ===== TOAST =====
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : '') + msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== BACK TO TOP =====
window.addEventListener('scroll', () => {
  const bt = document.getElementById('backTop');
  if (window.scrollY > 300) bt.classList.add('visible');
  else bt.classList.remove('visible');
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ===== INIT =====
initAlumni();
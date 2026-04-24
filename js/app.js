/* ── Lumière Museum · app.js ── */
'use strict';

const STORAGE_KEY = 'lumiere_museum_v1';

// ── STATE ──────────────────────────────────────────────────────────────
let artworks = [];
let pendingImages = [];  // {dataUrl, name}

// ── INIT ───────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initLoader();
  initNavScroll();
  initGlassCanvas();
  initRosette();
  initAboutMosaic();
  renderGallery();
  updateStats();
});

function initLoader() {
  const loader = document.getElementById('loader');
  setTimeout(() => loader.classList.add('hidden'), 1800);
}

function initNavScroll() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('solid', window.scrollY > 80);
  });
}

// ── STORAGE ────────────────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) artworks = JSON.parse(raw);
  } catch (e) {
    artworks = [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(artworks));
  } catch (e) {
    showToast('저장 공간이 부족합니다. 백업 후 일부 이미지를 제거해 주세요.');
  }
  updateStats();
}

function updateStats() {
  document.getElementById('stat-count').textContent = artworks.length;
  const raw = localStorage.getItem(STORAGE_KEY) || '';
  const kb = (new Blob([raw]).size / 1024).toFixed(1);
  document.getElementById('stat-size').textContent = `${kb} KB`;
}

// ── GALLERY ────────────────────────────────────────────────────────────
const TYPE_EMOJI = {
  'stained-glass': '◈',
  '3d-glass':      '◉',
  'mosaic':        '◆',
  'fused-glass':   '◇',
  'leaded-glass':  '▣',
  'other':         '○',
};
const TYPE_LABEL = {
  'stained-glass': 'Stained Glass',
  '3d-glass':      '3D Glass Sculpture',
  'mosaic':        'Glass Mosaic',
  'fused-glass':   'Fused Glass',
  'leaded-glass':  'Leaded Glass',
  'other':         'Other',
};
const PALETTE = [
  ['#8b1a2e','#1a3a8b','#1a6b3c','#5a1a8b'],
  ['#c97d1a','#1a4a8b','#8b1a2e','#1a6b3c'],
  ['#3a1a8b','#8b5a1a','#1a5a4a','#8b1a5a'],
  ['#1a8b5a','#8b3a1a','#1a2a8b','#6b1a8b'],
];

function getCardGlassBg(artwork, index) {
  if (artwork.images && artwork.images.length > 0) {
    return `<img src="${artwork.images[0]}" alt="${escHtml(artwork.title)}" loading="lazy"/>`;
  }
  const colors = PALETTE[index % PALETTE.length];
  const emoji = TYPE_EMOJI[artwork.type] || '◈';
  const svgId = `glass-${index}`;
  return `
    <div class="card-glass-bg" style="background:linear-gradient(135deg,${colors[0]}22,${colors[1]}33,${colors[2]}22,${colors[3]}33);">
      <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;">
        <defs>
          <radialGradient id="${svgId}g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="${colors[1]}" stop-opacity="0.3"/>
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill="url(#${svgId}g)"/>
        <polygon points="100,10 190,55 190,145 100,190 10,145 10,55" fill="none" stroke="${colors[2]}" stroke-width="1.5" stroke-opacity="0.4"/>
        <polygon points="100,30 170,67 170,133 100,170 30,133 30,67" fill="none" stroke="${colors[3]}" stroke-width="1" stroke-opacity="0.3"/>
        <line x1="100" y1="10" x2="100" y2="190" stroke="${colors[0]}" stroke-width="0.5" stroke-opacity="0.2"/>
        <line x1="10" y1="55" x2="190" y2="145" stroke="${colors[1]}" stroke-width="0.5" stroke-opacity="0.2"/>
        <line x1="10" y1="145" x2="190" y2="55" stroke="${colors[2]}" stroke-width="0.5" stroke-opacity="0.2"/>
        <text x="100" y="108" text-anchor="middle" font-size="36" fill="${colors[3]}" fill-opacity="0.5" font-family="serif">${emoji}</text>
      </svg>
    </div>`;
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');

  if (artworks.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = artworks.map((art, i) => `
    <div class="gallery-card" onclick="openDetail(${i})">
      ${getCardGlassBg(art, i)}
      <div class="card-overlay">
        <span class="card-type">${TYPE_LABEL[art.type] || art.type}</span>
        <p class="card-title">${escHtml(art.title)}</p>
        ${art.year ? `<p class="card-year">${art.year}</p>` : ''}
      </div>
      <button class="card-delete" onclick="deleteArtwork(event,${i})" title="삭제">✕</button>
    </div>
  `).join('');
}

// ── ARCHIVE MODAL ──────────────────────────────────────────────────────
function openArchive() {
  document.getElementById('archive-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeArchive() {
  document.getElementById('archive-modal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('archive-form').reset();
  pendingImages = [];
  document.getElementById('upload-preview').innerHTML = '';
}

function submitArtwork(e) {
  e.preventDefault();
  const artwork = {
    id:        Date.now().toString(36),
    title:     document.getElementById('art-title').value.trim(),
    year:      document.getElementById('art-year').value || null,
    artist:    document.getElementById('art-artist').value.trim(),
    type:      document.getElementById('art-type').value,
    size:      document.getElementById('art-size').value.trim(),
    medium:    document.getElementById('art-medium').value.trim(),
    desc:      document.getElementById('art-desc').value.trim(),
    location:  document.getElementById('art-location').value.trim(),
    condition: document.getElementById('art-condition').value,
    images:    pendingImages.map(p => p.dataUrl),
    createdAt: new Date().toISOString(),
  };
  artworks.unshift(artwork);
  saveToStorage();
  renderGallery();
  closeArchive();
  showToast(`"${artwork.title}" 작품이 등록되었습니다.`);
}

// ── IMAGE HANDLING ──────────────────────────────────────────────────────
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.add('drag-over');
}
function handleDragLeave(e) {
  document.getElementById('upload-zone').classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      pendingImages.push({ dataUrl, name: file.name });
      renderPreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderPreviews() {
  const container = document.getElementById('upload-preview');
  container.innerHTML = pendingImages.map((img, i) => `
    <div class="preview-item">
      <img src="${img.dataUrl}" alt="preview ${i}"/>
      <button onclick="removePreview(${i})" type="button">✕</button>
    </div>
  `).join('');
}

function removePreview(index) {
  pendingImages.splice(index, 1);
  renderPreviews();
}

// ── DETAIL MODAL ───────────────────────────────────────────────────────
function openDetail(index) {
  const art = artworks[index];
  if (!art) return;

  const imagesHtml = art.images && art.images.length > 0
    ? `<div class="detail-images">${art.images.map(src =>
        `<img src="${src}" alt="${escHtml(art.title)}" onclick="lightbox(this)"/>`
      ).join('')}</div>`
    : `<div class="detail-no-image">${TYPE_EMOJI[art.type] || '◈'}</div>`;

  const conditionMap = {
    excellent: '완벽 (Excellent)',
    good: '양호 (Good)',
    fair: '보통 (Fair)',
    restoration: '복원 필요',
  };

  document.getElementById('detail-content').innerHTML = `
    ${imagesHtml}
    <span class="detail-badge">${TYPE_LABEL[art.type] || art.type}</span>
    <h2 class="detail-title">${escHtml(art.title)}</h2>
    <div class="detail-meta">
      ${art.year ? `<div class="detail-meta-item"><label>제작연도</label><p>${art.year}</p></div>` : ''}
      ${art.artist ? `<div class="detail-meta-item"><label>작가</label><p>${escHtml(art.artist)}</p></div>` : ''}
      ${art.size ? `<div class="detail-meta-item"><label>크기</label><p>${escHtml(art.size)} cm</p></div>` : ''}
      ${art.medium ? `<div class="detail-meta-item"><label>재료/기법</label><p>${escHtml(art.medium)}</p></div>` : ''}
      ${art.location ? `<div class="detail-meta-item"><label>위치</label><p>${escHtml(art.location)}</p></div>` : ''}
      ${art.condition ? `<div class="detail-meta-item"><label>컨디션</label><p>${conditionMap[art.condition] || art.condition}</p></div>` : ''}
      <div class="detail-meta-item"><label>등록일</label><p>${new Date(art.createdAt).toLocaleDateString('ko-KR')}</p></div>
    </div>
    ${art.desc ? `<p class="detail-desc">${escHtml(art.desc)}</p>` : ''}
  `;

  document.getElementById('detail-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeDetail() {
  document.getElementById('detail-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function lightbox(img) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  const image = document.createElement('img');
  image.src = img.src;
  image.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain;';
  overlay.appendChild(image);
  overlay.onclick = () => document.body.removeChild(overlay);
  document.body.appendChild(overlay);
}

// ── DELETE ─────────────────────────────────────────────────────────────
function deleteArtwork(e, index) {
  e.stopPropagation();
  const art = artworks[index];
  if (!art) return;
  if (!confirm(`"${art.title}" 작품을 삭제하시겠습니까?`)) return;
  artworks.splice(index, 1);
  saveToStorage();
  renderGallery();
  showToast('작품이 삭제되었습니다.');
}

// ── BACKUP / EXPORT ─────────────────────────────────────────────────────
function downloadBackup() {
  const data = {
    museum: 'Lumière Private Museum',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    totalArtworks: artworks.length,
    artworks: artworks,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lumiere-museum-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('컬렉션 백업 파일이 다운로드됩니다.');
}

function importBackup() {
  document.getElementById('import-modal').style.display = 'flex';
}

function processImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const imported = data.artworks || (Array.isArray(data) ? data : []);
      if (!imported.length) { showToast('불러올 작품이 없습니다.'); return; }
      const existingIds = new Set(artworks.map(a => a.id));
      let added = 0;
      imported.forEach(art => {
        if (!existingIds.has(art.id)) { artworks.push(art); added++; }
      });
      saveToStorage();
      renderGallery();
      document.getElementById('import-modal').style.display = 'none';
      showToast(`${added}개 작품을 불러왔습니다.`);
    } catch (e) {
      showToast('올바르지 않은 백업 파일입니다.');
    }
  };
  reader.readAsText(file);
}

// ── TOAST ──────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── CANVAS ANIMATION (HERO) ────────────────────────────────────────────
function initGlassCanvas() {
  const canvas = document.getElementById('glass-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = [
    'rgba(139,26,46,', 'rgba(26,58,139,', 'rgba(26,107,60,',
    'rgba(90,26,139,', 'rgba(201,125,26,', 'rgba(26,74,139,',
    'rgba(139,26,90,', 'rgba(26,107,107,',
  ];

  const panels = [];
  function createPanels() {
    panels.length = 0;
    const cols = Math.ceil(canvas.width / 120) + 2;
    const rows = Math.ceil(canvas.height / 120) + 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jitter = () => (Math.random() - 0.5) * 30;
        panels.push({
          points: [
            { x: c * 120 + jitter(), y: r * 120 + jitter() },
            { x: (c+1)*120 + jitter(), y: r * 120 + jitter() },
            { x: (c+1)*120 + jitter(), y: (r+1)*120 + jitter() },
            { x: c * 120 + jitter(), y: (r+1)*120 + jitter() },
          ],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 0.15 + Math.random() * 0.25,
          targetAlpha: 0.15 + Math.random() * 0.35,
          speed: 0.003 + Math.random() * 0.005,
        });
      }
    }
  }
  createPanels();
  window.addEventListener('resize', createPanels);

  let raf;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0805';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    panels.forEach(p => {
      if (Math.abs(p.alpha - p.targetAlpha) < 0.002) {
        p.targetAlpha = 0.08 + Math.random() * 0.35;
      }
      p.alpha += (p.targetAlpha - p.alpha) * p.speed;

      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      p.points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.closePath();
      ctx.fillStyle = p.color + p.alpha + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,8,5,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    raf = requestAnimationFrame(draw);
  }
  draw();

  const observer = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!raf) draw(); }
    else { cancelAnimationFrame(raf); raf = null; }
  });
  observer.observe(canvas);
}

// ── SVG ROSETTE ────────────────────────────────────────────────────────
function initRosette() {
  const container = document.getElementById('rosette');
  const size = 400;
  const cx = size / 2, cy = size / 2, r = 180;
  const petals = 12;
  const colors = [
    '#8b1a2e', '#1a3a8b', '#1a6b3c', '#5a1a8b',
    '#c97d1a', '#1a4a8b', '#8b1a5a', '#1a5a4a',
    '#3a1a8b', '#8b5a1a', '#1a8b5a', '#8b3a1a',
  ];

  let paths = '';
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    const nextAngle = ((i + 1) / petals) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;
    const ox = cx + Math.cos(angle) * r;
    const oy = cy + Math.sin(angle) * r;
    const nx = cx + Math.cos(nextAngle) * r;
    const ny = cy + Math.sin(nextAngle) * r;
    const bx = cx + Math.cos(midAngle) * (r * 0.55);
    const by = cy + Math.sin(midAngle) * (r * 0.55);
    paths += `<path d="M${cx},${cy} Q${ox},${oy} ${bx},${by} Q${nx},${ny} ${cx},${cy}"
      fill="${colors[i]}" fill-opacity="0.55" stroke="#0a0805" stroke-width="1.5"/>`;
  }

  // Inner ring
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2 + Math.PI / petals;
    const x = cx + Math.cos(angle) * (r * 0.42);
    const y = cy + Math.sin(angle) * (r * 0.42);
    const nx = cx + Math.cos(angle + (Math.PI * 2 / petals)) * (r * 0.42);
    const ny = cy + Math.sin(angle + (Math.PI * 2 / petals)) * (r * 0.42);
    paths += `<path d="M${cx},${cy} L${x},${y} L${nx},${ny} Z"
      fill="${colors[(i + 3) % petals]}" fill-opacity="0.45" stroke="#0a0805" stroke-width="1"/>`;
  }

  // Center
  paths += `<circle cx="${cx}" cy="${cy}" r="30" fill="${colors[0]}" fill-opacity="0.7" stroke="#0a0805" stroke-width="1.5"/>`;
  paths += `<circle cx="${cx}" cy="${cy}" r="14" fill="${colors[5]}" fill-opacity="0.9" stroke="#0a0805" stroke-width="1"/>`;

  // Outer ring lines
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    paths += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle)*r}" y2="${cy + Math.sin(angle)*r}"
      stroke="#0a0805" stroke-width="1" stroke-opacity="0.6"/>`;
  }
  paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(201,168,76,0.35)" stroke-width="1.5"/>`;

  const svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;height:100%;animation:rotateGlass 60s linear infinite;filter:drop-shadow(0 0 20px rgba(201,168,76,0.25))">
    <style>@keyframes rotateGlass { to { transform: rotate(360deg); transform-origin: 50% 50%; } }</style>
    ${paths}
  </svg>`;
  container.innerHTML = svg;
}

// ── ABOUT MOSAIC ───────────────────────────────────────────────────────
function initAboutMosaic() {
  const container = document.getElementById('about-mosaic');
  const size = 400;
  const cols = 8, rows = 8;
  const cw = size / cols, ch = size / rows;
  const colors = [
    '#8b1a2e','#1a3a8b','#1a6b3c','#5a1a8b',
    '#c97d1a','#1a4a8b','#8b1a5a','#1a5a4a',
    '#3a1a8b','#8b5a1a','#1a8b5a','#8b3a1a',
    '#c9a84c','#2a5a8b','#6b3a1a','#1a3a4a',
  ];

  let rects = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const opacity = 0.35 + Math.random() * 0.5;
      const jitter = 1;
      rects += `<rect
        x="${c * cw + jitter}" y="${r * ch + jitter}"
        width="${cw - jitter*2}" height="${ch - jitter*2}"
        fill="${color}" fill-opacity="${opacity}"
        rx="1"/>`;
    }
  }

  container.innerHTML = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"
    style="width:100%;height:100%;filter:drop-shadow(0 0 30px rgba(201,168,76,0.2))">
    <rect width="${size}" height="${size}" fill="#0a0805" rx="4"/>
    ${rects}
    <rect width="${size}" height="${size}" fill="none" stroke="rgba(201,168,76,0.3)" stroke-width="2" rx="4"/>
  </svg>`;
}

// ── UTIL ───────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── MODAL CLOSE ON OVERLAY CLICK ──────────────────────────────────────
document.getElementById('archive-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeArchive();
});
document.getElementById('detail-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDetail();
});
document.getElementById('import-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

// ── KEYBOARD SHORTCUTS ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeArchive();
    closeDetail();
    document.getElementById('import-modal').style.display = 'none';
  }
});

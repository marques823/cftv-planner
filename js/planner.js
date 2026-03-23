// ============================================================
// CAMERA CATALOG — Intelbras + Hikvision + Genérico
// ============================================================
const CATALOG = [
    // INTELBRAS
    { id: 'itb-vhd1220b', brand: 'Intelbras', name: 'VHD 1220 B', type: 'Bullet', icon: '🔵', fov: 82, range: 20, res: 'Full HD 1080p', ir: '20m', color: '0,229,255', desc: '1080p · 82° · IR 20m' },
    { id: 'itb-vhd1420b', brand: 'Intelbras', name: 'VHD 1420 B', type: 'Bullet', icon: '🔵', fov: 78, range: 30, res: '4MP', ir: '30m', color: '0,229,255', desc: '4MP · 78° · IR 30m' },
    { id: 'itb-vhd1220d', brand: 'Intelbras', name: 'VHD 1220 D', type: 'Dome', icon: '🟢', fov: 100, range: 15, res: 'Full HD 1080p', ir: '15m', color: '57,255,20', desc: '1080p · 100° · IR 15m' },
    { id: 'itb-vhd3420d', brand: 'Intelbras', name: 'VHD 3420 D', type: 'Dome', icon: '🟢', fov: 95, range: 25, res: '4MP', ir: '25m', color: '57,255,20', desc: '4MP · 95° · IR 25m' },
    { id: 'itb-vip1220b', brand: 'Intelbras', name: 'VIP 1220 B', type: 'IP Bullet', icon: '🔵', fov: 82, range: 20, res: 'Full HD IP', ir: '20m', color: '0,200,255', desc: 'IP 1080p · 82° · PoE' },
    { id: 'itb-vip3280sd', brand: 'Intelbras', name: 'VIP 3280 SD', type: 'Speed Dome', icon: '🟠', fov: 60, range: 80, res: '2MP PTZ', ir: '80m', color: '255,107,53', desc: 'PTZ · 30x · IR 80m' },
    { id: 'itb-fisheye', brand: 'Intelbras', name: 'VIP S4020 F', type: 'Fisheye', icon: '🟣', fov: 185, range: 10, res: '4MP Fisheye', ir: '10m', color: '180,100,255', desc: 'Fisheye · 185° · IP' },
    // HIKVISION
    { id: 'hik-ds2cd1143', brand: 'Hikvision', name: 'DS-2CD1143G2', type: 'Dome', icon: '🟡', fov: 98, range: 30, res: '4MP AcuSense', ir: '30m', color: '255,220,0', desc: '4MP · 98° · IR 30m' },
    { id: 'hik-ds2cd2143', brand: 'Hikvision', name: 'DS-2CD2143G2', type: 'Dome', icon: '🟡', fov: 100, range: 40, res: '4MP WDR', ir: '40m', color: '255,220,0', desc: '4MP WDR · 100° · IR 40m' },
    { id: 'hik-ds2cd2t47', brand: 'Hikvision', name: 'DS-2CD2T47G2', type: 'Bullet', icon: '🔴', fov: 84, range: 60, res: '4MP AcuSense', ir: '60m', color: '255,50,100', desc: '4MP · 84° · IR 60m' },
    { id: 'hik-ds2cd2t87', brand: 'Hikvision', name: 'DS-2CD2T87G2', type: 'Bullet', icon: '🔴', fov: 80, range: 80, res: '8MP 4K', ir: '80m', color: '255,50,100', desc: '4K · 80° · IR 80m' },
    { id: 'hik-ds2de4425', brand: 'Hikvision', name: 'DS-2DE4425IWG', type: 'PTZ', icon: '🟠', fov: 57, range: 100, res: '4MP PTZ', ir: '100m', color: '255,140,0', desc: 'PTZ · 25x · IR 100m' },
    { id: 'hik-ds2cd63c5', brand: 'Hikvision', name: 'DS-2CD6365G0', type: 'Fisheye', icon: '🟣', fov: 180, range: 12, res: '6MP Fisheye', ir: '15m', color: '180,100,255', desc: 'Fisheye · 6MP · IP' },
    { id: 'hik-ds2cd2045', brand: 'Hikvision', name: 'DS-2CD2045G1', type: 'Bullet', icon: '🔴', fov: 102, range: 40, res: '4MP WDR', ir: '40m', color: '255,80,80', desc: '4MP WDR · 102° · IR 40m' },
    // GENÉRICO
    { id: 'gen-bullet-hd', brand: 'Genérico', name: 'Bullet HD', type: 'Bullet', icon: '⚪', fov: 78, range: 20, res: '1080p', ir: '20m', color: '150,200,220', desc: '1080p · 78° · IR 20m' },
    { id: 'gen-dome-hd', brand: 'Genérico', name: 'Dome HD', type: 'Dome', icon: '⚪', fov: 100, range: 12, res: '1080p', ir: '12m', color: '150,220,150', desc: '1080p · 100° · IR 12m' },
    { id: 'gen-mini-dome', brand: 'Genérico', name: 'Mini Dome', type: 'Dome', icon: '⚪', fov: 110, range: 8, res: '720p', ir: '8m', color: '200,200,200', desc: '720p · 110° · IR 8m' },
];

// ============================================================
// STATE
// ============================================================
let tool = 'select';
let cameras = [];
let walls = [];
let selectedCam = null;
let selectedModel = CATALOG[0];
let brandFilter = 'all';
let plantImage = null;
let zoom = 1, panX = 80, panY = 80;
let isPanning = false, panStart = {};
let isDrawingWall = false, wallStart = null;
let hoveredCam = null;
let isDraggingCam = false, dragOffset = { x: 0, y: 0 };
let editingCamIdx = null, editColor = '0,229,255';
const SCALE = 10; // 10px = 1m at zoom=1

// ============================================================
// CANVAS
// ============================================================
const wrap = document.getElementById('canvas-wrap');
const bgC = document.getElementById('bg-canvas');
const mainC = document.getElementById('main-canvas');
const bgX = bgC.getContext('2d');
const ctx = mainC.getContext('2d');

function resize() {
    bgC.width = mainC.width = wrap.clientWidth;
    bgC.height = mainC.height = wrap.clientHeight;
    drawBg(); draw();
}
window.addEventListener('resize', resize);

// ============================================================
// BACKGROUND
// ============================================================
function drawBg() {
    const W = bgC.width, H = bgC.height;
    bgX.clearRect(0, 0, W, H);
    const gs = 50 * zoom, oX = ((panX % gs) + gs) % gs, oY = ((panY % gs) + gs) % gs;
    bgX.strokeStyle = 'rgba(255,255,255,0.03)'; bgX.lineWidth = 1;
    for (let x = oX; x < W; x += gs) { bgX.beginPath(); bgX.moveTo(x, 0); bgX.lineTo(x, H); bgX.stroke(); }
    for (let y = oY; y < H; y += gs) { bgX.beginPath(); bgX.moveTo(0, y); bgX.lineTo(W, y); bgX.stroke(); }
    const ms = 250 * zoom, mX = ((panX % ms) + ms) % ms, mY = ((panY % ms) + ms) % ms;
    bgX.strokeStyle = 'rgba(255,255,255,0.07)';
    for (let x = mX; x < W; x += ms) { bgX.beginPath(); bgX.moveTo(x, 0); bgX.lineTo(x, H); bgX.stroke(); }
    for (let y = mY; y < H; y += ms) { bgX.beginPath(); bgX.moveTo(0, y); bgX.lineTo(W, y); bgX.stroke(); }
    if (plantImage) {
        bgX.save(); bgX.globalAlpha = 0.6;
        bgX.drawImage(plantImage, panX, panY, plantImage.width * zoom, plantImage.height * zoom);
        bgX.restore();
    }
}

// ============================================================
// DRAW
// ============================================================
function draw() {
    ctx.clearRect(0, 0, mainC.width, mainC.height);
    ctx.save(); ctx.translate(panX, panY); ctx.scale(zoom, zoom);
    walls.forEach(w => {
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2);
        ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 8 / zoom; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2);
        ctx.strokeStyle = '#4a6070'; ctx.lineWidth = 2 / zoom; ctx.stroke();
    });
    cameras.forEach((cam, i) => drawFOV(cam, i === selectedCam));
    cameras.forEach((cam, i) => drawCam(cam, i === selectedCam, i === hoveredCam));
    ctx.restore();
}

function drawFOV(cam, sel) {
    const m = getModel(cam.modelId);
    const fov = cam.fov ?? m.fov;
    const range = (cam.range ?? m.range) * SCALE;
    const rot = (cam.rotation ?? 0) * Math.PI / 180;
    const hf = fov * Math.PI / 180 / 2;
    const c = cam.color || m.color;
    ctx.save(); ctx.translate(cam.x, cam.y);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, range, rot - hf, rot + hf); ctx.closePath();
    ctx.fillStyle = `rgba(${c},0.1)`; ctx.fill();
    ctx.strokeStyle = `rgba(${c},${sel ? .7 : .35})`; ctx.lineWidth = (sel ? 1.5 : 1) / zoom; ctx.stroke();
    ctx.save(); ctx.clip();
    for (let r = range * .25; r <= range; r += range * .25) {
        ctx.beginPath(); ctx.arc(0, 0, r, rot - hf, rot + hf);
        ctx.strokeStyle = `rgba(${c},.05)`; ctx.lineWidth = 1 / zoom; ctx.stroke();
    }
    ctx.restore();
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(rot - hf) * range, Math.sin(rot - hf) * range);
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(rot + hf) * range, Math.sin(rot + hf) * range);
    ctx.strokeStyle = `rgba(${c},.4)`; ctx.lineWidth = 1 / zoom; ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawCam(cam, sel, hov) {
    const m = getModel(cam.modelId);
    const c = cam.color || m.color;
    const r = 10 / zoom;
    ctx.save(); ctx.translate(cam.x, cam.y);
    if (sel || hov) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
        g.addColorStop(0, `rgba(${c},.4)`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = sel ? `rgb(${c})` : `rgba(${c},.85)`; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1.5 / zoom; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * .35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
    const rot = (cam.rotation ?? 0) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(Math.cos(rot) * r, Math.sin(rot) * r);
    ctx.lineTo(Math.cos(rot) * (r + 6 / zoom), Math.sin(rot) * (r + 6 / zoom));
    ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = 2 / zoom; ctx.stroke();
    ctx.font = `${9 / zoom}px "Exo 2",sans-serif`;
    ctx.fillStyle = '#c8d8e8'; ctx.textAlign = 'center';
    ctx.fillText(cam.name || m.name, 0, r + 15 / zoom);
    ctx.restore();
}

// ============================================================
// CATALOG UI
// ============================================================
function getModel(id) { return CATALOG.find(m => m.id === id) || CATALOG[0]; }

function filterBrand(brand, el) {
    brandFilter = brand;
    document.querySelectorAll('.brand-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderCatalog();
}

function renderCatalog() {
    const list = document.getElementById('cam-catalog');
    list.innerHTML = '';
    const filtered = brandFilter === 'all' ? CATALOG : CATALOG.filter(m => m.brand === brandFilter);
    filtered.forEach(m => {
        const div = document.createElement('div');
        div.className = 'cam-item' + (selectedModel?.id === m.id ? ' active-cam' : '');
        div.innerHTML = `
      <div class="cam-icon">${m.icon}</div>
      <div class="cam-info">
        <div class="cam-name">${m.name}<span class="badge badge-brand">${m.brand}</span></div>
        <div class="cam-spec">${m.desc} · ${m.res}</div>
      </div>`;
        div.onclick = () => { selectedModel = m; setTool('camera'); renderCatalog(); };
        list.appendChild(div);
    });
}

// ============================================================
// PLACED LIST
// ============================================================
function renderPlacedList() {
    const list = document.getElementById('cam-placed-list');
    document.getElementById('hdr-cams').textContent = cameras.length;
    document.getElementById('hdr-walls').textContent = walls.length;
    if (!cameras.length) {
        list.innerHTML = '<div class="empty">Nenhuma câmera adicionada.<br><br>Selecione um modelo e clique no canvas.</div>';
        return;
    }
    list.innerHTML = '';
    cameras.forEach((cam, i) => {
        const m = getModel(cam.modelId);
        const c = cam.color || m.color;
        const div = document.createElement('div');
        div.className = 'cam-placed-item' + (i === selectedCam ? ' selected' : '');
        div.innerHTML = `
      <div class="cam-dot" style="background:rgb(${c});box-shadow:0 0 5px rgb(${c})"></div>
      <div class="cam-placed-info">
        <div class="cam-placed-name">${cam.name || m.name}</div>
        <div class="cam-placed-pos">${Math.round(cam.x / SCALE)}m,${Math.round(cam.y / SCALE)}m · ${cam.fov || m.fov}° · ${cam.range || m.range}m</div>
      </div>
      <button class="del-btn" onclick="deleteCam(${i},event)">✕</button>`;
        div.onclick = () => { selectedCam = i; renderPlacedList(); renderProps(); draw(); };
        list.appendChild(div);
    });
}

function deleteCam(i, e) {
    e.stopPropagation();
    cameras.splice(i, 1);
    if (selectedCam === i) selectedCam = null;
    else if (selectedCam > i) selectedCam--;
    renderPlacedList(); renderProps(); draw();
}

// ============================================================
// PROPERTIES
// ============================================================
function renderProps() {
    const panel = document.getElementById('props-panel');
    if (selectedCam === null || !cameras[selectedCam]) {
        panel.innerHTML = '<div class="empty">Selecione uma câmera no canvas para editar.</div>'; return;
    }
    const cam = cameras[selectedCam], m = getModel(cam.modelId);
    panel.innerHTML = `
    <div class="prop-row"><div class="prop-label">Nome</div>
      <input class="prop-input" id="p-name" value="${cam.name || m.name}" onchange="updateProp('name',this.value)"></div>
    <div class="prop-row"><div class="prop-label" style="display:flex;justify-content:space-between">Rotação <span class="prop-val" id="p-rot-v">${cam.rotation || 0}°</span></div>
      <input class="prop-range" type="range" min="0" max="360" value="${cam.rotation || 0}" oninput="updateProp('rotation',+this.value);document.getElementById('p-rot-v').textContent=this.value+'°'"></div>
    <div class="prop-row"><div class="prop-label" style="display:flex;justify-content:space-between">FOV <span class="prop-val" id="p-fov-v">${cam.fov || m.fov}°</span></div>
      <input class="prop-range" type="range" min="10" max="360" value="${cam.fov || m.fov}" oninput="updateProp('fov',+this.value);document.getElementById('p-fov-v').textContent=this.value+'°'"></div>
    <div class="prop-row"><div class="prop-label" style="display:flex;justify-content:space-between">Alcance <span class="prop-val" id="p-range-v">${cam.range || m.range}m</span></div>
      <input class="prop-range" type="range" min="1" max="200" value="${cam.range || m.range}" oninput="updateProp('range',+this.value);document.getElementById('p-range-v').textContent=this.value+'m'"></div>
    <div style="font-size:9px;color:var(--text-dim);font-family:'Share Tech Mono',monospace;padding:2px 0">${m.brand} ${m.name} · ${m.res} · IR ${m.ir}</div>
    <button class="tbtn tbtn-full" onclick="openEditModal(${selectedCam})" style="margin-top:2px">✏ Editar Detalhes</button>`;
}

function updateProp(k, v) {
    if (selectedCam === null) return;
    cameras[selectedCam][k] = v;
    renderPlacedList(); draw();
}

// ============================================================
// TOOLS
// ============================================================
function setTool(t) {
    tool = t;
    document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById('tool-' + t);
    if (el) el.classList.add('active');
    document.getElementById('status-mode').textContent = t.toUpperCase();
    mainC.style.cursor = t === 'select' ? 'default' : t === 'camera' ? 'crosshair' : t === 'wall' ? 'crosshair' : 'not-allowed';
}

// ============================================================
// COORDS
// ============================================================
function c2w(cx, cy) { return { x: (cx - panX) / zoom, y: (cy - panY) / zoom }; }
function snap(x, y, g = 10) { return { x: Math.round(x / g) * g, y: Math.round(y / g) * g }; }
function getCamAt(wx, wy) {
    for (let i = cameras.length - 1; i >= 0; i--) {
        const dx = cameras[i].x - wx, dy = cameras[i].y - wy;
        if (Math.sqrt(dx * dx + dy * dy) < 14 / zoom) return i;
    }
    return null;
}
function getWallAt(wx, wy) {
    for (let i = 0; i < walls.length; i++) {
        const w = walls[i], dx = w.x2 - w.x1, dy = w.y2 - w.y1, len2 = dx * dx + dy * dy;
        if (!len2) continue;
        const t = Math.max(0, Math.min(1, ((wx - w.x1) * dx + (wy - w.y1) * dy) / len2));
        const nx = w.x1 + t * dx - wx, ny = w.y1 + t * dy - wy;
        if (Math.sqrt(nx * nx + ny * ny) < 6 / zoom) return i;
    }
    return null;
}

// ============================================================
// MOUSE
// ============================================================
mainC.addEventListener('contextmenu', e => e.preventDefault());

mainC.addEventListener('mousedown', e => {
    const pos = c2w(e.offsetX, e.offsetY);
    if (e.button === 2 || e.button === 1) { isPanning = true; panStart = { x: e.clientX, y: e.clientY, px: panX, py: panY }; return; }
    if (tool === 'select') {
        const idx = getCamAt(pos.x, pos.y);
        if (idx !== null) { selectedCam = idx; isDraggingCam = true; dragOffset = { x: pos.x - cameras[idx].x, y: pos.y - cameras[idx].y }; }
        else selectedCam = null;
        renderPlacedList(); renderProps(); draw(); return;
    }
    if (tool === 'camera') {
        const m = selectedModel || CATALOG[0];
        const s = snap(pos.x, pos.y);
        cameras.push({ modelId: m.id, x: s.x, y: s.y, name: `CAM-${String(cameras.length + 1).padStart(2, '0')}`, rotation: 0, fov: m.fov, range: m.range, color: m.color, notes: '' });
        selectedCam = cameras.length - 1;
        renderPlacedList(); renderProps(); draw(); return;
    }
    if (tool === 'wall') {
        if (!isDrawingWall) { wallStart = snap(pos.x, pos.y); isDrawingWall = true; }
        else { walls.push({ x1: wallStart.x, y1: wallStart.y, x2: snap(pos.x, pos.y).x, y2: snap(pos.x, pos.y).y }); wallStart = snap(pos.x, pos.y); draw(); }
        return;
    }
    if (tool === 'erase') {
        const idx = getCamAt(pos.x, pos.y);
        if (idx !== null) { cameras.splice(idx, 1); if (selectedCam === idx) selectedCam = null; else if (selectedCam > idx) selectedCam--; renderPlacedList(); renderProps(); draw(); return; }
        const wi = getWallAt(pos.x, pos.y);
        if (wi !== null) { walls.splice(wi, 1); draw(); }
    }
});

mainC.addEventListener('mousemove', e => {
    const pos = c2w(e.offsetX, e.offsetY);
    document.getElementById('status-pos').textContent = `${Math.round(pos.x / SCALE)}m, ${Math.round(pos.y / SCALE)}m`;
    const tt = document.getElementById('tooltip');
    const idx = getCamAt(pos.x, pos.y);
    if (idx !== null) {
        const cam = cameras[idx], m = getModel(cam.modelId);
        tt.style.display = 'block'; tt.style.left = (e.offsetX + 14) + 'px'; tt.style.top = (e.offsetY - 10) + 'px';
        tt.textContent = `${cam.name} · ${m.brand} ${m.name} · ${cam.fov || m.fov}° · ${cam.range || m.range}m`;
        hoveredCam = idx;
    } else { tt.style.display = 'none'; hoveredCam = null; }
    if (isPanning) { panX = panStart.px + (e.clientX - panStart.x); panY = panStart.py + (e.clientY - panStart.y); drawBg(); draw(); return; }
    if (isDraggingCam && selectedCam !== null) {
        const s = snap(pos.x - dragOffset.x, pos.y - dragOffset.y);
        cameras[selectedCam].x = s.x; cameras[selectedCam].y = s.y;
        draw(); renderPlacedList(); return;
    }
    if (isDrawingWall && wallStart) {
        draw();
        const s = snap(pos.x, pos.y);
        ctx.save(); ctx.translate(panX, panY); ctx.scale(zoom, zoom);
        ctx.beginPath(); ctx.moveTo(wallStart.x, wallStart.y); ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = 'rgba(70,120,160,.8)'; ctx.lineWidth = 8 / zoom; ctx.lineCap = 'round';
        ctx.setLineDash([10 / zoom, 5 / zoom]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }
    draw();
});

mainC.addEventListener('mouseup', e => { if (e.button === 2 || e.button === 1) { isPanning = false; return; } isDraggingCam = false; });

mainC.addEventListener('dblclick', e => {
    const pos = c2w(e.offsetX, e.offsetY);
    const idx = getCamAt(pos.x, pos.y);
    if (idx !== null) { openEditModal(idx); return; }
    if (tool === 'wall' && isDrawingWall) { isDrawingWall = false; wallStart = null; draw(); }
});

mainC.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : .9;
    panX = e.offsetX - (e.offsetX - panX) * f;
    panY = e.offsetY - (e.offsetY - panY) * f;
    zoom = Math.min(8, Math.max(.1, zoom * f));
    document.getElementById('hdr-zoom').textContent = Math.round(zoom * 100) + '%';
    drawBg(); draw();
}, { passive: false });

// ============================================================
// KEYBOARD
// ============================================================
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') {
        if (isDrawingWall) { isDrawingWall = false; wallStart = null; draw(); return; }
        if (document.getElementById('modal-cam').classList.contains('open')) { closeModal(); return; }
        selectedCam = null; renderPlacedList(); renderProps(); draw();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedCam !== null) deleteCam(selectedCam, { stopPropagation: () => { } }); }
    if (e.key === 's') setTool('select');
    if (e.key === 'w') setTool('wall');
    if (e.key === 'c') setTool('camera');
    if (e.key === 'e') setTool('erase');
    if (selectedCam !== null) {
        if (e.key === 'ArrowLeft') { cameras[selectedCam].rotation = ((cameras[selectedCam].rotation || 0) - 5 + 360) % 360; renderProps(); draw(); }
        if (e.key === 'ArrowRight') { cameras[selectedCam].rotation = ((cameras[selectedCam].rotation || 0) + 5) % 360; renderProps(); draw(); }
    }
});

// ============================================================
// MODAL EDIT
// ============================================================
function openEditModal(idx) {
    editingCamIdx = idx;
    const cam = cameras[idx], m = getModel(cam.modelId);
    document.getElementById('edit-name').value = cam.name || m.name;
    document.getElementById('edit-fov').value = cam.fov || m.fov;
    document.getElementById('edit-range').value = cam.range || m.range;
    document.getElementById('edit-rotation').value = cam.rotation || 0;
    document.getElementById('edit-notes').value = cam.notes || '';
    editColor = cam.color || m.color;
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === editColor));
    document.getElementById('modal-cam').classList.add('open');
}
function closeModal() { document.getElementById('modal-cam').classList.remove('open'); editingCamIdx = null; }
function saveEdit() {
    if (editingCamIdx === null) return;
    const cam = cameras[editingCamIdx];
    cam.name = document.getElementById('edit-name').value;
    cam.fov = +document.getElementById('edit-fov').value;
    cam.range = +document.getElementById('edit-range').value;
    cam.rotation = +document.getElementById('edit-rotation').value;
    cam.notes = document.getElementById('edit-notes').value;
    cam.color = editColor;
    closeModal(); renderPlacedList(); renderProps(); draw();
}
function selectColor(el) {
    editColor = el.dataset.color;
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

// ============================================================
// CLEAR / LOAD PLANT
// ============================================================
function clearAll() {
    if (!confirm('Limpar todo o projeto?')) return;
    cameras = []; walls = []; plantImage = null; selectedCam = null;
    renderPlacedList(); renderProps(); drawBg(); draw();
}
function loadPlant(e) {
    const file = e.target.files[0]; if (!file) return;
    const img = new Image();
    img.onload = () => { plantImage = img; drawBg(); };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
}

// ============================================================
// SAVE / LOAD PROJECT (JSON)
// ============================================================
function saveProject() {
    const data = { version: '2.0', cameras, walls, zoom, panX, panY };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cftv-projeto-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}
function loadProject(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            cameras = data.cameras || [];
            walls = data.walls || [];
            zoom = data.zoom || 1;
            panX = data.panX || 80;
            panY = data.panY || 80;
            selectedCam = null;
            renderCatalog(); renderPlacedList(); renderProps(); drawBg(); draw();
        } catch { alert('Arquivo inválido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// ============================================================
// PDF REPORT
// ============================================================
function generateReport() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Snapshot do canvas
    const tempC = document.createElement('canvas');
    const tw = 800, th = 400;
    tempC.width = tw; tempC.height = th;
    const tCtx = tempC.getContext('2d');

    // Fundo claro para relatório
    tCtx.fillStyle = '#f0f4f8'; tCtx.fillRect(0, 0, tw, th);

    // Calcular bounds das câmeras para centralizar
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cameras.forEach(cam => { minX = Math.min(minX, cam.x); minY = Math.min(minY, cam.y); maxX = Math.max(maxX, cam.x); maxY = Math.max(maxY, cam.y); });
    walls.forEach(w => { minX = Math.min(minX, w.x1, w.x2); minY = Math.min(minY, w.y1, w.y2); maxX = Math.max(maxX, w.x1, w.x2); maxY = Math.max(maxY, w.y1, w.y2); });

    const hasContent = cameras.length > 0 || walls.length > 0;
    const margin = 60;
    let sc = 1, ox = margin, oy = margin;
    if (hasContent) {
        const scX = (tw - margin * 2) / (maxX - minX || 1);
        const scY = (th - margin * 2) / (maxY - minY || 1);
        sc = Math.min(scX, scY, 2);
        ox = margin - minX * sc + (tw - margin * 2 - (maxX - minX) * sc) / 2;
        oy = margin - minY * sc + (th - margin * 2 - (maxY - minY) * sc) / 2;
    }

    // Desenhar paredes
    walls.forEach(w => {
        tCtx.beginPath(); tCtx.moveTo(w.x1 * sc + ox, w.y1 * sc + oy); tCtx.lineTo(w.x2 * sc + ox, w.y2 * sc + oy);
        tCtx.strokeStyle = '#2a4060'; tCtx.lineWidth = 5; tCtx.lineCap = 'round'; tCtx.stroke();
        tCtx.beginPath(); tCtx.moveTo(w.x1 * sc + ox, w.y1 * sc + oy); tCtx.lineTo(w.x2 * sc + ox, w.y2 * sc + oy);
        tCtx.strokeStyle = '#6090b0'; tCtx.lineWidth = 1; tCtx.stroke();
    });

    // Desenhar FOV
    cameras.forEach(cam => {
        const m = getModel(cam.modelId);
        const fov = cam.fov ?? m.fov, range = (cam.range ?? m.range) * SCALE * sc;
        const rot = (cam.rotation ?? 0) * Math.PI / 180, hf = fov * Math.PI / 180 / 2;
        const c = cam.color || m.color;
        const cx = cam.x * sc + ox, cy = cam.y * sc + oy;
        tCtx.beginPath(); tCtx.moveTo(cx, cy); tCtx.arc(cx, cy, range, rot - hf, rot + hf); tCtx.closePath();
        tCtx.fillStyle = `rgba(${c},.15)`; tCtx.fill();
        tCtx.strokeStyle = `rgba(${c},.5)`; tCtx.lineWidth = 1; tCtx.stroke();
    });

    // Desenhar câmeras
    cameras.forEach(cam => {
        const m = getModel(cam.modelId);
        const c = cam.color || m.color;
        const cx = cam.x * sc + ox, cy = cam.y * sc + oy, r = 7;
        tCtx.beginPath(); tCtx.arc(cx, cy, r, 0, Math.PI * 2);
        tCtx.fillStyle = `rgb(${c})`; tCtx.fill();
        tCtx.strokeStyle = 'rgba(0,0,0,.5)'; tCtx.lineWidth = 1.5; tCtx.stroke();
        tCtx.font = '9px "Exo 2",sans-serif'; tCtx.fillStyle = '#1a2a3a'; tCtx.textAlign = 'center';
        tCtx.fillText(cam.name || m.name, cx, cy + r + 11);
    });

    const mapDataURL = tempC.toDataURL('image/png');

    // Construir tabela de câmeras
    let camRows = '';
    cameras.forEach((cam, i) => {
        const m = getModel(cam.modelId);
        const c = cam.color || m.color;
        camRows += `<tr>
      <td><span class="cam-color-dot" style="background:rgb(${c})"></span>${cam.name || m.name}</td>
      <td>${m.brand}</td>
      <td>${m.name}</td>
      <td>${m.type}</td>
      <td>${cam.fov || m.fov}°</td>
      <td>${cam.range || m.range}m</td>
      <td>${m.res}</td>
      <td>${Math.round(cam.x / SCALE)}m, ${Math.round(cam.y / SCALE)}m</td>
      <td>${cam.notes || '—'}</td>
    </tr>`;
    });

    // Contar tipos
    const tipos = {};
    cameras.forEach(cam => { const m = getModel(cam.modelId); tipos[m.type] = (tipos[m.type] || 0) + 1; });
    const tiposStr = Object.entries(tipos).map(([t, n]) => `${n}× ${t}`).join(' · ') || '—';

    // Marcas usadas
    const brands = [...new Set(cameras.map(cam => getModel(cam.modelId).brand))].join(', ') || '—';

    const html = `
    <div class="rpt-header">
      <div>
        <div class="rpt-logo-text">📡 CFTV PLANNER</div>
        <div class="rpt-sub">Sistema de Projeto de Câmeras de Segurança</div>
      </div>
      <div class="rpt-meta">
        <strong>RELATÓRIO TÉCNICO DE PROJETO</strong><br>
        Data: ${dateStr} às ${timeStr}<br>
        Gerado por: CFTV Planner v2.0<br>
        Open Source — github.com/seu-usuario/cftv-planner
      </div>
    </div>

    <div class="rpt-section">
      <div class="rpt-stats">
        <div class="rpt-stat"><div class="rpt-stat-val">${cameras.length}</div><div class="rpt-stat-label">Câmeras</div></div>
        <div class="rpt-stat"><div class="rpt-stat-val">${walls.length}</div><div class="rpt-stat-label">Segmentos de parede</div></div>
        <div class="rpt-stat"><div class="rpt-stat-val">${cameras.length ? Math.round(cameras.reduce((s, c) => { const m = getModel(c.modelId); return s + (c.range || m.range); }, 0) / cameras.length) + 'm' : '—'}</div><div class="rpt-stat-label">Alcance médio</div></div>
        <div class="rpt-stat"><div class="rpt-stat-val">${cameras.length ? Math.round(cameras.reduce((s, c) => { const m = getModel(c.modelId); return s + (c.fov || m.fov); }, 0) / cameras.length) + '°' : '—'}</div><div class="rpt-stat-label">FOV médio</div></div>
      </div>
    </div>

    <div class="rpt-section">
      <div class="rpt-section-title">Planta com Posicionamento das Câmeras</div>
      <div class="rpt-canvas-wrap">
        <img src="${mapDataURL}" style="width:100%;display:block;">
      </div>
    </div>

    <div class="rpt-section">
      <div class="rpt-section-title">Inventário de Câmeras</div>
      <table class="rpt-table">
        <thead>
          <tr>
            <th>Identificação</th><th>Marca</th><th>Modelo</th><th>Tipo</th>
            <th>FOV</th><th>Alcance</th><th>Resolução</th><th>Posição</th><th>Observações</th>
          </tr>
        </thead>
        <tbody>${camRows || '<tr><td colspan="9" style="text-align:center;color:#999;padding:20px">Nenhuma câmera adicionada ao projeto.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="rpt-section">
      <div class="rpt-section-title">Resumo Técnico</div>
      <table class="rpt-table">
        <tr><td style="width:200px;font-weight:600">Total de câmeras</td><td>${cameras.length}</td></tr>
        <tr><td style="font-weight:600">Tipos utilizados</td><td>${tiposStr}</td></tr>
        <tr><td style="font-weight:600">Marcas</td><td>${brands}</td></tr>
        <tr><td style="font-weight:600">Segmentos de parede</td><td>${walls.length}</td></tr>
      </table>
    </div>

    <div class="rpt-footer">
      <span>CFTV Planner v2.0 — Ferramenta Open Source para Projetos de CFTV</span>
      <span>Gerado em ${dateStr} às ${timeStr}</span>
    </div>
  `;

    document.getElementById('rpt-content').innerHTML = html;
    document.getElementById('pdf-report').style.display = 'block';
    document.getElementById('pdf-report').scrollTop = 0;
}

function closeReport() { document.getElementById('pdf-report').style.display = 'none'; }

// ============================================================
// INIT
// ============================================================
renderCatalog(); renderPlacedList(); renderProps(); resize(); setTool('select');
drawBg(); draw();
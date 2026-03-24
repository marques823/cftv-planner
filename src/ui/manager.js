import { CATALOG } from '../engine/catalog.js';
import { AuthService } from '../services/auth.js';

export class UIManager {
    constructor(engine, projects) {
        this.engine = engine;
        this.projects = projects;
        this.auth = new AuthService();
        this.currentTool = 'select';
        this.selectedModel = CATALOG[0];
        this.brandFilter = 'all';
    }

    async init() {
        this.setupToolbar();
        this.setupHeaderActions();
        this.setupSettingsActions();
        this.setupMetadataActions();
        this.setupThemeToggle();
        this.renderCatalog();
        this.setupCatalogFilters();
        
        // Load latest project
        const saved = localStorage.getItem('cftv_project_latest');
        if (saved) {
            this.projects.loadFromJSON(saved);
            this.engine.drawGrid();
            this.engine.render();
        }

        await this.auth.init();
        this.updateAuthUI();

        window.addEventListener('auth-changed', () => this.updateAuthUI());
        window.addEventListener('project-changed', (e) => this.onProjectUpdate(e.detail));
        
        // Global shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    setupToolbar() {
        const toolBtns = document.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.getAttribute('data-tool');
                this.setTool(tool);
            });
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        document.getElementById('status-text').textContent = `MODO: ${tool.toUpperCase()}`;
        
        // Reset engine states
        this.engine.isDrawingWall = false;
        this.engine.wallStart = null;
        this.engine.alignmentGuides = [];
        this.engine.isMeasuring = false;
        this.engine.isRotatingNewCamera = false;
        this.engine.rotatingCamera = null;
        
        // Close sidebar on mobile when a tool is picked
        document.querySelector('.sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('active');
    }

    setupCatalogFilters() {
        const filterBtns = document.querySelectorAll('.brand-tabs .tab');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.brandFilter = btn.getAttribute('data-brand');
                this.renderCatalog();
            });
        });
    }

    renderCatalog() {
        const container = document.getElementById('cam-catalog');
        if (!container) return;
        
        container.innerHTML = '';
        const filtered = this.brandFilter === 'all' 
            ? CATALOG 
            : CATALOG.filter(m => m.brand === this.brandFilter);

        filtered.forEach(m => {
            const item = document.createElement('div');
            item.className = `catalog-item ${this.selectedModel?.id === m.id ? 'active' : ''}`;
            item.innerHTML = `
                <div class="catalog-icon">${m.icon}</div>
                <div class="catalog-info">
                    <div class="catalog-name">${m.name}</div>
                    <div class="catalog-meta">${m.brand} · ${m.type}</div>
                    <div class="catalog-desc">${m.desc}</div>
                </div>
            `;
            item.onclick = () => {
                this.selectedModel = m;
                this.setTool('camera');
                this.renderCatalog();
            };
            container.appendChild(item);
        });
    }

    onEntitySelected(hit) {
        const pnl = document.getElementById('inspector-content');
        const inspector = document.querySelector('.inspector');
        
        if (!hit) {
            inspector.classList.remove('active');
            pnl.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="info"></i>
                    <p>Selecione um elemento para configurar</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        inspector.classList.add('active');

        if (hit.type === 'multiple') {
            pnl.innerHTML = `
                <h3 class="panel-title">Seleção Múltipla</h3>
                <div class="empty-state" style="padding-top: 10px">
                    <i data-lucide="layers"></i>
                    <p><b>${hit.count} itens</b> selecionados</p>
                    <p style="font-size: 0.8rem; margin-top: 10px; opacity: 0.7">
                        Arraste qualquer item para mover o grupo.<br>
                        Shift + Clique para refinar.
                    </p>
                </div>
                <button class="btn-danger-outline" id="btn-delete-multiple" style="margin-top: 20px">
                    <i data-lucide="trash-2"></i> Excluir Seleção
                </button>
            `;
            
            pnl.querySelector('#btn-delete-multiple')?.addEventListener('click', () => {
                if (confirm(`Excluir ${hit.count} itens selecionados?`)) {
                    // Sort indices descending to avoid splice issues if we used indices
                    // But project.js methods use indices. Better: just filter them out.
                    const engine = window.app.engine;
                    engine.selectedEntities.forEach(s => {
                        if (s.type === 'camera') window.app.project.cameras = window.app.project.cameras.filter(c => c !== s.entity);
                        else if (s.type === 'wall') window.app.project.walls = window.app.project.walls.filter(w => w !== s.entity);
                        else if (s.type === 'label') window.app.project.labels = window.app.project.labels.filter(l => l !== s.entity);
                    });
                    engine.selectedEntities = [];
                    window.app.project.notifyChange();
                    this.onEntitySelected(null);
                }
            });
            
            lucide.createIcons();
            return;
        }

        const entity = hit.entity;
        if (hit.type === 'camera') {
            pnl.innerHTML = `
                <h3 class="panel-title">Editar Câmera</h3>
                <div class="prop-group">
                    <label>Nome / Identificação</label>
                    <input type="text" value="${entity.name}" data-prop="name">
                </div>
                <div class="prop-group">
                    <label>Rotação: <span class="val">${entity.rotation}°</span></label>
                    <input type="range" min="0" max="360" value="${entity.rotation}" data-prop="rotation">
                </div>
                <div class="prop-group">
                    <label>FOV (Abertura): <span class="val">${entity.fov}°</span></label>
                    <input type="range" min="10" max="180" value="${entity.fov}" data-prop="fov">
                </div>
                <div class="prop-group">
                    <label>Alcance: <span class="val">${entity.range}m</span></label>
                    <input type="range" min="1" max="100" value="${entity.range}" data-prop="range">
                </div>
                <div class="property-group">
                    <label>Cor de Identificação</label>
                    <div class="color-presets">
                        <div class="color-opt" style="background:#00e5ff" onclick="window.app.ui.updateEntity('color', '0,229,255')"></div>
                        <div class="color-opt" style="background:#39ff14" onclick="window.app.ui.updateEntity('color', '57,255,20')"></div>
                        <div class="color-opt" style="background:#ffea00" onclick="window.app.ui.updateEntity('color', '255,234,0')"></div>
                        <div class="color-opt" style="background:#ff3c00" onclick="window.app.ui.updateEntity('color', '255,60,0')"></div>
                        <div class="color-opt" style="background:#ff00ff" onclick="window.app.ui.updateEntity('color', '255,0,255')"></div>
                        <div class="color-opt" style="background:#7000ff" onclick="window.app.ui.updateEntity('color', '112,0,255')"></div>
                        <div class="color-opt" style="background:#ffffff" onclick="window.app.ui.updateEntity('color', '255,255,255')"></div>
                        <div class="color-opt" style="background:#ffb700" onclick="window.app.ui.updateEntity('color', '255,183,0')"></div>
                        <div class="color-opt" style="background:#0051ff" onclick="window.app.ui.updateEntity('color', '0,81,255')"></div>
                    </div>
                </div>
                <button class="btn-danger-outline" id="btn-delete-entity">
                    <i data-lucide="trash-2"></i> Excluir Câmera
                </button>
            `;
        } else if (hit.type === 'wall' || hit.type === 'wall-endpoint') {
            const w = hit.type === 'wall-endpoint' ? hit.entity : entity;
            const currentLen = Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2) / 10;
            pnl.innerHTML = `
                <h3 class="panel-title">Editar Parede</h3>
                <div class="prop-group">
                    <label>Comprimento (m)</label>
                    <input type="number" step="0.01" value="${currentLen.toFixed(2)}" data-prop="wallLength">
                </div>
                <div class="prop-group" style="flex-direction: row; justify-content: space-between; align-items: center">
                    <label style="margin:0">Exibir Medida</label>
                    <input type="checkbox" ${w.showMeasurements ? 'checked' : ''} onchange="window.app.ui.updateEntity('showMeasurements', this.checked)">
                </div>
                <div class="property-group">
                    <label>Cor da Parede</label>
                    <div class="color-presets">
                        <div class="color-opt" style="background:#1e293b" onclick="window.app.ui.updateEntity('color', '#1e293b')"></div>
                        <div class="color-opt" style="background:#94a3b8" onclick="window.app.ui.updateEntity('color', '#94a3b8')"></div>
                        <div class="color-opt" style="background:#ef4444" onclick="window.app.ui.updateEntity('color', '#ef4444')"></div>
                        <div class="color-opt" style="background:#f59e0b" onclick="window.app.ui.updateEntity('color', '#f59e0b')"></div>
                        <div class="color-opt" style="background:#10b981" onclick="window.app.ui.updateEntity('color', '#10b981')"></div>
                        <div class="color-opt" style="background:#3b82f6" onclick="window.app.ui.updateEntity('color', '#3b82f6')"></div>
                    </div>
                </div>
                <button class="btn-danger-outline" id="btn-delete-entity" style="margin-top: 15px">
                    <i data-lucide="trash-2"></i> Excluir Parede
                </button>
            `;
        } else if (hit.type === 'wall-element') {
            const el = hit.entity;
            const title = el.type === 'door' ? 'Porta' : 'Janela';
            pnl.innerHTML = `
                <h3 class="panel-title">Editar ${title}</h3>
                <div class="prop-group">
                    <label>Largura: <span class="val">${Math.round(el.width * 100)}cm</span></label>
                    <input type="range" min="50" max="400" step="5" value="${Math.round(el.width * 100)}" data-prop="widthCm">
                </div>
                ${el.type === 'door' ? `
                <div class="prop-group" style="flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 5px">
                    <label style="margin:0">Inverter Lado (D/E)</label>
                    <input type="checkbox" ${el.mirrored ? 'checked' : ''} data-prop="mirrored" data-type="bool">
                </div>
                <div class="prop-group" style="flex-direction: row; justify-content: space-between; align-items: center">
                    <label style="margin:0">Sentido de Abertura (Dentro/Fora)</label>
                    <input type="checkbox" ${el.inverted ? 'checked' : ''} data-prop="inverted" data-type="bool">
                </div>
                ` : ''}
                <button class="btn-danger-outline" id="btn-delete-entity" style="margin-top: 15px">
                    <i data-lucide="trash-2"></i> Excluir ${title}
                </button>
            `;
        } else if (hit.type === 'label') {
            pnl.innerHTML = `
                <h3 class="panel-title">Editar Texto</h3>
                <div class="prop-group">
                    <label>Conteúdo</label>
                    <input type="text" value="${entity.text}" data-prop="text">
                </div>
                <div class="prop-group">
                    <label>Tamanho: <span class="val">${entity.fontSize}px</span></label>
                    <input type="range" min="8" max="100" value="${entity.fontSize}" data-prop="fontSize">
                </div>
                <div class="prop-group">
                    <label>Cor do Texto</label>
                    <div class="color-picker">
                        <div class="color-swatch ${entity.color === '255,255,255' ? 'active' : ''}" style="background: rgb(255,255,255)" data-color="255,255,255"></div>
                        <div class="color-swatch ${entity.color === '255,107,53' ? 'active' : ''}" style="background: rgb(255,107,53)" data-color="255,107,53"></div>
                        <div class="color-swatch ${entity.color === '0,229,255' ? 'active' : ''}" style="background: rgb(0,229,255)" data-color="0,229,255"></div>
                        <div class="color-swatch ${entity.color === '57,255,20' ? 'active' : ''}" style="background: rgb(57,255,20)" data-color="57,255,20"></div>
                    </div>
                </div>
                <button class="btn-danger-outline" id="btn-delete-entity">
                    <i data-lucide="trash-2"></i> Excluir Texto
                </button>
            `;
        }

        // Listeners for inputs
        pnl.querySelectorAll('input[data-prop]').forEach(input => {
            const evtType = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(evtType, (e) => {
                const prop = e.target.getAttribute('data-prop');
                const isBool = e.target.getAttribute('data-type') === 'bool';
                const val = isBool ? e.target.checked : e.target.value;
                
                if (prop === 'wallLength') {
                    const length = parseFloat(val);
                    if (!isNaN(length) && length > 0) {
                        entity.updateLength(length);
                    }
                } else if (prop === 'widthCm') {
                    entity.width = parseInt(val) / 100;
                    if (e.target.previousElementSibling?.querySelector('.val')) {
                        e.target.previousElementSibling.querySelector('.val').textContent = `${val}cm`;
                    }
                } else if (isBool) {
                    entity[prop] = val;
                } else {
                    entity[prop] = (prop === 'name' || prop === 'text') ? val : (prop.includes('rotation') || prop.includes('fov') || prop.includes('range') || prop.includes('fontSize') ? parseInt(val) : val);
                    if (e.target.previousElementSibling?.querySelector('.val')) {
                        e.target.previousElementSibling.querySelector('.val').textContent = `${val}${prop === 'fontSize' ? 'px' : (prop === 'range' ? 'm' : (prop === 'rotation' || prop === 'fov' ? '°' : ''))}`;
                    }
                }
                this.engine.render();
                this.renderPlacedList();
            });
        });

        // Delete button
        const delBtn = pnl.querySelector('#btn-delete-entity');
        if (delBtn) {
            delBtn.onclick = () => {
                this.projects.saveState();
                if (hit.type === 'camera') this.projects.removeCamera(hit.index);
                else if (hit.type === 'wall' || hit.type === 'wall-endpoint') this.projects.removeWall(hit.index);
                else if (hit.type === 'wall-element') {
                    hit.wall.elements.splice(hit.elementIndex, 1);
                    this.projects.notifyChange();
                }
                else if (hit.type === 'label') this.projects.removeLabel(hit.index);
                this.onEntitySelected(null);
                this.engine.render();
                this.renderPlacedList();
            };
        }

        // Color selector
        pnl.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.onclick = () => {
                this.projects.saveState();
                const color = swatch.getAttribute('data-color');
                entity.color = color;
                pnl.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                this.engine.render();
            };
        });

        lucide.createIcons();
    }

    renderPlacedList() {
        const container = document.getElementById('cam-placed-list');
        if (!container) return;
        
        container.innerHTML = '';
        this.projects.cameras.forEach((cam, i) => {
            const item = document.createElement('div');
            const isSelected = this.engine.selectedEntities.length === 1 && this.engine.selectedEntities[0].entity === cam;
            item.className = `device-item ${isSelected ? 'selected' : ''}`;
            item.innerHTML = `
                <div class="device-dot" style="background: rgb(${cam.color})"></div>
                <div class="device-info">
                    <div class="device-name">${cam.name}</div>
                    <div class="device-meta">${cam.brand} · ${cam.modelName}</div>
                </div>
            `;
            item.onclick = () => {
                this.engine.selectedEntities = [{ type: 'camera', index: i, entity: cam }];
                this.onEntitySelected(this.engine.selectedEntities[0]);
                this.engine.render();
                this.renderPlacedList();
            };
            container.appendChild(item);
        });
    }

    showBOM() {
        const bom = this.projects.getBOM();
        const pnl = document.getElementById('inspector-content');
        
        pnl.innerHTML = `
            <div class="bom-container">
                <h3 class="section-title">Lista de Materiais</h3>
                <table class="bom-table">
                    <thead>
                        <tr>
                            <th>QTD</th>
                            <th>MARCA</th>
                            <th>MODELO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bom.map(item => `
                            <tr>
                                <td>${item.quantity}</td>
                                <td>${item.brand}</td>
                                <td>${item.model}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <button class="btn-primary" style="margin-top: 20px; width: 100%" id="btn-print-bom">
                    <i data-lucide="printer"></i> Gerar Relatório PDF
                </button>
            </div>
        `;
        
        pnl.querySelector('#btn-print-bom').onclick = () => this.printProject();
        lucide.createIcons();
    }

    printProject() {
        const bom = this.projects.getBOM();
        const meta = this.projects.metadata;
        const walls = this.projects.walls;
        const cameras = this.projects.cameras;
        const labels = this.projects.labels;

        // 1. Calculate Bounding Box of all elements
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        const paddingMeters = 2;
        const SCALE_EXPORT = 40; // 40px = 1m (HD)
        
        if (walls.length === 0 && cameras.length === 0 && labels.length === 0) {
            // Empty project fallback to workspace settings
            minX = 0; minY = 0;
            maxX = this.projects.settings.widthMeters * 10;
            maxY = this.projects.settings.heightMeters * 10;
        } else {
            walls.forEach(w => {
                minX = Math.min(minX, w.x1, w.x2); minY = Math.min(minY, w.y1, w.y2);
                maxX = Math.max(maxX, w.x1, w.x2); maxY = Math.max(maxY, w.y1, w.y2);
            });
            cameras.forEach(c => {
                minX = Math.min(minX, c.x); minY = Math.min(minY, c.y);
                maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y);
            });
            labels.forEach(l => {
                minX = Math.min(minX, l.x); minY = Math.min(minY, l.y);
                maxX = Math.max(maxX, l.x); maxY = Math.max(maxY, l.y);
            });
            
            // Add margin in world units (1 unit = 0.1m, so 2m = 20 units)
            minX -= paddingMeters * 10; minY -= paddingMeters * 10;
            maxX += paddingMeters * 10; maxY += paddingMeters * 10;
        }

        const exportW = maxX - minX;
        const exportH = maxY - minY;

        // 2. Create HD Canvas
        const exportCanvas = document.createElement('canvas');
        // Convert world units to export pixels (world/10 * SCALE_EXPORT)
        const canvasW = (exportW / 10) * SCALE_EXPORT;
        const canvasH = (exportH / 10) * SCALE_EXPORT;
        
        exportCanvas.width = canvasW;
        exportCanvas.height = canvasH;
        const ctx = exportCanvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
        
        // Apply Transform: Move to local origin and scale to HD
        ctx.save();
        ctx.scale(SCALE_EXPORT / 10, SCALE_EXPORT / 10);
        ctx.translate(-minX, -minY);

        // 3. Draw Elements (Simplified but sharp)
        // Draw grid first (1m steps)
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 0.5;
        for (let x = Math.floor(minX / 10) * 10; x <= maxX; x += 10) {
            ctx.beginPath(); ctx.moveTo(x, minY); ctx.lineTo(x, maxY); ctx.stroke();
        }
        for (let y = Math.floor(minY / 10) * 10; y <= maxY; y += 10) {
            ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke();
        }

        // Draw Walls
        walls.forEach(w => w.draw(ctx, SCALE_EXPORT / 10));
        
        // Draw FOVs
        cameras.forEach(c => c.drawFOV(ctx, SCALE_EXPORT / 10, false, walls));
        
        // Draw Cameras
        cameras.forEach(c => c.draw(ctx, SCALE_EXPORT / 10, false, false));
        
        // Draw Labels
        labels.forEach(l => l.draw(ctx, SCALE_EXPORT / 10, false, false));

        ctx.restore();
        const imgData = exportCanvas.toDataURL('image/png');

        // 4. Generate Report Window
        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <html>
                <head>
                    <title>Relatório CFTV - ${meta.name}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; background: #fff; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b82f6; padding-bottom: 25px; margin-bottom: 40px; }
                        h1 { margin: 0; color: #0f172a; font-size: 28px; letter-spacing: -0.02em; }
                        .meta-info p { margin: 6px 0; font-size: 14px; color: #475569; }
                        .company-info { text-align: right; }
                        .company-name { font-weight: 800; color: #3b82f6; font-size: 20px; text-transform: uppercase; }
                        .canvas-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center; }
                        .canvas-preview { max-width: 100%; height: auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border-radius: 4px; background: #fff; }
                        h2 { font-size: 20px; color: #0f172a; margin-top: 50px; border-left: 4px solid #3b82f6; padding-left: 15px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                        th { background: #f8fafc; text-align: left; padding: 14px; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; border-bottom: 2px solid #e2e8f0; }
                        td { padding: 14px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: middle; }
                        .cam-legend { display: flex; align-items: center; gap: 10px; }
                        .cam-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.2); }
                        .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 30px; }
                        @media print { body { padding: 0; } .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="meta-info">
                            <h1>${meta.name || 'Projeto sem título'}</h1>
                            <p><strong>Cliente:</strong> ${meta.client || 'Geral'}</p>
                            <p><strong>Local:</strong> ${meta.address || 'Não informado'}</p>
                            <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div class="company-info">
                            <div class="company-name">${meta.company || 'CFTV PLANNER PRO'}</div>
                            <div style="font-size: 14px; color: #64748b;">Segurança Eletrônica & Monitoramento</div>
                            <div style="font-size: 13px; color: #3b82f6; margin-top: 4px; font-weight: 600;">${meta.contact || ''}</div>
                        </div>
                    </div>

                    <h2>Planta Técnica</h2>
                    <div class="canvas-container">
                        <img src="${imgData}" class="canvas-preview">
                        <p style="font-size: 11px; color: #94a3b8; margin-top: 10px;">Escala visual baseada no enquadramento dos elementos.</p>
                    </div>

                    <h2>Lista de Materiais e Dispositivos</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 60px;">Qtd</th>
                                <th>Item / Modelo</th>
                                <th>Marca</th>
                                <th>Legenda</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bom.map(item => {
                                // Find a camera of this model to get its color
                                const sample = cameras.find(c => c.brand === item.brand && c.modelName === item.model);
                                const color = sample ? sample.color : '100,100,100';
                                return `
                                    <tr>
                                        <td><strong>${item.quantity}x</strong></td>
                                        <td><strong>${item.model}</strong></td>
                                        <td>${item.brand}</td>
                                        <td>
                                            <div class="cam-legend">
                                                <div class="cam-dot" style="background: rgb(${color})"></div>
                                                <span style="font-size: 12px; color: #64748b">Identificação no mapa</span>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        Este documento técnico foi gerado pelo CFTV Planner Pro.<br>
                        As posições e ângulos são representações aproximadas para fins de planejamento.
                    </div>
                </body>
            </html>
        `);
        printWin.document.close();
        setTimeout(() => {
            printWin.print();
        }, 800);
    }

    onProjectUpdate(stats) {
        document.getElementById('hdr-cams').textContent = stats.cameraCount;
        document.getElementById('hdr-walls').textContent = stats.wallCount;
        this.renderPlacedList();
    }

    setupHeaderActions() {
        document.getElementById('btn-new-project')?.addEventListener('click', () => {
            if (this.projects.cameras.length > 0 || this.projects.walls.length > 0) {
                if (!confirm('Iniciar novo projeto? As alterações não salvas serão perdidas.')) return;
            }
            this.showNewProjectWizard();
        });

        document.getElementById('btn-save')?.addEventListener('click', () => {
            const user = this.auth.getCurrentUser();
            this.projects.save(user?.id);
            alert(user ? 'Projeto salvo na nuvem!' : 'Projeto salvo localmente (entre para salvar na nuvem).');
        });

        document.getElementById('btn-export')?.addEventListener('click', () => {
            this.showBOM();
        });

        document.getElementById('btn-clear-all')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todo o projeto?')) {
                this.projects.clear();
                this.engine.selectedEntities = [];
                this.onEntitySelected(null);
            }
        });

        document.getElementById('btn-import-plant')?.addEventListener('click', () => {
            document.getElementById('input-plant').click();
        });
        
        document.getElementById('input-plant')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    this.engine.projectPlant = img;
                    this.engine.render();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    setupThemeToggle() {
        const btn = document.getElementById('btn-theme-toggle');
        btn?.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            btn.innerHTML = isLight ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
            lucide.createIcons();
            this.engine.drawGrid();
            this.engine.render();
        });
    }

    updateAuthUI() {
        const user = this.auth.getCurrentUser();
        const section = document.getElementById('auth-section');
        if (!section) return;

        if (user) {
            const name = user.user_metadata?.full_name || user.email;
            section.innerHTML = `
                <div class="user-profile">
                    <button class="btn-ghost" id="btn-new-project" title="Novo Projeto">
                        <i data-lucide="file-plus"></i> <span class="hide-mobile">Novo</span>
                    </button>
                    <button class="btn-ghost" id="btn-gallery" title="Meus Projetos">
                        <i data-lucide="folder-open"></i> <span class="hide-mobile">Projetos</span>
                    </button>
                    <button class="btn-ghost" id="btn-logout" title="Sair">
                        <i data-lucide="log-out"></i>
                    </button>
                </div>
            `;
            document.getElementById('btn-logout').onclick = async () => {
                this.projects.clear();
                localStorage.removeItem('cftv_project_latest');
                await this.auth.signOut();
                window.location.reload();
            };
            document.getElementById('btn-gallery').onclick = () => this.showProjectGallery();
            document.getElementById('btn-new-project').onclick = () => this.showNewProjectWizard();
        } else {
            section.innerHTML = `
                <button class="btn-secondary" id="btn-login">
                    <i data-lucide="log-in"></i> <span>Entrar</span>
                </button>
            `;
            document.getElementById('btn-login').onclick = () => this.showLoginModal();
        }
        lucide.createIcons();
    }

    showLoginModal() {
        const container = document.getElementById('modal-container');
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="modal">
                <h3 class="modal-title">Entrar no CFTV Planner</h3>
                <div class="modal-body">
                    <p>Entre para salvar seus projetos na nuvem.</p>
                    <button class="btn-primary w-full" id="login-google">
                        <i data-lucide="chrome"></i> Google Login
                    </button>
                    <div class="divider">ou</div>
                    <div class="prop-group">
                        <label>E-mail</label>
                        <input type="email" id="login-email" placeholder="seu@email.com">
                    </div>
                    <div class="prop-group">
                        <label>Senha</label>
                        <input type="password" id="login-password">
                    </div>
                    <button class="btn-secondary w-full" id="login-email-btn">Login com E-mail</button>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" id="close-modal">Cancelar</button>
                </div>
            </div>
        `;
        
        container.querySelector('#login-google').onclick = () => this.auth.signInWithGoogle();
        container.querySelector('#login-email-btn').onclick = async () => {
            const email = container.querySelector('#login-email').value;
            const password = container.querySelector('#login-password').value;
            try {
                await this.auth.signInWithEmail(email, password);
                container.classList.add('hidden');
            } catch (err) {
                alert('Erro ao entrar: ' + err.message);
            }
        };
        container.querySelector('#close-modal').onclick = () => container.classList.add('hidden');
        lucide.createIcons();
    }

    showNewProjectWizard() {
        const modal = document.getElementById('modal-container');
        modal.classList.remove('hidden');
        modal.innerHTML = `
            <div class="modal">
                <h3 class="modal-title">Configurar Novo Projeto</h3>
                <div class="modal-body">
                    <div class="prop-group">
                        <label>Nome do Projeto</label>
                        <input type="text" id="wiz-name" value="Residência Silva" placeholder="Ex: Projeto CFTV Centro">
                    </div>
                    <div class="prop-group">
                        <label>Cliente</label>
                        <input type="text" id="wiz-client" placeholder="Ex: João da Silva">
                    </div>
                    <div class="grid-2">
                        <div class="prop-group">
                            <label>Largura (m)</label>
                            <input type="number" id="wiz-w" value="50">
                        </div>
                        <div class="prop-group">
                            <label>Altura (m)</label>
                            <input type="number" id="wiz-h" value="30">
                        </div>
                    </div>
                    <p class="panel-desc">Você poderá alterar estas informações depois nas configurações.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" id="wiz-cancel">Cancelar</button>
                    <button class="btn-primary" id="wiz-confirm">Iniciar Projeto</button>
                </div>
            </div>
        `;

        modal.querySelector('#wiz-cancel').onclick = () => modal.classList.add('hidden');
        modal.querySelector('#wiz-confirm').onclick = () => {
            const name = modal.querySelector('#wiz-name').value;
            const client = modal.querySelector('#wiz-client').value;
            const w = parseInt(modal.querySelector('#wiz-w').value);
            const h = parseInt(modal.querySelector('#wiz-h').value);

            this.projects.clear();
            this.projects.updateMetadata({ name, client });
            this.projects.updateSettings({ widthMeters: w, heightMeters: h });
            
            this.engine.offsetX = 50;
            this.engine.offsetY = 50;
            this.engine.zoom = 1;
            this.engine.drawGrid();
            this.engine.render();
            
            modal.classList.add('hidden');
            lucide.createIcons();
        };
        lucide.createIcons();
    }

    async showProjectGallery() {
        const user = this.auth.getCurrentUser();
        if (!user) return;

        const container = document.getElementById('modal-container');
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="modal project-gallery-modal">
                <h3 class="modal-title">Meus Projetos Salvos</h3>
                <div class="modal-body">
                    <div id="gallery-list" class="gallery-list">
                        <div class="loading-state">Carregando seus projetos...</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" id="close-modal">Fechar</button>
                </div>
            </div>
        `;

        container.querySelector('#close-modal').onclick = () => container.classList.add('hidden');
        lucide.createIcons();

        try {
            const { loadUserProjects } = await import('../services/supabase.js');
            const projects = await loadUserProjects(user.id);
            const list = container.querySelector('#gallery-list');
            
            if (projects.length === 0) {
                list.innerHTML = '<p class="empty-state">Nenhum projeto encontrado na nuvem.</p>';
                return;
            }

            list.innerHTML = '';
            projects.forEach(p => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                const date = new Date(p.updated_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                
                item.innerHTML = `
                    <div class="gallery-info">
                        <div class="gallery-name">${p.name || 'Sem título'}</div>
                        <div class="gallery-date">${date}</div>
                    </div>
                    <button class="btn-secondary btn-sm btn-open-project" data-id="${p.id}">
                        <i data-lucide="external-link"></i> Abrir
                    </button>
                `;
                
                item.querySelector('.btn-open-project').onclick = () => {
                    // Combine project ID with the data blob
                    const projectData = { ...p.data, id: p.id };
                    this.projects.loadFromJSON(JSON.stringify(projectData));
                    this.engine.drawGrid();
                    this.engine.render();
                    container.classList.add('hidden');
                };
                
                list.appendChild(item);
            });
            lucide.createIcons();
        } catch (err) {
            console.error(err);
            container.querySelector('#gallery-list').innerHTML = `<p class="error-state">Erro ao carregar projetos: ${err.message}</p>`;
        }
    }

    updateEntity(prop, val) {
        if (this.engine.selectedEntities.length !== 1) return;
        this.projects.saveState();
        const hit = this.engine.selectedEntities[0];
        hit.entity[prop] = val;
        this.engine.render();
        this.onEntitySelected(hit);
    }

    setupMetadataActions() {
        const title = document.getElementById('project-title');
        const client = document.getElementById('project-client');
        const company = document.getElementById('project-company');
        
        if (title) title.oninput = (e) => this.projects.updateMetadata({ name: e.target.value });
        if (client) client.oninput = (e) => this.projects.updateMetadata({ client: e.target.value });
        if (company) company.oninput = (e) => this.projects.updateMetadata({ company: e.target.value });
        
        // Sync with model
        window.addEventListener('project-changed', () => {
             const m = this.projects.metadata;
             if (title && document.activeElement !== title) title.value = m.name;
             if (client && document.activeElement !== client) client.value = m.client;
             if (company && document.activeElement !== company) company.value = m.company;
             document.getElementById('project-name').textContent = m.name;
        });
    }

    setupSettingsActions() {
        const wInput = document.getElementById('workspace-width');
        const hInput = document.getElementById('workspace-height');
        
        if (wInput && hInput) {
            // Initialize values
            wInput.value = this.projects.settings.widthMeters;
            hInput.value = this.projects.settings.heightMeters;

            wInput.addEventListener('change', (e) => {
                this.projects.updateSettings({ widthMeters: parseInt(e.target.value) });
                this.engine.drawGrid();
                this.engine.render();
            });
            
            hInput.addEventListener('change', (e) => {
                this.projects.updateSettings({ heightMeters: parseInt(e.target.value) });
                this.engine.drawGrid();
                this.engine.render();
            });
        }
    }

    onKeyDown(e) {
        if (e.target.tagName === 'INPUT') return;
        
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.projects.redo();
                else this.projects.undo();
                return;
            }
            if (e.key === 'y') {
                e.preventDefault();
                this.projects.redo();
                return;
            }
        }

        switch(e.key.toLowerCase()) {
            case 's': this.setTool('select'); break;
            case 'w': this.setTool('wall'); break;
            case 'd': this.setTool('door'); break;
            case 'j': this.setTool('window'); break;
            case 'c': this.setTool('camera'); break;
            case 'r': this.setTool('ruler'); break;
            case 't': this.setTool('text'); break;
            case 'e': this.setTool('erase'); break;
            case 'm': this.setTool('move'); break;
            case 'escape': 
                this.setTool('select');
                this.engine.selectedEntities = [];
                this.onEntitySelected(null);
                this.engine.render();
                break;
            case 'delete':
                if (this.engine.selectedEntities.length > 0) {
                    if (confirm(`Excluir ${this.engine.selectedEntities.length} itens selecionados?`)) {
                        this.projects.saveState();
                        this.engine.selectedEntities.forEach(s => {
                            if (s.type === 'camera') this.projects.cameras = this.projects.cameras.filter(c => c !== s.entity);
                            else if (s.type === 'wall') this.projects.walls = this.projects.walls.filter(w => w !== s.entity);
                            else if (s.type === 'label') this.projects.labels = this.projects.labels.filter(l => l !== s.entity);
                        });
                        this.engine.selectedEntities = [];
                        this.onEntitySelected(null);
                        this.engine.render();
                        this.renderPlacedList();
                    }
                }
                break;
        }
    }
}

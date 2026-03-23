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
            pnl.innerHTML = `
                <h3 class="panel-title">Editar Parede</h3>
                <p class="panel-desc">Medida: ${Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2).toFixed(2)}m</p>
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
                
                if (prop === 'widthCm') {
                    entity.width = parseInt(val) / 100;
                    if (e.target.previousElementSibling?.querySelector('.val')) {
                        e.target.previousElementSibling.querySelector('.val').textContent = `${val}cm`;
                    }
                } else if (isBool) {
                    entity[prop] = val;
                } else {
                    entity[prop] = (prop === 'name' || prop === 'text') ? val : parseInt(val);
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
            item.className = `device-item ${this.engine.selectedEntity?.index === i ? 'selected' : ''}`;
            item.innerHTML = `
                <div class="device-dot" style="background: rgb(${cam.color})"></div>
                <div class="device-info">
                    <div class="device-name">${cam.name}</div>
                    <div class="device-meta">${cam.brand} · ${cam.modelName}</div>
                </div>
            `;
            item.onclick = () => {
                this.engine.selectedEntity = { type: 'camera', index: i, entity: cam };
                this.onEntitySelected(this.engine.selectedEntity);
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
        const settings = this.projects.settings;
        const SCALE = 10;
        
        // Capture a clean snapshot of the workspace
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = settings.widthMeters * SCALE;
        exportCanvas.height = settings.heightMeters * SCALE;
        const ctx = exportCanvas.getContext('2d');
        
        // Draw grid
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let x = 0; x <= exportCanvas.width; x += SCALE) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, exportCanvas.height); ctx.stroke();
        }
        for (let y = 0; y <= exportCanvas.height; y += SCALE) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(exportCanvas.width, y); ctx.stroke();
        }

        // Draw entities (simplified render loop for export)
        this.projects.walls.forEach(w => w.draw(ctx, 1));
        this.projects.cameras.forEach(c => {
            c.drawFOV(ctx, 1, false, this.projects.walls);
            c.draw(ctx, 1, false, false);
        });
        this.projects.labels.forEach(l => l.draw(ctx, 1, false, false));

        const imgData = exportCanvas.toDataURL('image/png');

        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <html>
                <head>
                    <title>Projeto CFTV - ${meta.name}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #334155; line-height: 1.5; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                        h1 { margin: 0; color: #0f172a; font-size: 24px; }
                        .meta-info p { margin: 4px 0; font-size: 14px; }
                        .company-info { text-align: right; font-size: 14px; }
                        .canvas-preview { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; margin: 30px 0; max-height: 500px; object-fit: contain; background: #fff; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
                        td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="meta-info">
                            <h1>${meta.name}</h1>
                            <p><strong>Cliente:</strong> ${meta.client || 'Padrão'}</p>
                            <p><strong>Endereço:</strong> ${meta.address || 'Não informado'}</p>
                            <p><strong>Data:</strong> ${new Date(meta.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div class="company-info">
                            <div style="font-weight: 700; color: #3b82f6; font-size: 18px;">${meta.company || 'CFTV PLANNER PRO'}</div>
                            <div>Projetos e Segurança Eletrônica</div>
                            <div style="color: #64748b; margin-top: 4px;">${meta.contact || 'cftv-planner-pro.github.io'}</div>
                        </div>
                    </div>

                    <h2 style="font-size: 18px; margin-bottom: 10px;">Planta do Projeto</h2>
                    <img src="${imgData}" class="canvas-preview">

                    <h2 style="font-size: 18px; margin-top: 40px; margin-bottom: 15px;">Lista de Materiais (BOM)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 80px;">Qtd</th>
                                <th>Marca</th>
                                <th>Modelo / Especificação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bom.map(item => `
                                <tr>
                                    <td><strong>${item.quantity}x</strong></td>
                                    <td>${item.brand}</td>
                                    <td>${item.model}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        Este relatório foi gerado automaticamente pelo CFTV Planner Pro.<br>
                        © ${new Date().getFullYear()} - Todos os direitos reservados.
                    </div>
                </body>
            </html>
        `);
        printWin.document.close();
        setTimeout(() => {
            printWin.print();
            // printWin.close(); // Optional: close after print
        }, 1000);
    }

    onProjectUpdate(stats) {
        document.getElementById('hdr-cams').textContent = stats.cameraCount;
        document.getElementById('hdr-walls').textContent = stats.wallCount;
        this.renderPlacedList();
    }

    setupHeaderActions() {
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
                this.engine.selectedEntity = null;
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
                    <span class="user-name">${name}</span>
                    <button class="btn-ghost" id="btn-logout" title="Sair">
                        <i data-lucide="log-out"></i>
                    </button>
                </div>
            `;
            document.getElementById('btn-logout').onclick = () => this.auth.signOut();
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

    updateEntity(prop, val) {
        if (!this.engine.selectedEntity) return;
        this.projects.saveState();
        this.engine.selectedEntity.entity[prop] = val;
        this.engine.render();
        this.onEntitySelected(this.engine.selectedEntity);
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
                this.engine.selectedEntity = null;
                this.onEntitySelected(null);
                this.engine.render();
                break;
            case 'delete':
                if (this.engine.selectedEntity) {
                    const hit = this.engine.selectedEntity;
                    if (hit.type === 'camera') this.projects.removeCamera(hit.index);
                    else if (hit.type === 'wall') this.projects.removeWall(hit.index);
                    else if (hit.type === 'label') this.projects.removeLabel(hit.index);
                    this.engine.selectedEntity = null;
                    this.onEntitySelected(null);
                    this.engine.render();
                }
                break;
        }
    }
}

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
        this.setupThemeToggle();
        this.renderCatalog();
        this.setupCatalogFilters();
        
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
        if (!hit || hit.type !== 'camera') {
            pnl.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="info"></i>
                    <p>Selecione um elemento para configurar</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const cam = hit.entity;
        pnl.innerHTML = `
            <div class="prop-group">
                <label>Nome / Identificação</label>
                <input type="text" value="${cam.name}" data-prop="name">
            </div>
            <div class="prop-group">
                <label>Rotação: <span class="val">${cam.rotation}°</span></label>
                <input type="range" min="0" max="360" value="${cam.rotation}" data-prop="rotation">
            </div>
            <div class="prop-group">
                <label>FOV (Abertura): <span class="val">${cam.fov}°</span></label>
                <input type="range" min="10" max="180" value="${cam.fov}" data-prop="fov">
            </div>
            <div class="prop-group">
                <label>Alcance: <span class="val">${cam.range}m</span></label>
                <input type="range" min="1" max="100" value="${cam.range}" data-prop="range">
            </div>
            <div class="prop-group">
                <label>Cor do FOV</label>
                <div class="color-picker">
                    <div class="color-swatch active" style="background: rgb(0,229,255)" data-color="0,229,255"></div>
                    <div class="color-swatch" style="background: rgb(57,255,20)" data-color="57,255,20"></div>
                    <div class="color-swatch" style="background: rgb(255,107,53)" data-color="255,107,53"></div>
                </div>
            </div>
            <button class="btn-danger-outline" id="btn-delete-entity">
                <i data-lucide="trash-2"></i> Excluir Câmera
            </button>
        `;

        // Tooltip updates
        pnl.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const prop = e.target.getAttribute('data-prop');
                const val = e.target.value;
                cam[prop] = prop === 'name' ? val : parseInt(val);
                if (e.target.previousElementSibling?.querySelector('.val')) {
                    e.target.previousElementSibling.querySelector('.val').textContent = `${val}${prop === 'name' ? '' : (prop === 'range' ? 'm' : '°')}`;
                }
                this.engine.render();
                this.renderPlacedList();
            });
        });

        // Set initial active color
        pnl.querySelectorAll('.color-swatch').forEach(swatch => {
            if (swatch.getAttribute('data-color') === cam.color) {
                swatch.classList.add('active');
            } else {
                swatch.classList.remove('active');
            }
            
            swatch.onclick = () => {
                const color = swatch.getAttribute('data-color');
                cam.color = color;
                pnl.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                this.engine.render();
                this.renderPlacedList();
            };
        });

        pnl.querySelector('#btn-delete-entity').onclick = () => {
            this.projects.removeCamera(hit.index);
            this.onEntitySelected(null);
            this.engine.selectedEntity = null;
            this.engine.render();
        };

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
                <button class="btn-primary" style="margin-top: 12px; width: 100%" id="btn-print-bom">
                    <i data-lucide="printer"></i> Imprimir BOM
                </button>
            </div>
        `;
        
        pnl.querySelector('#btn-print-bom').onclick = () => window.print();
        lucide.createIcons();
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
        // Simple prompt or a dedicated modal
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

    onKeyDown(e) {
        if (e.target.tagName === 'INPUT') return;
        
        switch(e.key.toLowerCase()) {
            case 's': this.setTool('select'); break;
            case 'w': this.setTool('wall'); break;
            case 'c': this.setTool('camera'); break;
            case 'r': this.setTool('ruler'); break;
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
                    else this.projects.removeWall(hit.index);
                    this.engine.selectedEntity = null;
                    this.onEntitySelected(null);
                    this.engine.render();
                }
                break;
        }
    }
}

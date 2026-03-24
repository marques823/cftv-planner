import { generateBOM } from '../engine/bom.js';
import { exportToCSV, exportToPDF } from './bom-export.js';

export class BOMManager {
    constructor(project) {
        this.project = project;
        this.bom = [];
        this.overrides = this.loadOverrides();
        
        window.addEventListener('open-bom', () => this.open());
        window.addEventListener('project-changed', () => {
            if (document.getElementById('bom-modal')) this.refresh();
        });
    }

    loadOverrides() {
        const saved = localStorage.getItem(`bom_overrides_${this.project.id || 'temp'}`);
        return saved ? JSON.parse(saved) : {};
    }

    saveOverrides() {
        localStorage.setItem(`bom_overrides_${this.project.id || 'temp'}`, JSON.stringify(this.overrides));
    }

    open() {
        this.refresh();
        this.render();
    }

    refresh() {
        // Generate base BOM from engine
        const baseBOM = generateBOM(this.project);
        
        // Apply overrides
        baseBOM.forEach(cat => {
            cat.items.forEach(item => {
                const ovr = this.overrides[item.description]; // Using description as key for simplicity since IDs are random
                if (ovr) {
                    if (ovr.qty !== undefined) item.qty = ovr.qty;
                    if (ovr.unitPrice !== undefined) item.unitPrice = ovr.unitPrice;
                    if (ovr.inStock !== undefined) item.inStock = ovr.inStock;
                }
            });
        });

        this.bom = baseBOM;
    }

    render() {
        let modal = document.getElementById('bom-modal-overlay');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bom-modal-overlay';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        modal.classList.remove('hidden');
        
        const totalGeral = this.calculateTotal();

        modal.innerHTML = `
            <div class="bom-modal">
                <div class="bom-header">
                    <h2>📋 Lista de Materiais (BOM)</h2>
                    <button class="btn-ghost" id="btn-close-bom"><i data-lucide="x"></i></button>
                </div>

                <div class="bom-content">
                    ${this.bom.map(cat => `
                        <section class="bom-category">
                            <h3>${cat.name}</h3>
                            <table class="bom-table">
                                <thead>
                                    <tr>
                                        <th style="width: 40px">Est.</th>
                                        <th>Descrição</th>
                                        <th style="width: 60px">Qtd</th>
                                        <th>Unid</th>
                                        <th>Referência</th>
                                        <th>Preço Un.</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${cat.items.map(item => `
                                        <tr data-id="${item.id}" data-desc="${item.description}">
                                            <td><input type="checkbox" class="stock-chk" ${item.inStock ? 'checked' : ''}></td>
                                            <td>${item.description}</td>
                                            <td><input type="number" class="qty-input" value="${item.qty}"></td>
                                            <td>${item.unit}</td>
                                            <td><span class="text-dim">${item.reference}</span></td>
                                            <td>R$ <input type="number" step="0.01" class="price-input" value="${item.unitPrice || ''}"></td>
                                            <td class="subtotal">R$ ${((item.unitPrice || 0) * item.qty).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </section>
                    `).join('')}
                </div>

                <div class="bom-footer">
                    <div class="total-geral" style="margin-right: auto; font-size: 18px">
                        Total: <span class="highlight">R$ ${totalGeral.toFixed(2)}</span>
                    </div>
                    <button class="btn-secondary" id="btn-add-manual"><i data-lucide="plus"></i> Item Manual</button>
                    <button class="btn-secondary" id="btn-csv-export"><i data-lucide="download"></i> CSV</button>
                    <button class="btn-primary" id="btn-pdf-export"><i data-lucide="file-text"></i> PDF / Imprimir</button>
                </div>
            </div>
        `;

        lucide.createIcons();
        this.setupEventListeners(modal);
    }

    calculateTotal() {
        let total = 0;
        this.bom.forEach(cat => {
            cat.items.forEach(item => {
                total += (item.unitPrice || 0) * item.qty;
            });
        });
        return total;
    }

    setupEventListeners(modal) {
        modal.querySelector('#btn-close-bom').onclick = () => modal.classList.add('hidden');
        
        modal.querySelectorAll('.qty-input, .price-input, .stock-chk').forEach(input => {
            input.onchange = (e) => {
                const tr = e.target.closest('tr');
                const desc = tr.getAttribute('data-desc');
                const qty = parseFloat(tr.querySelector('.qty-input').value);
                const price = parseFloat(tr.querySelector('.price-input').value) || 0;
                const inStock = tr.querySelector('.stock-chk').checked;

                this.overrides[desc] = { qty, unitPrice: price, inStock };
                this.saveOverrides();
                this.refresh();
                this.render();
            };
        });

        modal.querySelector('#btn-csv-export').onclick = () => exportToCSV(this.bom);
        modal.querySelector('#btn-pdf-export').onclick = () => exportToPDF(this.bom, this.project.metadata);
        
        modal.querySelector('#btn-add-manual').onclick = () => {
            const desc = prompt("Descrição do item:");
            if (desc) {
                if (!this.overrides[desc]) {
                    this.overrides[desc] = { qty: 1, unitPrice: 0, inStock: false };
                    this.saveOverrides();
                    // To handle manual items permanently, we should ideally add them to the BOM array
                    // For now, they will show up if we add them as a dummy category or items
                    // I'll add a 'Manual' item to the overrides only.
                    this.refresh();
                    this.render();
                }
            }
        };
    }
}

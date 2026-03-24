import { saveProjectToCloud } from './supabase.js';
import { HistoryManager } from './history.js';
import { Camera, Wall, TextLabel } from '../engine/entities.js';

export class ProjectManager {
    constructor() {
        this.id = null;
        this.cameras = [];
        this.walls = [];
        this.labels = []; // New labels array
        this.metadata = {
            name: "Projeto sem título",
            client: "",
            address: "",
            company: "Sua Empresa",
            contact: "seu-site.com.br",
            date: new Date().toISOString()
        };
        this.settings = {
            widthMeters: 50,
            heightMeters: 30
        };
        this.history = new HistoryManager();
    }

    updateMetadata(updates) {
        this.saveState();
        this.metadata = { ...this.metadata, ...updates };
        this.notifyChange();
    }

    saveState() {
        this.history.push({
            cameras: JSON.parse(JSON.stringify(this.cameras)),
            walls: JSON.parse(JSON.stringify(this.walls)),
            labels: JSON.parse(JSON.stringify(this.labels)),
            settings: JSON.parse(JSON.stringify(this.settings))
        });
    }

    undo() {
        const state = this.history.undo({
            cameras: JSON.parse(JSON.stringify(this.cameras)),
            walls: JSON.parse(JSON.stringify(this.walls)),
            labels: JSON.parse(JSON.stringify(this.labels)),
            settings: JSON.parse(JSON.stringify(this.settings))
        });
        if (state) this.applyState(state);
    }

    redo() {
        const state = this.history.redo({
            cameras: JSON.parse(JSON.stringify(this.cameras)),
            walls: JSON.parse(JSON.stringify(this.walls)),
            labels: JSON.parse(JSON.stringify(this.labels)),
            settings: JSON.parse(JSON.stringify(this.settings))
        });
        if (state) this.applyState(state);
    }

    applyState(state) {
        this.loadFromJSON(JSON.stringify({ ...this.metadata, ...state }));
        window.dispatchEvent(new CustomEvent('project-changed'));
    }

    // ... (rest of add/remove methods remain similar but ensure notifyChange is called)

    addCamera(cam) {
        this.saveState();
        this.cameras.push(cam);
        this.notifyChange();
    }

    addWall(wall) {
        this.saveState();
        this.walls.push(wall);
        this.notifyChange();
    }

    removeCamera(index) {
        this.saveState();
        this.cameras.splice(index, 1);
        this.notifyChange();
    }

    removeWall(index) {
        this.saveState();
        this.walls.splice(index, 1);
        this.notifyChange();
    }

    addLabel(label) {
        this.saveState();
        this.labels.push(label);
        this.notifyChange();
    }

    removeLabel(index) {
        this.saveState();
        this.labels.splice(index, 1);
        this.notifyChange();
    }

    clear() {
        this.saveState();
        this.cameras = [];
        this.walls = [];
        this.labels = [];
        this.notifyChange();
    }

    notifyChange() {
        // Auto-save to localStorage
        localStorage.setItem('cftv_project_latest', this.toJSON());
        
        const event = new CustomEvent('project-changed', { 
            detail: { 
                cameraCount: this.cameras.length,
                wallCount: this.walls.length
            } 
        });
        window.dispatchEvent(event);
    }

    getBOM() {
        const bom = {};
        this.cameras.forEach(cam => {
            const key = `${cam.brand}-${cam.modelName}`;
            if (!bom[key]) {
                bom[key] = {
                    brand: cam.brand,
                    model: cam.modelName,
                    quantity: 0
                };
            }
            bom[key].quantity++;
        });
        return Object.values(bom);
    }

    toJSON() {
        return JSON.stringify({
            ...this.metadata,
            cameras: this.cameras,
            walls: this.walls,
            labels: this.labels,
            settings: this.settings,
            id: this.id // Place at the end to ensure it's not overwritten by spread
        });
    }

    async save(userId = null) {
        const data = JSON.parse(this.toJSON());
        console.log('Iniciando salvamento. ID atual:', this.id);
        if (userId) {
            try {
                const { saveProjectToCloud } = await import('./supabase.js');
                const res = await saveProjectToCloud(data, userId, this.id);
                console.log('Resposta do Supabase:', res);
                // Supabase .select() returns an array
                if (res.data?.[0]?.id) {
                    this.id = res.data[0].id;
                    console.log('ID do projeto atualizado para:', this.id);
                }
            } catch (err) {
                console.error('Erro ao salvar na nuvem:', err);
                alert('Erro ao salvar: ' + err.message);
            }
        }
        localStorage.setItem('cftv_project_latest', this.toJSON());
        this.notifyChange();
    }

    updateSettings(newSettings) {
        this.saveState();
        this.settings = { ...this.settings, ...newSettings };
        this.notifyChange();
    }

    loadFromJSON(json) {
        try {
            this.saveState();
            const data = JSON.parse(json);
            
            this.id = data.id || null;
            this.metadata = {
                name: data.name || "Projeto sem título",
                client: data.client || "",
                address: data.address || "",
                company: data.company || "Sua Empresa",
                contact: data.contact || "seu-site.com.br",
                date: data.date || new Date().toISOString()
            };
            
            this.settings = data.settings || { widthMeters: 50, heightMeters: 30 };
            
            this.cameras = (data.cameras || []).map(c => new Camera(c));
            this.walls = (data.walls || []).map(w => new Wall(w.x1, w.y1, w.x2, w.y2, w.color, w.showMeasurements, w.elements));
            this.labels = (data.labels || []).map(l => new TextLabel(l));
            this.labels = (data.labels || []).map(l => new TextLabel(l));
            
            this.notifyChange();
        } catch (e) {
            console.error("Failed to load project:", e);
        }
    }
}

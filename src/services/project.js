export class ProjectManager {
    constructor() {
        this.projectName = "Projeto sem título";
        this.clientName = "";
        this.address = "";
        this.date = new Date().toISOString();
        
        this.cameras = [];
        this.walls = [];
    }

    addCamera(camera) {
        this.cameras.push(camera);
        this.notifyChange();
    }

    addWall(wall) {
        this.walls.push(wall);
        this.notifyChange();
    }

    removeCamera(index) {
        this.cameras.splice(index, 1);
        this.notifyChange();
    }

    removeWall(index) {
        this.walls.splice(index, 1);
        this.notifyChange();
    }

    clear() {
        this.cameras = [];
        this.walls = [];
        this.notifyChange();
    }

    notifyChange() {
        // Dispatch event or call callbacks
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
            name: this.projectName,
            client: this.clientName,
            address: this.address,
            date: this.date,
            cameras: this.cameras,
            walls: this.walls
        });
    }
    async save(userId = null) {
        const data = JSON.parse(this.toJSON());
        if (userId) {
            try {
                const { saveProjectToCloud } = await import('./supabase.js');
                await saveProjectToCloud(data, userId);
            } catch (err) {
                console.error('Erro ao salvar na nuvem:', err);
                localStorage.setItem('cftv_project_latest', JSON.stringify(data));
            }
        } else {
            localStorage.setItem('cftv_project_latest', JSON.stringify(data));
        }
        this.notifyChange();
    }

    loadFromJSON(json) {
        const data = JSON.parse(json);
        this.projectName = data.name || "Projeto sem título";
        this.clientName = data.client || "";
        this.address = data.address || "";
        this.date = data.date || new Date().toISOString();
        
        // Convert to class instances if needed
        this.cameras = data.cameras || [];
        this.walls = data.walls || [];
        
        this.notifyChange();
    }
}

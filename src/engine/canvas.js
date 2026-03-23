import { Camera, Wall } from './entities.js';

const SCALE = 10; // 10px = 1m

export class CanvasEngine {
    constructor(mainCanvasId, bgCanvasId) {
        this.mainCanvas = document.getElementById(mainCanvasId);
        this.bgCanvas = document.getElementById(bgCanvasId);
        this.ctx = this.mainCanvas.getContext('2d');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        this.zoom = 1;
        this.offsetX = 50;
        this.offsetY = 50;
        
        this.isPanning = false;
        this.isDragging = false;
        this.isDrawingWall = false;
        
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.dragOffset = { x: 0, y: 0 };
        
        this.project = null; // Set via setter
        this.selectedEntity = null;
        this.hoveredEntity = null;
        
        this.wallStart = null;
    }

    setProject(project) {
        this.project = project;
        window.addEventListener('project-changed', () => this.render());
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupEvents();
        this.render();
    }

    resize() {
        const container = this.mainCanvas.parentElement;
        this.mainCanvas.width = container.clientWidth;
        this.mainCanvas.height = container.clientHeight;
        this.bgCanvas.width = container.clientWidth;
        this.bgCanvas.height = container.clientHeight;
        this.drawGrid();
        this.render();
    }

    setupEvents() {
        this.mainCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.mainCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.mainCanvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.mainCanvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.mainCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Coordinate conversion
    c2w(cx, cy) {
        return {
            x: (cx - this.offsetX) / this.zoom,
            y: (cy - this.offsetY) / this.zoom
        };
    }

    snap(v, g = 10) {
        return Math.round(v / g) * g;
    }

    getEntityAt(wx, wy) {
        if (!this.project) return null;
        
        // Check cameras first (reverse order for top-most)
        for (let i = this.project.cameras.length - 1; i >= 0; i--) {
            const cam = this.project.cameras[i];
            const dx = cam.x - wx;
            const dy = cam.y - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 15 / this.zoom) return { type: 'camera', index: i, entity: cam };
        }
        
        // Check walls
        for (let i = 0; i < this.project.walls.length; i++) {
            const w = this.project.walls[i];
            const dx = w.x2 - w.x1;
            const dy = w.y2 - w.y1;
            const len2 = dx * dx + dy * dy;
            if (len2 === 0) continue;
            const t = Math.max(0, Math.min(1, ((wx - w.x1) * dx + (wy - w.y1) * dy) / len2));
            const projX = w.x1 + t * dx;
            const projY = w.y1 + t * dy;
            const dist = Math.sqrt((wx - projX) ** 2 + (wy - projY) ** 2);
            if (dist < 8 / this.zoom) return { type: 'wall', index: i, entity: w };
        }
        
        return null;
    }

    onMouseDown(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldPos = this.c2w(mx, my);

        if (e.button === 2) { // Right click pan
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            return;
        }

        const tool = window.app.ui.currentTool;

        if (tool === 'select') {
            // ... existing select logic ...
        } else if (tool === 'ruler') {
            const sx = worldPos.x;
            const sy = worldPos.y;
            if (!this.isMeasuring) {
                this.isMeasuring = true;
                this.measureStart = { x: sx, y: sy };
                this.measureEnd = { x: sx, y: sy };
            } else {
                this.isMeasuring = false;
                this.measureStart = null;
                this.measureEnd = null;
            }
        } else if (tool === 'camera') {
            const model = window.app.ui.selectedModel;
            if (model) {
                const sx = this.snap(worldPos.x);
                const sy = this.snap(worldPos.y);
                const newCam = new Camera({
                    ...model,
                    x: sx,
                    y: sy,
                    displayName: `CAM-${String(this.project.cameras.length + 1).padStart(2, '0')}`
                });
                this.project.addCamera(newCam);
                this.selectedEntity = { type: 'camera', index: this.project.cameras.length - 1, entity: newCam };
                window.app.ui.onEntitySelected(this.selectedEntity);
            }
        } else if (tool === 'wall') {
            const sx = this.snap(worldPos.x);
            const sy = this.snap(worldPos.y);
            if (!this.isDrawingWall) {
                this.isDrawingWall = true;
                this.wallStart = { x: sx, y: sy };
            } else {
                const newWall = new Wall(this.wallStart.x, this.wallStart.y, sx, sy);
                this.project.addWall(newWall);
                this.wallStart = { x: sx, y: sy };
            }
        } else if (tool === 'erase') {
            const hit = this.getEntityAt(worldPos.x, worldPos.y);
            if (hit) {
                if (hit.type === 'camera') this.project.removeCamera(hit.index);
                else this.project.removeWall(hit.index);
                this.selectedEntity = null;
                window.app.ui.onEntitySelected(null);
            }
        }
    }

    onMouseMove(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldPos = this.c2w(mx, my);

        // Update status coordinates
        document.getElementById('status-pos').textContent = 
            `${Math.round(worldPos.x / SCALE)}m, ${Math.round(worldPos.y / SCALE)}m`;

        if (this.isPanning) {
            this.offsetX += e.clientX - this.lastMouseX;
            this.offsetY += e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.drawGrid();
            this.render();
            return;
        }

        if (this.isDragging && this.selectedEntity?.type === 'camera') {
            const targetX = worldPos.x - this.dragOffset.x;
            const targetY = worldPos.y - this.dragOffset.y;
            this.selectedEntity.entity.x = this.snap(targetX);
            this.selectedEntity.entity.y = this.snap(targetY);
            this.render();
            return;
        }

        // Hover handling
        const hit = this.getEntityAt(worldPos.x, worldPos.y);
        if (hit !== this.hoveredEntity) {
            this.hoveredEntity = hit;
            this.render();
        }

        if (this.isMeasuring) {
            this.measureEnd = { x: worldPos.x, y: worldPos.y };
            this.render();
            return;
        }

        if (this.isDrawingWall) {
            this.render(); // Need to draw preview
        }
    }

    onMouseUp(e) {
        this.isPanning = false;
        this.isDragging = false;
    }

    onWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const delta = -e.deltaY;
        const newZoom = Math.min(Math.max(0.1, this.zoom + delta * zoomSpeed), 5);
        
        const rect = this.mainCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        const worldPos = this.c2w(mx, my);
        
        this.zoom = newZoom;
        this.offsetX = mx - worldPos.x * this.zoom;
        this.offsetY = my - worldPos.y * this.zoom;
        
        document.getElementById('hdr-zoom').textContent = `${Math.round(this.zoom * 100)}%`;
        
        this.drawGrid();
        this.render();
    }

    drawGrid() {
        const ctx = this.bgCtx;
        const w = this.bgCanvas.width;
        const h = this.bgCanvas.height;
        ctx.clearRect(0, 0, w, h);
        
        const isLightTheme = document.body.classList.contains('light-theme');
        const gridColor = isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)';
        const majorColor = isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)';

        const gs = 50 * this.zoom;
        const startX = ((this.offsetX % gs) + gs) % gs;
        const startY = ((this.offsetY % gs) + gs) % gs;
        
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        for (let x = startX; x < w; x += gs) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = startY; y < h; y += gs) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Major grid
        const ms = gs * 5;
        const mStartX = ((this.offsetX % ms) + ms) % ms;
        const mStartY = ((this.offsetY % ms) + ms) % ms;
        
        ctx.strokeStyle = majorColor;
        ctx.beginPath();
        for (let x = mStartX; x < w; x += ms) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = mStartY; y < h; y += ms) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();
    }

    render() {
        if (!this.project) return;
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoom, this.zoom);
        
        // Render walls
        this.project.walls.forEach(w => {
            w.draw(ctx, this.zoom);
        });

        // Current wall preview
        const tool = window.app.ui?.currentTool;
        if (tool === 'wall' && this.isDrawingWall && this.wallStart) {
            const rect = this.mainCanvas.getBoundingClientRect();
            // Need a way to get mouse in world pos without triggering extra events
            // For now, it's handled in onMouseMove's render call via state
        }

        // Render Ruler
        if (this.isMeasuring && this.measureStart && this.measureEnd) {
            const dx = this.measureEnd.x - this.measureStart.x;
            const dy = this.measureEnd.y - this.measureStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const distMeters = (dist / SCALE).toFixed(2);

            ctx.beginPath();
            ctx.moveTo(this.measureStart.x, this.measureStart.y);
            ctx.lineTo(this.measureEnd.x, this.measureEnd.y);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2 / this.zoom;
            ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw distance label
            const midX = (this.measureStart.x + this.measureEnd.x) / 2;
            const midY = (this.measureStart.y + this.measureEnd.y) / 2;
            ctx.font = `${12 / this.zoom}px "JetBrains Mono", monospace`;
            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'center';
            ctx.fillText(`${distMeters}m`, midX, midY - 10 / this.zoom);
        }

        // Render FOVs (underneath cameras)
        this.project.cameras.forEach((cam, i) => {
            const isSelected = this.selectedEntity?.type === 'camera' && this.selectedEntity.index === i;
            cam.drawFOV(ctx, this.zoom, isSelected);
        });

        // Render cameras
        this.project.cameras.forEach((cam, i) => {
            const isSelected = this.selectedEntity?.type === 'camera' && this.selectedEntity.index === i;
            const isHovered = this.hoveredEntity?.type === 'camera' && this.hoveredEntity.index === i;
            cam.draw(ctx, this.zoom, isSelected, isHovered);
        });
        
        ctx.restore();
    }
}

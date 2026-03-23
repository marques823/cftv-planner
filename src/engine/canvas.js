import { Camera, Wall, TextLabel } from './entities.js';

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
        this.pointers = new Map();
        this.pinchDist = 0;
        this.pinchBaseZoom = 1; // zoom at start of pinch gesture

        // Double-tap detection (to finalize wall on mobile/stylus)
        this._lastTapTime = 0;
        this._lastTapX = 0;
        this._lastTapY = 0;
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
        const dpr = window.devicePixelRatio || 1;
        const container = this.mainCanvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) return;

        this.mainCanvas.width = width * dpr;
        this.mainCanvas.height = height * dpr;
        this.mainCanvas.style.width = width + 'px';
        this.mainCanvas.style.height = height + 'px';

        this.bgCanvas.width = width * dpr;
        this.bgCanvas.height = height * dpr;
        this.bgCanvas.style.width = width + 'px';
        this.bgCanvas.style.height = height + 'px';

        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);
        this.bgCtx.resetTransform();
        this.bgCtx.scale(dpr, dpr);

        this.drawGrid();
        this.render();
    }

    setupEvents() {
        this.mainCanvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.mainCanvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.mainCanvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.mainCanvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
        this.mainCanvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.mainCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Ensure stylus/touch don't scroll the page
        this.mainCanvas.style.touchAction = 'none';
        this.bgCanvas.style.touchAction = 'none';
    }

    // Coordinate conversion
    c2w(cx, cy) {
        return {
            x: (cx - this.offsetX) / this.zoom,
            y: (cy - this.offsetY) / this.zoom
        };
    }

    snap(v, g = 0.1) {
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

        // Check wall endpoints first (higher priority than wall body)
        const endpointRadius = 14 / this.zoom;
        for (let i = 0; i < this.project.walls.length; i++) {
            const w = this.project.walls[i];
            const d1 = Math.sqrt((wx - w.x1) ** 2 + (wy - w.y1) ** 2);
            if (d1 < endpointRadius) return { type: 'wall-endpoint', index: i, entity: w, which: 'p1' };
            const d2 = Math.sqrt((wx - w.x2) ** 2 + (wy - w.y2) ** 2);
            if (d2 < endpointRadius) return { type: 'wall-endpoint', index: i, entity: w, which: 'p2' };
        }

        // Check wall elements AND wall bodies together
        for (let i = 0; i < this.project.walls.length; i++) {
            const w = this.project.walls[i];
            const dx = w.x2 - w.x1;
            const dy = w.y2 - w.y1;
            const len2 = dx * dx + dy * dy;
            if (len2 === 0) continue;
            
            // Vector projection to find closest point on segment
            const t = Math.max(0, Math.min(1, ((wx - w.x1) * dx + (wy - w.y1) * dy) / len2));
            const projX = w.x1 + t * dx;
            const projY = w.y1 + t * dy;
            const dist = Math.sqrt((wx - projX) ** 2 + (wy - projY) ** 2);
            
            if (dist < 8 / this.zoom) { // Within wall thickness
                if (w.elements && w.elements.length > 0) {
                    const len = Math.sqrt(len2);
                    for (let j = 0; j < w.elements.length; j++) {
                        const el = w.elements[j];
                        // Convert half width to t-parameter
                        const elHalfT = ((el.width * 10) / 2) / len;
                        // Add a small margin (e.g. 5 pixels) for easier clicking
                        const marginT = 5 / len;
                        if (Math.abs(t - el.t) <= elHalfT + marginT) {
                            return { type: 'wall-element', wall: w, elementIndex: j, index: i, entity: el };
                        }
                    }
                }
                return { type: 'wall', index: i, entity: w };
            }
        }

        // Check labels
        for (let i = this.project.labels.length - 1; i >= 0; i--) {
            const l = this.project.labels[i];
            const dx = l.x - wx;
            const dy = l.y - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20 / this.zoom) return { type: 'label', index: i, entity: l };
        }

        return null;
    }

    onPointerDown(e) {
        // Ignore hover events (S-Pen hovering without touching)
        if (e.buttons === 0) return;

        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
        
        const rect = this.mainCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldPos = this.c2w(mx, my);

        if (this.pointers.size === 2) {
            const entries = Array.from(this.pointers.values());
            // Pinch zoom only for two-finger touch — never when S-Pen is one of the pointers
            const allTouch = entries.every(p => p.type === 'touch');
            if (!allTouch) return;
            this.pinchDist = Math.sqrt((entries[0].x - entries[1].x)**2 + (entries[0].y - entries[1].y)**2);
            this.pinchBaseZoom = this.zoom;
            this.isPanning = true;
            this.isDrawingWall = false;
            this.isDragging = false;
            return;
        }

        // --- Double-tap detection: finalize wall on mobile/stylus ---
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            const now = Date.now();
            const rect2 = this.mainCanvas.getBoundingClientRect();
            const tapX = e.clientX - rect2.left;
            const tapY = e.clientY - rect2.top;
            const dx2 = tapX - this._lastTapX;
            const dy2 = tapY - this._lastTapY;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            if (now - this._lastTapTime < 300 && dist2 < 40) {
                // Double-tap detected
                if (this.isDrawingWall) {
                    this.isDrawingWall = false;
                    this.wallStart = null;
                    this.alignmentGuides = [];
                    this.render();
                    this._lastTapTime = 0;
                    return;
                }
            }
            this._lastTapTime = now;
            this._lastTapX = tapX;
            this._lastTapY = tapY;
        }

        if (e.button === 2) { // Right click
            if (this.isDrawingWall) {
                this.isDrawingWall = false;
                this.wallStart = null;
                this.alignmentGuides = [];
                this.render();
                return;
            }
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            return;
        }

        const tool = window.app.ui.currentTool;

        if (tool === 'select' || tool === 'move') {
            const hit = this.getEntityAt(worldPos.x, worldPos.y);
            this.selectedEntity = hit;
            window.app.ui.onEntitySelected(hit);

            if (hit) {
                if (tool === 'move') {
                    this.project.saveState();
                    this.isDragging = true;
                    if (hit.type === 'camera') {
                        this.dragOffset = {
                            x: worldPos.x - hit.entity.x,
                            y: worldPos.y - hit.entity.y
                        };
                    } else if (hit.type === 'wall-endpoint') {
                        // drag only the endpoint that was clicked
                        this.dragOffset = { which: hit.which };
                    } else if (hit.type === 'wall') {
                        // drag whole wall body
                        this.dragOffset = {
                            x1: worldPos.x - hit.entity.x1,
                            y1: worldPos.y - hit.entity.y1,
                            x2: worldPos.x - hit.entity.x2,
                            y2: worldPos.y - hit.entity.y2
                        };
                    } else if (hit.type === 'label') {
                        this.dragOffset = {
                            x: worldPos.x - hit.entity.x,
                            y: worldPos.y - hit.entity.y
                        };
                    }
                }
                this.render();
                return;
            }
        }

        if (tool === 'ruler') {
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
                this.isRotatingNewCamera = true;
                this.rotatingCamera = newCam;
                window.app.ui.onEntitySelected(this.selectedEntity);
            }
        } else if (tool === 'wall') {
            this.isPanning = false; // never pan while placing wall points
            const sx = this.snap(worldPos.x);
            const sy = this.snap(worldPos.y);

            // Helper: find closest existing wall point within snap radius (endpoints or bodies)
            const snapRadius = 20 / this.zoom;
            const findSnapPoint = (px, py) => {
                // Check endpoints first
                for (const w of this.project.walls) {
                    if (Math.sqrt((w.x1 - px) ** 2 + (w.y1 - py) ** 2) < snapRadius) return { x: w.x1, y: w.y1 };
                    if (Math.sqrt((w.x2 - px) ** 2 + (w.y2 - py) ** 2) < snapRadius) return { x: w.x2, y: w.y2 };
                }
                // Check wall bodies
                for (const w of this.project.walls) {
                    const dx = w.x2 - w.x1;
                    const dy = w.y2 - w.y1;
                    const len2 = dx * dx + dy * dy;
                    if (len2 === 0) continue;
                    const t = Math.max(0, Math.min(1, ((px - w.x1) * dx + (py - w.y1) * dy) / len2));
                    const projX = w.x1 + t * dx;
                    const projY = w.y1 + t * dy;
                    if (Math.sqrt((projX - px) ** 2 + (projY - py) ** 2) < snapRadius) {
                        return { x: projX, y: projY };
                    }
                }
                return null;
            };

            if (!this.isDrawingWall) {
                // Snap start point to existing endpoint if close
                const snapped = findSnapPoint(sx, sy);
                this.isDrawingWall = true;
                this.wallStart = snapped ?? { x: sx, y: sy };
            } else {
                // Snap end point
                const snapped = findSnapPoint(sx, sy);
                let endPt = snapped ?? { x: sx, y: sy };
                
                // ORTHO SNAP (only if not snapped to an existing point)
                if (!snapped) {
                    const dx = endPt.x - this.wallStart.x;
                    const dy = endPt.y - this.wallStart.y;
                    if (Math.abs(dx) < Math.abs(dy) * 0.1) endPt.x = this.wallStart.x;
                    if (Math.abs(dy) < Math.abs(dx) * 0.1) endPt.y = this.wallStart.y;
                }

                // Only add if it's an actual line (not a 0-length click)
                if (this.wallStart.x !== endPt.x || this.wallStart.y !== endPt.y) {
                    const newWall = new Wall(this.wallStart.x, this.wallStart.y, endPt.x, endPt.y);
                    this.project.addWall(newWall);
                }

                // Auto-finalize: if the line snapped to ANY existing wall point, end the drawing
                if (snapped) {
                    this.isDrawingWall = false;
                    this.wallStart = null;
                    this.alignmentGuides = [];
                } else {
                    // Didn't snap — keep chaining the wall
                    this.wallStart = endPt;
                }
            }
        } else if (tool === 'text') {
            const newLabel = new TextLabel({
                x: worldPos.x,
                y: worldPos.y,
                text: 'Nova Anotação'
            });
            this.project.addLabel(newLabel);
            this.selectedEntity = { type: 'label', index: this.project.labels.length - 1, entity: newLabel };
            window.app.ui.onEntitySelected(this.selectedEntity);
        } else if (tool === 'door' || tool === 'window') {
            if (this.previewElement) {
                this.project.saveState();
                this.previewElement.wall.elements.push({
                    type: tool,
                    t: this.previewElement.t,
                    width: this.previewElement.width
                });
                this.project.notifyChange();
                
                // Select the newly added element
                const newIdx = this.previewElement.wall.elements.length - 1;
                this.selectedEntity = {
                    type: 'wall-element',
                    wall: this.previewElement.wall,
                    elementIndex: newIdx,
                    entity: this.previewElement.wall.elements[newIdx]
                };
                window.app.ui.onEntitySelected(this.selectedEntity);
                
                // Reset tool back to select
                window.app.ui.setTool('select');
                this.previewElement = null;
            }
        } else if (tool === 'erase') {
            const hit = this.getEntityAt(worldPos.x, worldPos.y);
            if (hit) {
                if (hit.type === 'camera') this.project.removeCamera(hit.index);
                else if (hit.type === 'wall') this.project.removeWall(hit.index);
                else if (hit.type === 'label') this.project.removeLabel(hit.index);
                this.selectedEntity = null;
                window.app.ui.onEntitySelected(null);
            }
        } else {
            // Default action: Pan
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }

        this.render();
    }

    onPointerMove(e) {
        // Update pointer map only when actually touching/pressing (not hovering)
        if (e.buttons > 0) {
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
        }

        const rect = this.mainCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldPos = this.c2w(mx, my);

        // Update status coordinates
        document.getElementById('status-pos').textContent = 
            `${Math.round(worldPos.x / SCALE)}m, ${Math.round(worldPos.y / SCALE)}m`;

        if (this.pointers.size === 2) {
            const points = Array.from(this.pointers.values());
            // Only process pinch if all pointers are touch (never S-Pen)
            if (!points.every(p => p.type === 'touch')) return;
            const dist = Math.sqrt((points[0].x - points[1].x)**2 + (points[0].y - points[1].y)**2);

            // Pinch-to-zoom: ratio relative to gesture start, applied to base zoom
            const ratio = dist / this.pinchDist;
            const newZoom = Math.min(Math.max(this.pinchBaseZoom * ratio, 0.1), 20);

            // Zoom toward pinch midpoint
            const midX = (points[0].x + points[1].x) / 2;
            const midY = (points[0].y + points[1].y) / 2;
            const rect = this.mainCanvas.getBoundingClientRect();
            const cmx = midX - rect.left;
            const cmy = midY - rect.top;
            const worldAtMid = this.c2w(cmx, cmy);

            this.zoom = newZoom;
            this.offsetX = cmx - worldAtMid.x * this.zoom;
            this.offsetY = cmy - worldAtMid.y * this.zoom;

            document.getElementById('hdr-zoom').textContent = `${Math.round(this.zoom * 100)}%`;

            // Pan: track midpoint movement
            if (this.lastMidX != null) {
                this.offsetX += midX - this.lastMidX;
                this.offsetY += midY - this.lastMidY;
            }
            this.lastMidX = midX;
            this.lastMidY = midY;

            document.getElementById('hdr-zoom').textContent = `${Math.round(this.zoom * 100)}%`;
            this.drawGrid();
            this.render();
            return;
        }

        if (this.isPanning && !this.isDrawingWall && e.buttons > 0) {
            this.offsetX += e.clientX - this.lastMouseX;
            this.offsetY += e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.drawGrid();
            this.render();
            return;
        }

        if (this.isDragging && this.selectedEntity) {
            if (this.selectedEntity.type === 'camera') {
                const targetX = worldPos.x - this.dragOffset.x;
                const targetY = worldPos.y - this.dragOffset.y;
                this.selectedEntity.entity.x = this.snap(targetX);
                this.selectedEntity.entity.y = this.snap(targetY);
            } else if (this.selectedEntity.type === 'wall-endpoint') {
                // Move only the clicked endpoint (p1 or p2)
                const w = this.selectedEntity.entity;
                if (this.dragOffset.which === 'p1') {
                    w.x1 = this.snap(worldPos.x);
                    w.y1 = this.snap(worldPos.y);
                } else {
                    w.x2 = this.snap(worldPos.x);
                    w.y2 = this.snap(worldPos.y);
                }
            } else if (this.selectedEntity.type === 'wall') {
                const w = this.selectedEntity.entity;
                w.x1 = this.snap(worldPos.x - this.dragOffset.x1);
                w.y1 = this.snap(worldPos.y - this.dragOffset.y1);
                w.x2 = this.snap(worldPos.x - this.dragOffset.x2);
                w.y2 = this.snap(worldPos.y - this.dragOffset.y2);
            } else if (this.selectedEntity.type === 'label') {
                this.selectedEntity.entity.x = worldPos.x - this.dragOffset.x;
                this.selectedEntity.entity.y = worldPos.y - this.dragOffset.y;
            }
            this.render();
            return;
        }

        // Hover handling
        const hit = this.getEntityAt(worldPos.x, worldPos.y);
        if (hit !== this.hoveredEntity) {
            this.hoveredEntity = hit;
            this.render();
        }

        const tool = window.app.ui.currentTool;

        if (tool === 'door' || tool === 'window') {
            if (hit && hit.type === 'wall') {
                const w = hit.entity;
                const dx = w.x2 - w.x1;
                const dy = w.y2 - w.y1;
                const len2 = dx*dx + dy*dy;
                // Avoid division by zero
                if (len2 > 0) {
                    let t = ((worldPos.x - w.x1)*dx + (worldPos.y - w.y1)*dy) / len2;
                    t = Math.max(0, Math.min(1, t));
                    if (Math.abs(t - 0.5) < 0.05) t = 0.5; // Snap to center
                    
                    this.previewElement = { type: tool, wall: w, t, width: 0.9 };
                }
            } else {
                this.previewElement = null;
            }
        }

        if (this.isMeasuring) {
            this.measureEnd = { x: worldPos.x, y: worldPos.y };
            this.render();
            return;
        }

        if (this.isRotatingNewCamera && this.rotatingCamera) {
            const dx = worldPos.x - this.rotatingCamera.x;
            const dy = worldPos.y - this.rotatingCamera.y;
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;

            // Snap to 0, 90, 180, 270 if within 10 degrees
            const snapThreshold = 10;
            for (const snap of [0, 90, 180, 270, 360]) {
                if (Math.abs(angle - snap) < snapThreshold) {
                    angle = snap === 360 ? 0 : snap;
                    break;
                }
            }

            this.rotatingCamera.rotation = Math.round(angle);
            this.render();
            
            // Update inspector if open without full re-render
            if (this.selectedEntity?.entity === this.rotatingCamera) {
                const rotInput = document.querySelector('input[data-prop="rotation"]');
                if (rotInput) {
                    rotInput.value = this.rotatingCamera.rotation;
                    const valSpan = rotInput.previousElementSibling?.querySelector('.val');
                    if (valSpan) valSpan.textContent = `${this.rotatingCamera.rotation}°`;
                }
            }
            return;
        }

        if (this.isDrawingWall) {
            const sx = this.snap(worldPos.x);
            const sy = this.snap(worldPos.y);
            this.mouseWorldPos = { x: sx, y: sy };
            
            // Apply ortho snap to preview if not close to another snap point
            const dx = this.mouseWorldPos.x - this.wallStart.x;
            const dy = this.mouseWorldPos.y - this.wallStart.y;
            if (Math.abs(dx) < Math.abs(dy) * 0.1) this.mouseWorldPos.x = this.wallStart.x;
            if (Math.abs(dy) < Math.abs(dx) * 0.1) this.mouseWorldPos.y = this.wallStart.y;
            
            // Alignment guides
            this.alignmentGuides = [];
            const threshold = 10; // Pixels distance to snap
            
            this.project.walls.forEach(w => {
                const points = [{x: w.x1, y: w.y1}, {x: w.x2, y: w.y2}];
                points.forEach(p => {
                    if (Math.abs(sx - p.x) < threshold / this.zoom) {
                        this.alignmentGuides.push({ type: 'v', x: p.x });
                        this.mouseWorldPos.x = p.x;
                    }
                    if (Math.abs(sy - p.y) < threshold / this.zoom) {
                        this.alignmentGuides.push({ type: 'h', y: p.y });
                        this.mouseWorldPos.y = p.y;
                    }
                });
            });

            this.render();
            return;
        }
    }

    onPointerUp(e) {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) {
            this.lastMidX = null;
            this.lastMidY = null;
        }
        if (this.pointers.size === 1) {
            // Update the last mouse coordinates for the remaining pointer to prevent panning jumps
            const remaining = Array.from(this.pointers.values())[0];
            this.lastMouseX = remaining.x;
            this.lastMouseY = remaining.y;
        }
        if (this.pointers.size === 0) {
            this.isPanning = false;
            this.isDragging = false;
            this.isRotatingNewCamera = false;
            this.rotatingCamera = null;
        }
        this.render();
    }

    onWheel(e) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.93;
        const newZoom = Math.min(Math.max(0.1, this.zoom * factor), 20);
        
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
        const dpr = window.devicePixelRatio || 1;
        const w = this.bgCanvas.width / dpr;
        const h = this.bgCanvas.height / dpr;
        ctx.clearRect(0, 0, w, h);
        
        const isLightTheme = document.body.classList.contains('light-theme');
        const gridColor = isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)';
        const majorColor = isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)';

        const baseGridPx = 10 * this.zoom; // 1m in screen pixels

        let gridStep, majorStep;
        if (this.zoom > 2) {
            // Very zoomed in: minor grid every 10cm, major every 1m
            gridStep = baseGridPx / 10;
            majorStep = baseGridPx;
        } else if (this.zoom > 0.5) {
            // Normal zoom: minor grid every 1m, major every 5m
            gridStep = baseGridPx;
            majorStep = baseGridPx * 5;
        } else {
            // Zoomed out: minor grid every 5m, major every 25m
            gridStep = baseGridPx * 5;
            majorStep = baseGridPx * 25;
        }

        const startX = ((this.offsetX % gridStep) + gridStep) % gridStep;
        const startY = ((this.offsetY % gridStep) + gridStep) % gridStep;
        
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        for (let x = startX; x < w; x += gridStep) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = startY; y < h; y += gridStep) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Major grid
        const mStartX = ((this.offsetX % majorStep) + majorStep) % majorStep;
        const mStartY = ((this.offsetY % majorStep) + majorStep) % majorStep;
        
        ctx.strokeStyle = majorColor;
        ctx.beginPath();
        for (let x = mStartX; x < w; x += majorStep) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let y = mStartY; y < h; y += majorStep) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Workspace boundaries
        if (this.project?.settings) {
            const sw = this.project.settings.widthMeters * 10 * this.zoom;
            const sh = this.project.settings.heightMeters * 10 * this.zoom;
            
            ctx.strokeStyle = isLightTheme ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)';
            ctx.setLineDash([10, 5]);
            ctx.lineWidth = 2;
            ctx.strokeRect(this.offsetX, this.offsetY, sw, sh);
            ctx.setLineDash([]);
        }
    }

    render() {
        if (!this.project) return;
        
        const ctx = this.ctx;
        // Use styled size for clearing because of ctx.scale
        ctx.clearRect(0, 0, this.mainCanvas.width / (window.devicePixelRatio || 1), this.mainCanvas.height / (window.devicePixelRatio || 1));
        
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoom, this.zoom);

        // Draw alignment guides
        if (this.alignmentGuides && this.alignmentGuides.length > 0) {
            ctx.save();
            ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / this.zoom;
            this.alignmentGuides.forEach(g => {
                ctx.beginPath();
                if (g.type === 'v') {
                    ctx.moveTo(g.x, -5000); ctx.lineTo(g.x, 5000);
                } else {
                    ctx.moveTo(-5000, g.y); ctx.lineTo(5000, g.y);
                }
                ctx.stroke();
            });
            ctx.restore();
        }
        
        // Render walls
        this.project.walls.forEach((w, i) => {
            const isSelected = (
                (this.selectedEntity?.type === 'wall' && this.selectedEntity.index === i) ||
                (this.selectedEntity?.type === 'wall-endpoint' && this.selectedEntity.index === i)
            );
            
            if (this.previewElement && this.previewElement.wall === w) {
                w.elements.push(this.previewElement);
                w.draw(ctx, this.zoom, isSelected);
                w.elements.pop();
            } else {
                w.draw(ctx, this.zoom, isSelected);
            }
        });

        // Current wall preview
        const tool = window.app.ui?.currentTool;
        if (tool === 'wall' && this.isDrawingWall && this.wallStart && this.mouseWorldPos) {
            const dx = this.mouseWorldPos.x - this.wallStart.x;
            const dy = this.mouseWorldPos.y - this.wallStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const meters = (dist / SCALE).toFixed(2);
            const angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);

            ctx.beginPath();
            ctx.moveTo(this.wallStart.x, this.wallStart.y);
            ctx.lineTo(this.mouseWorldPos.x, this.mouseWorldPos.y);
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
            ctx.lineWidth = 10 / this.zoom;
            ctx.lineCap = 'round';
            ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Metrics Label
            const midX = (this.wallStart.x + this.mouseWorldPos.x) / 2;
            const midY = (this.wallStart.y + this.mouseWorldPos.y) / 2;
            ctx.font = `600 ${12 / this.zoom}px "JetBrains Mono", monospace`;
            ctx.fillStyle = '#e2e8f0';
            ctx.textAlign = 'center';
            ctx.fillText(`${meters}m / ${angle}°`, midX, midY - 15 / this.zoom);
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
            cam.drawFOV(ctx, this.zoom, isSelected, this.project.walls);
        });

        // Render cameras
        this.project.cameras.forEach((cam, i) => {
            const isSelected = this.selectedEntity?.type === 'camera' && this.selectedEntity.index === i;
            const isHovered = this.hoveredEntity?.type === 'camera' && this.hoveredEntity.index === i;
            cam.draw(ctx, this.zoom, isSelected, isHovered);
        });

        // Render labels
        this.project.labels.forEach((l, i) => {
            const isSelected = this.selectedEntity?.type === 'label' && this.selectedEntity.index === i;
            const isHovered = this.hoveredEntity?.type === 'label' && this.hoveredEntity.index === i;
            l.draw(ctx, this.zoom, isSelected, isHovered);
        });
        
        ctx.restore();
    }
}

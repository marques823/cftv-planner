const SCALE = 10; // 10px = 1m

export class Camera {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.modelId = config.modelId;
        this.brand = config.brand;
        this.modelName = config.name;
        this.x = config.x;
        this.y = config.y;
        this.name = config.displayName || config.name;
        this.rotation = config.rotation || 0;
        this.fov = config.fov;
        this.range = config.range;
        this.color = config.color || '0,229,255';
        this.notes = config.notes || '';
    }

    draw(ctx, zoom, isSelected, isHovered) {
        const r = 10 / zoom;
        const c = this.color;
        
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw selection glow
        if (isSelected || isHovered) {
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
            g.addColorStop(0, `rgba(${c},.4)`);
            g.addColorStop(1, `rgba(${c},0)`);
            ctx.beginPath();
            ctx.arc(0, 0, r * 3, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
        }

        // Drop shadow for premium feel
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10 / zoom;
        ctx.shadowOffsetY = 4 / zoom;

        // Base circle
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? `rgb(${c})` : `rgba(${c},.85)`;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.strokeStyle = 'rgba(0,0,0,.8)';
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();

        // Lens indicator
        ctx.beginPath();
        ctx.arc(0, 0, r * .35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fill();

        // Direction indicator
        const rotRad = (this.rotation * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rotRad) * r, Math.sin(rotRad) * r);
        ctx.lineTo(Math.cos(rotRad) * (r + 6 / zoom), Math.sin(rotRad) * (r + 6 / zoom));
        ctx.strokeStyle = `rgb(${c})`;
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        // Label
        ctx.font = `600 ${10 / zoom}px "Inter", sans-serif`;
        ctx.fillStyle = isSelected ? '#fff' : '#c8d8e8';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 0, r + 15 / zoom);
        
        ctx.restore();
    }

    drawFOV(ctx, zoom, isSelected, walls = []) {
        const rotRad = (this.rotation * Math.PI) / 180;
        const fovRad = (this.fov * Math.PI) / 180;
        const hf = fovRad / 2;
        const rangePx = this.range * SCALE;
        const c = this.color;

        const rays = 40; // Accuracy vs Performance
        const step = fovRad / rays;
        const points = [];

        for (let i = 0; i <= rays; i++) {
            const angle = (rotRad - hf) + (step * i);
            const targetX = this.x + Math.cos(angle) * rangePx;
            const targetY = this.y + Math.sin(angle) * rangePx;

            let closestDist = 1;
            let hitPoint = { x: targetX, y: targetY };

            // Ray-Wall Intersection
            walls.forEach(w => {
                const intersect = this.getIntersection(
                    { x: this.x, y: this.y },
                    { x: targetX, y: targetY },
                    { x: w.x1, y: w.y1 },
                    { x: w.x2, y: w.y2 }
                );
                if (intersect && intersect.dist < closestDist) {
                    closestDist = intersect.dist;
                    hitPoint = { x: intersect.x, y: intersect.y };
                }
            });
            points.push(hitPoint);
        }

        ctx.save();
        
        // Draw Main Occluded FOV
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        
        ctx.fillStyle = `rgba(${c}, 0.1)`;
        ctx.fill();

        ctx.strokeStyle = `rgba(${c}, ${isSelected ? 0.6 : 0.3})`;
        ctx.lineWidth = (isSelected ? 1.5 : 1) / zoom;
        ctx.stroke();

        // Distance markers (simplified occlusion)
        if (isSelected) {
            for (let r = 0.25; r < 1.0; r += 0.25) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                points.forEach(p => {
                    const rx = this.x + (p.x - this.x) * r;
                    const ry = this.y + (p.y - this.y) * r;
                    ctx.lineTo(rx, ry);
                });
                ctx.strokeStyle = `rgba(${c}, 0.05)`;
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    getIntersection(p1, p2, p3, p4) {
        const den = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (den === 0) return null;
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / den;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / den;
        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return {
                x: p1.x + ua * (p2.x - p1.x),
                y: p1.y + ua * (p2.y - p1.y),
                dist: ua
            };
        }
        return null;
    }
}

export class Wall {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    draw(ctx, zoom) {
        // Outer wall (shadow/thickness)
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 10 / zoom;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner wall (highlight)
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2 / zoom;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

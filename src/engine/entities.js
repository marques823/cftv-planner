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

    drawFOV(ctx, zoom, isSelected) {
        const rotRad = (this.rotation * Math.PI) / 180;
        const fovRad = (this.fov * Math.PI) / 180;
        const hf = fovRad / 2;
        const rangePx = this.range * SCALE;
        const c = this.color;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Main cone
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, rangePx, rotRad - hf, rotRad + hf);
        ctx.closePath();
        ctx.fillStyle = `rgba(${c}, 0.08)`;
        ctx.fill();

        ctx.strokeStyle = `rgba(${c}, ${isSelected ? 0.6 : 0.3})`;
        ctx.lineWidth = (isSelected ? 1.5 : 1) / zoom;
        ctx.stroke();

        // Distance markers
        for (let r = 0.25; r <= 1.0; r += 0.25) {
            ctx.beginPath();
            ctx.arc(0, 0, rangePx * r, rotRad - hf, rotRad + hf);
            ctx.strokeStyle = `rgba(${c}, 0.05)`;
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();
        }

        // Limit lines (dashed)
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rotRad - hf) * rangePx, Math.sin(rotRad - hf) * rangePx);
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rotRad + hf) * rangePx, Math.sin(rotRad + hf) * rangePx);
        ctx.strokeStyle = `rgba(${c}, 0.3)`;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
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

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

            // Ray-Obstacle Intersection (Circles)
            const obs = arguments[4] || []; // Optional obstacles array
            const drawings = arguments[5] || []; // Optional drawings array
            obs.forEach(o => {
                if (!o.isObstacle) return;
                const intersect = this.getCircleIntersection(
                    { x: this.x, y: this.y },
                    { x: targetX, y: targetY },
                    { x: o.x, y: o.y, r: (o.radius || 0.5) * SCALE }
                );
                if (intersect && intersect.dist < closestDist) {
                    closestDist = intersect.dist;
                    hitPoint = { x: intersect.x, y: intersect.y };
                }
            });

            // Ray-Drawing Intersection (Segments)
            drawings.forEach(d => {
                if (d.isObstacle && d.points.length >= 2) {
                    for (let j = 0; j < d.points.length - 1; j++) {
                        const intersect = this.getIntersection(
                            { x: this.x, y: this.y },
                            { x: targetX, y: targetY },
                            d.points[j],
                            d.points[j+1]
                        );
                        if (intersect && intersect.dist < closestDist) {
                            closestDist = intersect.dist;
                            hitPoint = { x: intersect.x, y: intersect.y };
                        }
                    }
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
        
        // Use a small epsilon (0.01) to avoid self-intersection when camera is exactly on wall
        if (ua > 0.01 && ua <= 1 && ub >= 0 && ub <= 1) {
            return {
                x: p1.x + ua * (p2.x - p1.x),
                y: p1.y + ua * (p2.y - p1.y),
                dist: ua
            };
        }
        return null;
    }

    getCircleIntersection(p1, p2, circle) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const fx = p1.x - circle.x;
        const fy = p1.y - circle.y;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - circle.r * circle.r;

        let discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return null;

        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);

        if (t1 >= 0 && t1 <= 1) {
            return {
                x: p1.x + t1 * dx,
                y: p1.y + t1 * dy,
                dist: t1
            };
        }
        // If the ray starts inside the circle, we might want the exit point t2
        if (t2 >= 0 && t2 <= 1) {
             return {
                x: p1.x + t2 * dx,
                y: p1.y + t2 * dy,
                dist: t2
            };
        }

        return null;
    }
}

export class Wall {
    constructor(x1, y1, x2, y2, color = '#1e293b', showMeasurements = false, elements = []) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.color = color;
        this.showMeasurements = showMeasurements;
        this.elements = elements || [];
    }

    draw(ctx, zoom, isSelected) {
        // Build inner highlight color from base color if custom
        const isCustom = this.color !== '#1e293b';
        const innerColor = isCustom ? this.color : '#475569';
        const shadowColor = isSelected ? '#3b82f6' : this.color;

        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const len = Math.sqrt(dx * dx + dy * dy);

        // Sort elements by 't'
        const elems = [...this.elements].sort((a,b) => a.t - b.t);

        // Calculate segment t ranges to leave holes for doors and windows
        const segments = [];
        let curT = 0;
        for (const el of elems) {
            const elHalfT = ((el.width * 10) / 2) / len;
            const tStart = Math.max(curT, el.t - elHalfT);
            if (tStart > curT) {
                segments.push([curT, tStart]);
            }
            curT = Math.min(1, el.t + elHalfT);
        }
        if (curT < 1) segments.push([curT, 1]);

        // Draw outer wall segments (shadow/thickness)
        ctx.beginPath();
        for (const [t1, t2] of segments) {
            ctx.moveTo(this.x1 + t1 * dx, this.y1 + t1 * dy);
            ctx.lineTo(this.x1 + t2 * dx, this.y1 + t2 * dy);
        }
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = 10 / zoom;
        ctx.lineCap = 'butt'; // 'butt' is better for seamless segments than 'round' when split
        ctx.stroke();

        // Draw inner wall segments (highlight)
        ctx.beginPath();
        for (const [t1, t2] of segments) {
            ctx.moveTo(this.x1 + t1 * dx, this.y1 + t1 * dy);
            ctx.lineTo(this.x1 + t2 * dx, this.y1 + t2 * dy);
        }
        ctx.strokeStyle = isSelected ? '#60a5fa' : innerColor;
        ctx.lineWidth = 2 / zoom;
        ctx.lineCap = 'butt';
        ctx.stroke();

        // Draw doors and windows
        for (const el of elems) {
            const px = this.x1 + el.t * dx;
            const py = this.y1 + el.t * dy;
            let angle = Math.atan2(dy, dx);
            
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            
            const w = el.width * 10;
            
            if (el.type === 'door') {
                // Jambs
                ctx.beginPath();
                ctx.moveTo(-w/2, -5/zoom); ctx.lineTo(-w/2, 5/zoom);
                ctx.moveTo(w/2, -5/zoom); ctx.lineTo(w/2, 5/zoom);
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2/zoom;
                ctx.stroke();
                
                const dir = el.inverted ? 1 : -1;
                const hingeX = el.mirrored ? w/2 : -w/2;
                
                // Door Leaf
                ctx.beginPath();
                ctx.moveTo(hingeX, 0);
                ctx.lineTo(hingeX, w * dir);
                ctx.strokeStyle = '#3b82f6';
                ctx.stroke();
                
                // Swing Arc
                ctx.beginPath();
                let startAngle, endAngle;
                if (!el.mirrored) {
                    startAngle = el.inverted ? 0 : -Math.PI/2;
                    endAngle = el.inverted ? Math.PI/2 : 0;
                } else {
                    startAngle = el.inverted ? Math.PI/2 : Math.PI;
                    endAngle = el.inverted ? Math.PI : 1.5 * Math.PI;
                }
                ctx.arc(hingeX, 0, w, startAngle, endAngle);
                ctx.strokeStyle = '#94a3b8';
                ctx.setLineDash([4/zoom, 4/zoom]);
                ctx.lineWidth = 1.5/zoom;
                ctx.stroke();
                
            } else if (el.type === 'window') {
                // Jambs
                ctx.beginPath();
                ctx.moveTo(-w/2, -5/zoom); ctx.lineTo(-w/2, 5/zoom);
                ctx.moveTo(w/2, -5/zoom); ctx.lineTo(w/2, 5/zoom);
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2/zoom;
                ctx.stroke();
                
                // Glass panes (two parallel lines inside the thickness)
                ctx.beginPath();
                ctx.moveTo(-w/2, -2/zoom); ctx.lineTo(w/2, -2/zoom);
                ctx.moveTo(-w/2, 2/zoom); ctx.lineTo(w/2, 2/zoom);
                ctx.strokeStyle = '#a5f3fc';
                ctx.lineWidth = 1.5/zoom;
                ctx.stroke();
                
                // Fill faint blue
                ctx.fillStyle = 'rgba(165, 243, 252, 0.2)';
                ctx.fillRect(-w/2, -3/zoom, w, 6/zoom);
            }
            
            ctx.restore();
        }

        // Endpoint handles — visible so user knows they can drag them
        if (isSelected) {
            const r = 7 / zoom;
            [{ x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 }].forEach(pt => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fillStyle = '#0f172a';
                ctx.fill();
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2 / zoom;
                ctx.stroke();
            });
        }

        // Handle measurements text
        if (this.showMeasurements) {
            const dx = this.x2 - this.x1;
            const dy = this.y2 - this.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const midX = (this.x1 + this.x2) / 2;
            const midY = (this.y1 + this.y2) / 2;
            
            ctx.save();
            ctx.translate(midX, midY);
            let angle = Math.atan2(dy, dx);
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                angle += Math.PI;
            }
            ctx.rotate(angle);
            
            const text = `${len.toFixed(2)}m`;
            const fontSize = 12 / zoom;
            ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
            const txtWidth = ctx.measureText(text).width;
            
            // Background pill for text
            ctx.fillStyle = this.color === '#1e293b' ? '#0f172a' : this.color;
            ctx.beginPath();
            ctx.roundRect(-txtWidth / 2 - 4/zoom, -fontSize - 4/zoom, txtWidth + 8/zoom, fontSize + 8/zoom, 4/zoom);
            ctx.fill();
            
            // Text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 0, -fontSize / 2);
            ctx.restore();
        }
    }

    updateLength(newLength) {
        const dx = this.x2 - this.x1;
        const dy = this.y2 - this.y1;
        const currentLenPx = Math.sqrt(dx * dx + dy * dy);
        if (currentLenPx === 0) return;

        const newLenPx = newLength * 10; // 10px = 1m
        const ratio = newLenPx / currentLenPx;

        this.x2 = this.x1 + dx * ratio;
        this.y2 = this.y1 + dy * ratio;
    }
}

export class TextLabel {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.x = config.x;
        this.y = config.y;
        this.text = config.text || 'Texto';
        this.fontSize = config.fontSize || 16;
        this.color = config.color || '255,255,255';
    }

    draw(ctx, zoom, isSelected, isHovered) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.font = `600 ${this.fontSize / zoom}px "Inter", sans-serif`;
        ctx.fillStyle = `rgb(${this.color})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isSelected || isHovered) {
            ctx.fillStyle = isSelected ? '#3b82f6' : '#60a5fa';
        }

        ctx.fillText(this.text, 0, 0);

        if (isSelected) {
            const metrics = ctx.measureText(this.text);
            const w = metrics.width + 10 / zoom;
            const h = (this.fontSize / zoom) + 10 / zoom;
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([5 / zoom, 5 / zoom]);
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        }

        ctx.restore();
    }
}

export class Obstacle {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.x = config.x;
        this.y = config.y;
        this.type = config.type || 'tree'; // tree, post, bush, box, text
        this.radius = config.radius || 1; // in meters (radius or half-width)
        this.isObstacle = config.isObstacle !== undefined ? config.isObstacle : true;
        this.color = config.color || (this.type === 'tree' ? '34,197,94' : '148,163,184');
        this.text = config.text || '';
    }

    draw(ctx, zoom, isSelected, isHovered) {
        const r = (this.radius * SCALE);
        const c = this.color;
        
        ctx.save();
        ctx.translate(this.x, this.y);

        if (isSelected || isHovered) {
            ctx.shadowColor = `rgba(${c}, 0.5)`;
            ctx.shadowBlur = 15 / zoom;
        }

        if (this.type === 'tree' || this.type === 'bush' || this.type === 'post') {
            // Circle based drawing
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${c}, ${this.isObstacle ? 0.6 : 0.3})`;
            ctx.fill();
            ctx.strokeStyle = `rgb(${c})`;
            ctx.lineWidth = 2 / zoom;
            ctx.stroke();

            // Decorative inner circles for trees/bushes
            if (this.type === 'tree' || this.type === 'bush') {
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
                ctx.stroke();
            } else if (this.type === 'post') {
                // Post has a small dot in center
                ctx.beginPath();
                ctx.arc(0, 0, 2 / zoom, 0, Math.PI * 2);
                ctx.fillStyle = '#000';
                ctx.fill();
            }
        } else if (this.type === 'box') {
            // Rectangle based
            ctx.fillStyle = `rgba(${c}, ${this.isObstacle ? 0.6 : 0.3})`;
            ctx.fillRect(-r, -r, r * 2, r * 2);
            ctx.strokeStyle = `rgb(${c})`;
            ctx.lineWidth = 2 / zoom;
            ctx.strokeRect(-r, -r, r * 2, r * 2);
        }

        // Label/Text
        if (this.text) {
            ctx.font = `500 ${10 / zoom}px "Inter", sans-serif`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, 0, r + 12 / zoom);
        }

        if (isSelected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([5 / zoom, 5 / zoom]);
            const dashR = r + 5 / zoom;
            if (this.type === 'box') {
                ctx.strokeRect(-dashR, -dashR, dashR * 2, dashR * 2);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, dashR, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

export class FreeDraw {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.points = config.points || []; // Array of {x, y}
        this.color = config.color || '255,255,255';
        this.lineWidth = config.lineWidth || 2;
        this.isObstacle = config.isObstacle || false;
    }

    draw(ctx, zoom, isSelected, isHovered) {
        if (this.points.length < 2) return;

        ctx.save();
        
        ctx.strokeStyle = `rgb(${this.color})`;
        ctx.lineWidth = this.lineWidth / zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();

        if (isSelected || isHovered) {
            ctx.strokeStyle = isSelected ? '#3b82f6' : '#60a5fa';
            ctx.lineWidth = (this.lineWidth + 4) / zoom;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    }

    move(dx, dy) {
        this.points = this.points.map(p => ({
            x: p.x + dx,
            y: p.y + dy
        }));
    }
}

export class Cable extends FreeDraw {
    constructor(config) {
        super(config);
        this.type = 'cable';
        this.cableType = config.cableType || 'UTP Cat5e'; // Default
        this.cameraRef = config.cameraRef || null; // Potential binding to a camera
    }

    getLength() {
        if (this.points.length < 2) return 0;
        let total = 0;
        for (let i = 1; i < this.points.length; i++) {
            const dx = this.points[i].x - this.points[i-1].x;
            const dy = this.points[i].y - this.points[i-1].y;
            total += Math.sqrt(dx * dx + dy * dy);
        }
        return total / 10; // Assuming 10px = 1m (SCALE from canvas.js)
    }

    draw(ctx, zoom, isSelected, isHovered) {
        ctx.save();
        ctx.setLineDash([10 / zoom, 5 / zoom]); // Dashed line for cables
        super.draw(ctx, zoom, isSelected, isHovered);
        ctx.restore();

        // If selected, show length
        if (isSelected && this.points.length >= 2) {
            const mid = this.points[Math.floor(this.points.length / 2)];
            ctx.font = `600 ${12 / zoom}px "Inter", sans-serif`;
            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.getLength().toFixed(1)}m`, mid.x, mid.y - 10 / zoom);
        }
    }
}

export class Rack extends Obstacle {
    constructor(config) {
        super({
            ...config,
            type: 'box',
            r: config.r || 15 // Standard size for rack icon
        });
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.isRack = true;
        this.uSize = config.uSize || 12; // 12U standard
        this.color = config.color || '100,100,100';
        this.text = config.text || `${this.uSize}U Rack`;
    }

    draw(ctx, zoom, isSelected, isHovered) {
        super.draw(ctx, zoom, isSelected, isHovered);
        
        const r = this.r;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw some rack-like details (horizontal lines)
        ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`;
        ctx.lineWidth = 1 / zoom;
        for(let i = -r + 5; i < r; i += 5) {
            ctx.beginPath();
            ctx.moveTo(-r + 2, i);
            ctx.lineTo(r - 2, i);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

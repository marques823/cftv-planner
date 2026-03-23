import { CanvasEngine } from './engine/canvas.js';
import { ProjectManager } from './services/project.js';
import { UIManager } from './ui/manager.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('CFTV Planner Pro Initializing...');
    
    // Initialize Core Modules
    const canvasArea = document.getElementById('canvas-area');
    const engine = new CanvasEngine('main-canvas', 'bg-canvas');
    const projects = new ProjectManager();
    const ui = new UIManager(engine, projects);

    engine.setProject(projects);
    ui.init();
    engine.init();

    // Export to window for debugging or legacy support if needed
    window.app = { engine, projects, ui };
});

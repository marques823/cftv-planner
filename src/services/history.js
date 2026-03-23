export class HistoryManager {
    constructor(maxSize = 30) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
    }

    push(state) {
        // Only push if state is different from last
        const lastState = this.undoStack[this.undoStack.length - 1];
        if (lastState && JSON.stringify(lastState) === JSON.stringify(state)) return;

        this.undoStack.push(JSON.parse(JSON.stringify(state)));
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo on new action
    }

    undo(currentState) {
        if (this.undoStack.length === 0) return null;
        
        // Save current state to redo stack
        this.redoStack.push(JSON.parse(JSON.stringify(currentState)));
        return this.undoStack.pop();
    }

    redo(currentState) {
        if (this.redoStack.length === 0) return null;

        // Save current state to undo stack
        this.undoStack.push(JSON.parse(JSON.stringify(currentState)));
        return this.redoStack.pop();
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

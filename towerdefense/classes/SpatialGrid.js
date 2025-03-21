 
    class SpatialGrid {
        constructor(worldWidth, worldHeight, cellSize) {
            this.cellSize = cellSize;
            this.cols = Math.ceil(worldWidth / cellSize);
            this.rows = Math.ceil(worldHeight / cellSize);
            this.grid = new Array(this.cols * this.rows).fill().map(() => []);
            
            // Track which cell each entity is in
            this.entityCells = new Map(); // Map of entity -> cell index
        }
        
        getIndex(x, y) {
            // Clamp coordinates to world boundaries
            const clampedX = Math.max(0, Math.min(x, this.cols * this.cellSize - 1));
            const clampedY = Math.max(0, Math.min(y, this.rows * this.cellSize - 1));
            
            const col = Math.floor(clampedX / this.cellSize);
            const row = Math.floor(clampedY / this.cellSize);
            return row * this.cols + col;
        }

        insert(entity) {
            const newIndex = this.getIndex(entity.position.x, entity.position.y);
            const oldIndex = this.entityCells.get(entity);
            
            // If entity moved to a new cell
            if (oldIndex !== newIndex) {
                // Remove from old cell if it exists
                if (oldIndex !== undefined) {
                    const oldCell = this.grid[oldIndex];
                    const entityIndex = oldCell.indexOf(entity);
                    if (entityIndex !== -1) {
                        oldCell.splice(entityIndex, 1);
                    }
                }
                
                // Add to new cell
                if (newIndex >= 0 && newIndex < this.grid.length) {
                    this.grid[newIndex].push(entity);
                    this.entityCells.set(entity, newIndex);
                }
            }
        }
        
        remove(entity) {
            const index = this.entityCells.get(entity);
            if (index !== undefined) {
                const cell = this.grid[index];
                const entityIndex = cell.indexOf(entity);
                if (entityIndex !== -1) {
                    cell.splice(entityIndex, 1);
                }
                this.entityCells.delete(entity);
            }
        }
        
        getNearbyEntities(x, y, radius) {
            const nearby = [];
            const max = 3;
            // Get cells that could contain entities within radius
            const startCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
            const endCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
            const startRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
            const endRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
            
            // Collect potential candidates from relevant cells
            for (let row = startRow; row <= endRow && nearby.length < max; row++) {
                for (let col = startCol; col <= endCol && nearby.length < max; col++) {
                    const index = row * this.cols + col;
                    if (index >= 0 && index < this.grid.length) {
                        for( let i = 0; i < this.grid[index].length; i++){
                            let entity = this.grid[index][i];
                            if( nearby.length < max) {
                                nearby.push(entity);
                            } else {
                                break;
                            }
                        }
                    }
                }
            }
            
            return nearby;
        }
        
        clear() {
            this.grid = this.grid.map(() => []);
            this.entityCells.clear();
        }
        
        // Optional: Only clear but maintain all entity positions
        // Useful for when reusing the same grid across updates
        resetKeepingEntities() {
            const allEntities = [];
            this.entityCells.forEach((_, entity) => {
                allEntities.push(entity);
            });
            
            this.clear();
            
            allEntities.forEach(entity => {
                this.insert(entity);
            });
        }
    }

    export { SpatialGrid };
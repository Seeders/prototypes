class CoordinateTranslator {
    constructor(config) {
        this.tileWidth = config.GRID_SIZE;
        this.tileHeight = config.GRID_SIZE * 0.5;
        this.canvasWidth = config.CANVAS_WIDTH;
        this.canvasHeight = config.CANVAS_HEIGHT;
    }

    // Pixel (top-down) to Grid
    pixelToGrid(pixelX, pixelY) {
        return {
            x: pixelX / this.tileWidth,
            y: pixelY / this.tileWidth
        };
    }

    // Grid to Isometric (exactly matches drawMap)
    gridToIso(gridX, gridY) {
        const isoX = (gridX - gridY) * (this.tileWidth / 2) + this.canvasWidth / 2;
        const isoY = (gridX + gridY) * (this.tileHeight / 2);
        return { x: isoX, y: isoY };
    }

    // Pixel (top-down) to Isometric
    pixelToIso(pixelX, pixelY) {
        const grid = this.pixelToGrid(pixelX, pixelY);
        return this.gridToIso(grid.x, grid.y);
    }

    isoToGrid(isoX, isoY) {
        const adjustedX = isoX - this.canvasWidth / 2;
        const adjustedY = isoY;
        const gridX = (adjustedX / (this.tileWidth / 2) + adjustedY / (this.tileHeight / 2)) / 2;
        const gridY = (adjustedY / (this.tileHeight / 2) - adjustedX / (this.tileWidth / 2)) / 2;
        return { x: gridX, y: gridY };
    }

    isoToPixel(isoX, isoY) {
        const grid = this.isoToGrid(isoX, isoY);
        return {
            x: grid.x * this.tileWidth,
            y: grid.y * this.tileWidth// Double y to match top-down pixel space
        };
    }

    // Snap grid coordinates to nearest integer
    snapToGrid(gridX, gridY) {
        return { x: Math.floor(gridX), y: Math.floor(gridY) };
    }
}

export { CoordinateTranslator };


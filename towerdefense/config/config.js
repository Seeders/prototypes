const CONFIG = {
    GRID_SIZE: 48,
    CANVAS_WIDTH: 768,
    CANVAS_HEIGHT: 384,
    get ROWS() { return parseInt((this.CANVAS_HEIGHT * 2) / this.GRID_SIZE) },
    get COLS() { return parseInt(this.CANVAS_WIDTH / this.GRID_SIZE) }
}

export { CONFIG };
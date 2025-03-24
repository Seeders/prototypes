import { Component } from "../engine/Component.js";

class RangeIndicator extends Component {
    constructor(game, parent, image, offsetY) {
        super(game, parent);
        this.ctx = game.ctx;
    }
    draw() {

        let statsComp = this.getComponent('stats');
        if (statsComp && statsComp.stats.range) {
            this.drawRangeIndicator(statsComp.stats.range);
        }
    }

    drawRangeIndicator(range) {            
        const pixelX = this.parent.position.x;
        const pixelY = this.parent.position.y;
        let gridPos = this.game.translator.pixelToGrid(pixelX, pixelY);
        gridPos = this.game.translator.snapToGrid(gridPos.x, gridPos.y);
        if( gridPos.x == this.game.state.mousePosition.gridX && gridPos.y == this.game.state.mousePosition.gridY ) {
            const isoPos = this.game.translator.pixelToIso(pixelX, pixelY);
            // Convert range from grid units to isometric pixel units
            const isoRangeX = range;         // X-axis range remains roughly the same in isometric space
            const isoRangeY = range * 0.5;   // Y-axis range is halved due to isometric compression

            // Set styling for the range indicator
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Red with transparency
            this.ctx.lineWidth = 2;

            // Draw an ellipse to represent the range in isometric space
            this.ctx.ellipse(
                isoPos.x,           // Center x in isometric coords
                isoPos.y,           // Center y in isometric coords
                isoRangeX,          // X radius (wider due to isometric projection)
                isoRangeY,          // Y radius (shorter due to flattening)
                0,                  // Rotation (none needed for isometric)
                0,                  // Start angle
                2 * Math.PI         // End angle (full circle)
            );

            this.ctx.stroke();
            this.ctx.closePath();
        }
    }
}

export { RangeIndicator };
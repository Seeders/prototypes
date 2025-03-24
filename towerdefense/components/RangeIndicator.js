import { Component } from "../engine/Component.js";

class RangeIndicator extends Component {
    constructor(game, parent, image, offsetY) {
        super(game, parent);
        this.ctx = game.ctx;
        this.translator = game.translator; // Access translator for tileWidth
    }

    draw() {
        let statsComp = this.getComponent('stats');
        if (!statsComp || !statsComp.stats || !statsComp.stats.range) {
            return;
        }
        this.drawRangeIndicator(statsComp.stats.range);
    }

    drawRangeIndicator(range) {    
        const drawRage = range - 1;        
        const pixelX = this.parent.position.x;
        const pixelY = this.parent.position.y;
        let gridPos = this.translator.pixelToGrid(pixelX, pixelY);
        gridPos = this.translator.snapToGrid(gridPos.x, gridPos.y);
        const isoPos = this.translator.pixelToIso(pixelX, pixelY);
    
        const isoRangeX = drawRage * this.game.gameConfig.configs.state.gridSize;  // Matches gridToIso X scaling
        const isoRangeY = drawRage * this.game.gameConfig.configs.state.gridSize * 0.5; // Matches gridToIso Y scaling
    
        if (gridPos.x === this.game.state.mousePosition.gridX && gridPos.y === this.game.state.mousePosition.gridY) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            this.ctx.lineWidth = 2;
    
            this.ctx.ellipse(
                isoPos.x,
                isoPos.y,
                isoRangeX,
                isoRangeY,
                0,
                0,
                2 * Math.PI
            );
    
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();
        }    
      
    }
}

export { RangeIndicator };
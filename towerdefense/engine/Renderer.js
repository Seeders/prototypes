import { Component } from "./Component.js";

class Renderer extends Component {
    constructor(game, parent, images, offsetY) {
        super(game, parent);
        this.images = images;   
        this.currentDirection = 0;
        this.offsetY = offsetY;
    }
    draw() {
        const dx = this.parent.position.x - this.parent.lastPosition.x; // Change in x
        const dy = this.parent.position.y - this.parent.lastPosition.y; // Change in y

        // Determine primary direction based on magnitude of movement
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal movement dominates
            if (dx > 0) {
                this.currentDirection = 1; // Right
            } else if (dx < 0) {
                this.currentDirection = 2; // Left
            }
        } else if (Math.abs(dy) >= Math.abs(dx)) {
            // Vertical movement dominates or equal to horizontal
            if (dy > 0) {
                this.currentDirection = 0; // Down
            } else if (dy < 0) {
                this.currentDirection = 3; // Up
            }
        }
        if (this.images && this.images.length > this.currentDirection) {

            const imgWidth = this.images[this.currentDirection].width;
            const imgHeight = this.images[this.currentDirection].height;
            
            const drawX = this.parent.drawPosition.x - imgWidth / 2;
            const drawY = this.parent.drawPosition.y - imgHeight / 2;

            this.game.ctx.drawImage(this.images[this.currentDirection], drawX, drawY);

        }
    }
  
}
export { Renderer };
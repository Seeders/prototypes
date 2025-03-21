import { Component } from "./Component.js";
import { CONFIG } from "../config/config.js";
class FollowPath extends Component {
    constructor(game, parent, pathIndex = 0) {
        super(game, parent);
        this.pathIndex = pathIndex;
        this.x = this.game.state.path[this.pathIndex].x;
        this.y = this.game.state.path[this.pathIndex].y;
        this.parent.position = { x: this.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2, y: this.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2 };        
    }

    update() {
        this.stats = this.getComponent('stats').stats;
        if (this.pathIndex < this.game.state.path.length - 1) {
            const target = this.game.state.path[this.pathIndex + 1];
            const dx = target.x * CONFIG.GRID_SIZE + (CONFIG.GRID_SIZE / 2) - this.parent.position.x;
            const dy = target.y * CONFIG.GRID_SIZE + (CONFIG.GRID_SIZE / 2) - this.parent.position.y;
            const dist = Math.hypot(dx, dy);

            if (dist > this.stats.speed) {
                this.parent.position.x += (dx / dist) * this.stats.speed;
                this.parent.position.y += (dy / dist) * this.stats.speed;
            } else {
                this.pathIndex++;
            }
            this.x = parseInt(this.parent.position.x / CONFIG.GRID_SIZE);
            this.y = parseInt(this.parent.position.y / CONFIG.GRID_SIZE);
        } else {
            this.game.state.bloodCoreHP -= this.stats.value;
            this.parent.destroy();
            return false;
        }
    }
}

export { FollowPath };
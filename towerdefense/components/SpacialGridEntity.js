import { Component } from "../engine/Component.js";

class SpacialGridEntity extends Component { 
    update() {
        this.game.spatialGrid.insert(this.parent);
    }
    destroy() {
        this.game.spatialGrid.remove(this.parent);
    }
}


export { SpacialGridEntity };
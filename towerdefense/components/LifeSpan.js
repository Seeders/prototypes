import { Component } from "./Component.js";

class LifeSpan extends Component {
    constructor(game, parent, lifeSpan) {
        super(game, parent);
        this.lifeSpan = lifeSpan;
    }
    update() {        
        if( this.lifeSpan > 0 ) {
            this.lifeSpan--;
        } else {
            this.parent.destroy();
        }
    }
}
export { LifeSpan };

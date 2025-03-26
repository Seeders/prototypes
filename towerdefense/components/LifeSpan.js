import { Component } from "../engine/Component.js";

class LifeSpan extends Component {
    init( lifeSpan) {
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

import { Component } from "./Component.js";

class EssenceBounty extends Component { 
    constructor( game, parent ) {
        super(game, parent);        
        this.statsComp = parent.getComponent('stats');
    }
    destroy() {               
        this.game.state.essence += this.statsComp.stats.essence * this.game.state.stats.essenceMultiplier;        
    }
}
export { EssenceBounty };
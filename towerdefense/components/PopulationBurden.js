import { Component } from "./Component.js";

class PopulationBurden extends Component {
    constructor(game, parent) {
        super(game, parent);
        this.stats = this.parent.getComponent('stats').stats;        
    }
    update() {
        if(this.stats){ 
            if( this.stats.population ) {
                this.game.state.stats.population += this.stats.population;
            } 
            if( this.stats.supply ) {
                this.game.state.stats.maxPopulation += this.stats.supply;
            }
        }
    }
}

export { PopulationBurden };
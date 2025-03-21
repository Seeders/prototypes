import { Component } from "./Component.js";
import { calculateStats } from "../functions/calculateStats.js";
import { Effect } from "../classes/Effect.js";

class Stats extends Component { 
    constructor( game, parent, type, stats ) {
        super(game, parent);
        this.type = type;
        this.stats = {...stats};
        this.defaultStats = {...this.stats};
        this.activeEffects = {};
    }
    update() {
        this.stats = {...this.defaultStats};
        this.applyEffects();
        this.applyUpgrades();
    }
    addStat(statName, statValue) {
        this.stats[statName] = statValue;
        this.defaultStats[statName] = statValue;
    }
    addEffect(effectConfig, effectFn, effectAmt) {        
        this.activeEffects[effectConfig.id] = new Effect( effectConfig, effectFn, effectAmt );
    }
    applyEffects() {
        let effectArr = [];
        for(let effectId in this.activeEffects) {
            if(this.activeEffects[effectId] && this.activeEffects[effectId].update()){
                effectArr.push(this.activeEffects[effectId]);
            } else {
                this.activeEffects[effectId] = undefined;
            }
        }        
        
        calculateStats(this.stats, effectArr);
    }
    
    applyUpgrades() {
        calculateStats(this.stats, this.game.state.activeUpgrades[this.type]);        
    }
}
export { Stats };
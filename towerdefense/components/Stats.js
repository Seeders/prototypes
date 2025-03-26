import { Component } from "../engine/Component.js";
import { calculateStats } from "../functions/calculateStats.js";
import { Effect } from "./Effect.js";

class Stats extends Component { 
    init( {objectType, spawnType} ) { 
        let stats = this.game.gameConfig[objectType][spawnType];
        this.type = spawnType;
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
        this.activeEffects[effectConfig.id] = this.parent.addComponent(Effect, effectConfig, effectFn, effectAmt );
    }
    applyEffects() {
        let effectArr = [];
        for(let effectId in this.activeEffects) {
            if(this.activeEffects[effectId] && this.activeEffects[effectId].lifeTime > 0){
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
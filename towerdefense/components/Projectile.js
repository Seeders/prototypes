import { Component } from "../engine/Component.js";
import { Entity } from "../engine/Entity.js";
import { Explosion } from "./Explosion.js";
import { calculateDamage } from "../functions/calculateDamage.js";

class Projectile extends Component {
    constructor(game, parent, type, owner, target, stats) {
        super(game, parent);
        this.type = type;
        this.def = this.game.gameConfig.projectiles[this.type];
        this.owner = owner;
        this.target = target;
        this.stats = stats;
        this.piercedEnemies = [];
        this.ownerStats = this.owner.getComponent("stats").stats;
        this.distanceTraveled = 0;
        this.distanceToSpawnParticle = 24;
    }

    update() {
        // Remove if target is gone
        if (!this.target || this.target.destroyed) {
            this.parent.destroy();
        }
        // Move towards target
        const dx = this.target.position.x - this.parent.position.x;
        const dy = this.target.position.y - this.parent.position.y;
        const distSq = dx * dx + dy * dy;
        
        // Hit detection
        if (distSq < 15 * 15 ) {
            let targetHealth = this.target.getComponent("health");
            let targetEnergyShield = this.target.getComponent("energyshield");
            let targetStats = this.target.getComponent("stats");
            let targetStatClone = {...targetStats.stats};
            targetStatClone.energyShield = targetEnergyShield.energyShield;
            if (this.stats.splashRadius > 0) {
                const nearbyEnemies = this.game.spatialGrid.getNearbyEntities(
                    this.parent.gridPosition.x, 
                    this.parent.gridPosition.y, 
                    this.stats.splashRadius
                );
                // Process only relevant enemies
                for (const enemy of nearbyEnemies) {
                    if (enemy.isDead) continue;
                    let enemyHealth = enemy.getComponent("health");
                    let enemyEnergyShield = this.target.getComponent("energyshield");
                    let enemyStats = enemy.getComponent("stats");
                    let enemyStatClone = {...enemyStats.stats};
                    enemyStatClone.energyShield = enemyEnergyShield.energyShield;
                    const dx = enemy.position.x - this.target.position.x;
                    const dy = enemy.position.y - this.target.position.y;
                    const distSq1 = dx * dx + dy * dy;
                    
                    let gridSize = this.game.gameConfig.configs.state.gridSize;
                    // Compare with squared splash radius for efficiency
                    const splashRadiusSq = this.stats.splashRadius * this.stats.splashRadius * gridSize * gridSize;
                    if (distSq1 <= splashRadiusSq) {
                        // Calculate actual distance only when needed
                        //const splashDist = Math.sqrt(distSq1);
                        let damageResult = calculateDamage(this.stats, enemyStatClone);                    
                        if( !damageResult.wasEvaded ) {                        
                            enemyHealth.hp -= damageResult.damageDealt;
                            enemyEnergyShield.absorbDamage(damageResult.damageAbsorbed);
                            this.game.createHitEffect(enemy.position.x, enemy.position.y, this.stats.damageType);
                            if( this.ownerStats.slowEffect ) {
                                enemyStats.addEffect(this.game.gameConfig.effects.slow, this.game.effects.slow, this.ownerStats.slowEffect);
                            }
                        }
                    }
                }
                let explosion = new Entity(this.game, this.parent.position.x, this.parent.position.y);
                explosion.addRenderer(Explosion, this.stats.splashRadius);
                this.game.state.addEntity(explosion);
            } else {
                // Apply damage
                let damageResult = calculateDamage(this.stats, targetStatClone);                    
                if( !damageResult.wasEvaded ) {  
                    targetHealth.hp -= damageResult.damageDealt;
                    targetEnergyShield.absorbDamage(damageResult.damageAbsorbed);
                    this.game.createHitEffect(this.target.position.x, this.target.position.y, this.stats.damageType);
                    if( this.ownerStats.slowEffect ) {
                        targetStats.addEffect(this.game.gameConfig.effects.slow, this.game.effects.slow, this.ownerStats.slowEffect );
                    }
                }
            }

            //summon skeleton
            if (this.ownerStats.summonChance > 0 && 
                targetHealth.hp <= 0 && 
                Math.random() < this.ownerStats.summonChance - 1) {
                    this.game.createSummon(this.target.position.x, this.target.position.y, this.ownerStats.summonType);
            }

            // Apply tower special effects
            if (this.ownerStats.leech > 0) {
                const healing = this.stats.damage * this.ownerStats.leech * this.game.state.stats.healingMultiplier;
                this.game.state.bloodCoreHP = Math.min(this.game.state.stats.maxBloodCoreHP, this.game.state.bloodCoreHP + healing);
            }
            if (this.ownerStats.thief && this.ownerStats.thief != 0) {
                const stealAmt = this.stats.damage * this.ownerStats.thief * this.game.state.stats.bloodShardMultiplier;
                this.game.state.bloodShards += stealAmt;
            }
            // Piercing logic
            if (this.stats.piercing > 0 && this.piercedEnemies.length < this.stats.piercing) {
                this.piercedEnemies.push(this.target);
                const nearbyEnemies = this.game.spatialGrid.getNearbyEntities(
                    this.parent.gridPosition.x, 
                    this.parent.gridPosition.y, 
                    this.ownerStats.range
                );
                // Find a new target
                let newTarget = null;
                for (let enemy of nearbyEnemies) {
                    if (!enemy.destroyed && !this.piercedEnemies.includes(enemy)) {
                        const dx = enemy.position.x - this.parent.position.x;
                        const dy = enemy.position.y - this.parent.position.y;
                        const distSq2 = dx * dx + dy * dy;
                        const gridSize = this.game.gameConfig.configs.state.gridSize;
                        if (distSq2 < this.ownerStats.range * this.ownerStats.range * gridSize * gridSize) {
                            newTarget = enemy;
                            break;
                        }
                    }
                }
                
                if (newTarget) {
                    this.target = newTarget;   
                    return;                 
                } 
            } 
            
            this.parent.destroy();
        }
        


        // Move projectile
        let dist = Math.sqrt(distSq);
        const speed = this.stats.speed;
        this.parent.position.x += (dx / dist) * speed;
        this.parent.position.y += (dy / dist) * speed;

        const tDx = this.parent.lastPosition.x - this.parent.position.x;
        const tDy = this.parent.lastPosition.y - this.parent.position.y;
        const tdistSq = tDx * tDx + tDy * tDy;
        let tDist = Math.sqrt(tdistSq);
        

        this.distanceTraveled += tDist;
        if( this.def.particle && this.distanceTraveled > this.distanceToSpawnParticle ) {
            this.game.createParticle( this.def.particle, this.parent.position.x, this.parent.position.y);
            this.distanceTraveled = 0;
            this.distanceToSpawnParticle += Math.random()*3;
        }
    }
}

export { Projectile };
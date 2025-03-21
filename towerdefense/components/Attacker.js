import { Component } from "./Component.js";

class Attacker extends Component {
    constructor(game, parent) {
        super(game, parent);     
        this.stats = this.getComponent('stats').stats;    
        this.level = 1;
        this.target = null;
        this.projectiles = [];  
        this.cooldown = 0;
    }

    update() {

        if (this.cooldown > 0) this.cooldown--;
                
        // Find target if none
        if (!this.target || this.target.getComponent('health').hp <= 0 || Math.hypot(this.target.position.x - this.parent.position.x, this.target.position.y - this.parent.position.y) > this.stats.range) {
            this.findTarget();
        }
        
        // Attack if ready and has target
        if (this.cooldown <= 0 && this.target) {
            this.attack();
        }

        if( this.cooldown <= 0 && this.stats.mineAmt > 0 ){
            this.gather();
        }
        return true;
    }
    
    findTarget() {
        this.target = null;
        let furthestEnemy = null;
        let furthestDistance = -1;
        const nearbyEnemies = this.game.spatialGrid.getNearbyEntities(
            this.parent.position.x, 
            this.parent.position.y, 
            this.stats.range
        );
        for (let enemy of nearbyEnemies) {
            let enemyHP = enemy.getComponent('health').hp;
            let followPath = enemy.getComponent('followPath');
            if (enemyHP <= 0) continue;          

            // Target furthest enemy along path (closest to core)
            if (followPath.pathIndex > furthestDistance) {
                furthestDistance = followPath.pathIndex;
                furthestEnemy = enemy;
            }
            
        }
        
        this.target = furthestEnemy;
    }

    gather() {
        this.game.state.bloodShards += this.stats.mineAmt;
        this.cooldown = this.stats.attackSpeed;
    }

    attack() {
        if (!this.target) return; 
        this.launchProjectile();
        this.cooldown = this.stats.attackSpeed;
    }
    
    launchProjectile() {
        let damage = this.stats.damage * this.game.state.stats.damageMultiplier;
        let projectileType = this.stats.projectile;
        // Critical hit calculation
        const isCritical = Math.random() < this.stats.critChance;
        if (isCritical) {
            damage *= this.stats.critMultiplier;
        } 
        
        this.game.createProjectile(projectileType, this.parent.position.x, this.parent.position.y, this.target, damage, isCritical, this.parent);
                
    }

}

export { Attacker };
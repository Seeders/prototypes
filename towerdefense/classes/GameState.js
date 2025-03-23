class GameState {
    constructor() {
        this.entities = [];
        this.reset();
    }

    reset() {            
        this.bloodShards = 200;
        this.essence = 0;
        this.level = 1;
        this.essenceToNextLevel = 100;
        this.bloodCoreHP = 100;
        this.entities = [];
        this.mousePosition = { x: 0, y: 0, isoX: 0, isoY: 0, gridX: 0, gridY: 0 };
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.summons = [];
        this.others = [];

        this.wave = 1;
        this.maxWaves = 10;
        this.waveTimer = 0;
        this.waveDelay = 300;
        this.numEnemiesInWave = 10;
        this.enemiesSpawned = 110;
        this.spawnRate = 60;
        this.spawnTimer = 0;
        this.isLevelingUp = false;
        this.isPaused = false;
        this.selectedTowerType = null;
        this.timeScale = 1;
        this.stats = {
            maxBloodCoreHP: 100,
            bloodShardMultiplier: 1,            
            towerCostMod: 1,
            damageMultiplier: 1,
            healingMultiplier: 1,
            essenceMultiplier: 1,
            towerDamageReduction: 1,
            population: 0,
            maxPopulation: 5
        }
        this.defaultStats = {...this.stats};
        this.gameOver = false;
        this.victory = false;
        this.activeUpgrades = {};
        this.currentWaveEnemies = [];
        this.maxWaves = 10;
    }

    addEntity(entity) {
        this.entities.push(entity);
    }
    removeEntity(entity) {
    
        let index = this.entities.indexOf(entity);
        if( index >= 0 ) {
            this.entities.splice(index, 1);
        }
    }
    hasTowerType(type) {
        return this.towers.some((tower) => {
            return tower.type === type;
        });
    }
}
export { GameState };
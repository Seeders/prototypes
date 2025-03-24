import { Engine } from "../engine/Engine.js";
import { GameState } from "./GameState.js";
import { MapManager } from "../engine/MapManager.js";
import { UIManager } from "./UIManager.js";
import { Upgrade } from "./Upgrade.js";
import { Entity } from "../engine/Entity.js";

// Components
import { LifeSpan } from "../components/LifeSpan.js";
import { HitEffectParticle } from "../components/HitEffectParticle.js";
import { HitEffectRenderer } from "../components/HitEffectRenderer.js";
import { Stats } from "../components/Stats.js";
import { Renderer } from "../engine/Renderer.js";
import { Animator } from "../components/Animator.js";
import { Health } from "../components/Health.js";
import { EssenceBounty } from "../components/EssenceBounty.js";
import { FollowPath } from "../components/FollowPath.js";
import { SpacialGridEntity } from "../components/SpacialGridEntity.js";
import { ArrayTracker } from "../components/ArrayTracker.js";
import { Leveler } from "../components/Leveler.js";
import { Buildable } from "../components/Buildable.js";
import { PopulationBurden } from "../components/PopulationBurden.js";
import { Attacker } from "../components/Attacker.js";
import { RangeIndicator } from "../components/RangeIndicator.js";
import { LightningRenderer } from "../components/LightningRenderer.js";
import { ChainProjectile } from "../components/ChainProjectile.js";
import { Projectile } from "../components/Projectile.js";
import { EnergyShield } from "../components/EnergyShield.js";

import { calculateStats } from "../functions/calculateStats.js";

class Game extends Engine {
    constructor() {
        super();
    }
    
    async init() {
        this.gameConfig = await this.loadConfig();
        if (!this.gameConfig) {
            console.error("Failed to load game configuration");
            return;
        }
        
        this.state = new GameState();
        this.state.currentLevel = this.gameConfig.configs.state.level;
        this.mapManager = new MapManager();
        this.uiManager = new UIManager(this.gameConfig);
        
        this.reset();
        
        const { tileMap, paths } = this.mapManager.generateMap(this.gameConfig.levels[this.state.currentLevel].tileMap);
        this.state.tileMap = tileMap;
        this.state.paths = paths;
        
        await super.init(this.gameConfig);
        
        this.setupTowerPlacement();
        this.state.isPaused = true;
        this.drawStats();
        this.initEffectsAndUpgrades();
    }
    
    reset() {
        this.state.reset();
        this.uiManager.reset();
    }

    update() {        
        this.state.stats = {...this.state.defaultStats};

        super.update();
        
        if (this.state.gameOver || this.state.victory || this.state.isLevelingUp) return;
        
        this.applyActiveUpgrades();
        
        // Update wave status
        this.updateWaves();
        
        // Level Up check
        if (this.state.essence >= this.state.essenceToNextLevel && !this.state.isLevelingUp) {
            this.showUpgradeMenu();
        }
        
        // Game over check
        if (this.state.bloodCoreHP <= 0 && !this.state.gameOver) {
            this.gameOver();
        }
    }

    // Wave management
    updateWaves() {
        this.state.startDelayTimer += this.deltaTime;
        this.state.spawnTimer += this.deltaTime;
        // Process all wavesets in parallel
        for (let i = 0; i < this.state.currentWaveIds.length; i++) {
            let waveSet = this.gameConfig.wavesets[this.state.waveSets[i]];
            
            // Skip if still in start delay
            if (waveSet.startDelay && this.state.startDelayTimer < waveSet.startDelay) continue;
            
            // If this waveset still has enemies to spawn
            if (this.state.enemiesSpawned[i] < this.state.currentWaveEnemies[i].length) {
                if (this.state.spawnTimer >= this.state.spawnRate) {
                    // Create enemy from the appropriate waveset using the enemy type and start point index
                    const enemyType = this.state.currentWaveEnemies[i][this.state.enemiesSpawned[i]];
                    const startPointIndex = i; // Each waveset corresponds to a different start point
                    
                    this.createEnemy(enemyType, startPointIndex);
                    this.state.enemiesSpawned[i]++;
                    this.state.spawnTimer = 0;
                    
                    // Calculate total progress across all wavesets
                    const totalEnemies = this.state.currentWaveEnemies.reduce((sum, wave) => sum + wave.length, 0);
                    const totalSpawned = this.state.enemiesSpawned.reduce((sum, count) => sum + count, 0);
                    
                    // Update wave progress
                    waveProgress.style.width = (totalSpawned / totalEnemies * 100) + '%';
                }
            }
        }
        
        // Check if all wavesets have completed spawning
        const allWavesetsComplete = this.state.enemiesSpawned.every((spawned, index) => 
            spawned >= this.state.currentWaveEnemies[index].length
        );
        
        // Move to next wave if all enemies defeated and all wavesets have completed spawning
        if (this.state.enemies.length === 0 && allWavesetsComplete) {
            this.state.waveTimer++;
            
            if (this.state.waveTimer >= this.state.waveDelay) {
                this.startNextWave();
            }
        }
    }

    startNextWave() {
        waveDisplay.textContent = this.state.round + 1;
        this.state.waveSets = this.gameConfig.levels[this.state.currentLevel].wavesets;
        this.state.currentWaveIds = [];
        this.state.currentWaveEnemies = [];
        this.state.enemiesSpawned = [];
        
        let totalWaves = 0;
        for (let i = 0; i < this.state.waveSets.length; i++) {
            const waveSetId = this.state.waveSets[i];
            const waveSet = this.gameConfig.wavesets[waveSetId];
            
            // Get the current wave for this waveset based on progress
            // Check if this waveset has enough waves for the current round
            if (this.state.round < waveSet.waves.length) {
                // If the waveset has a wave for this round, use it
                const currentWaveId = waveSet.waves[this.state.round];
                
                // Add this wave to the current active waves
                this.state.currentWaveIds.push(currentWaveId);
                this.state.currentWaveEnemies.push(this.gameConfig.waves[currentWaveId].enemies);
                this.state.enemiesSpawned.push(0);
            }
            
            totalWaves = Math.max(totalWaves, waveSet.waves.length);
        }
        
        // If all wavesets are exhausted, end the game
        if (this.state.currentWaveIds.length === 0) {
            this.gameVictory();
            return;
        }
        
        this.state.maxWaves = totalWaves;
        this.state.spawnRate = 1;
        this.state.spawnTimer = 0;
        this.state.waveTimer = 0;
        this.state.startDelayTimer = 0;
        
        // Reset wave progress bar
        waveProgress.style.width = '0%';
        this.state.round++;
    }

    applyActiveUpgrades() {
        calculateStats(this.state.stats, this.state.activeUpgrades['global']);    
    }

    // Tower placement system
    setupTowerPlacement() {
        let endPath = this.state.paths[0][this.state.paths[0].length - 1];
        let endY = endPath.y;
        let endX = endPath.x;

        const keep = this.createTower(endX * this.gameConfig.configs.state.gridSize + this.gameConfig.configs.state.gridSize / 2, 
                                      endY * this.gameConfig.configs.state.gridSize + this.gameConfig.configs.state.gridSize / 2, 
                                      'keep');
        keep.placed = true;
        
        const towerButtons = document.querySelectorAll('.tower-option');
        towerButtons.forEach(button => {
            button.addEventListener('click', () => {
                if(this.state.isPaused) return;
                
                const type = button.getAttribute('data-type');
                let cost = this.gameConfig.towers[type].cost;
                const finalCost = Math.floor(cost * this.state.stats.towerCostMod);
                
                let populationCost = this.gameConfig.towers[type].population || 0;
                if (this.state.bloodShards >= finalCost && this.state.stats.population + populationCost <= this.state.stats.maxPopulation) {
                    this.state.selectedTowerType = type;
                    if(this.state.previewTower) {
                        this.state.previewTower.destroy();
                    }
                    this.state.previewTower = this.createPreviewTower(-100, -100, this.state.selectedTowerType, true);
                }
            });
            
            // Show tooltip with info
            button.addEventListener('mouseover', (e) => {
                const type = button.getAttribute('data-type');
                let info = this.gameConfig.towers[type].info;
                
                this.showTooltip(e.clientX, e.clientY, info);
            });
            
            button.addEventListener('mouseout', () => {
                this.hideTooltip();
            });
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.state.selectedTowerType && !this.state.towers.length) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const gridPos = this.translator.isoToGrid(mouseX, mouseY);
            const snappedGrid = this.translator.snapToGrid(gridPos.x, gridPos.y);
            const isoSnappedGridPos = this.translator.gridToIso(snappedGrid.x, snappedGrid.y);
            const pixelIsoPos = this.translator.pixelToIso(mouseX, mouseY);
            this.state.mousePosition = { 
                x: mouseX, 
                y: mouseY, 
                isoX: pixelIsoPos.x, 
                isoY: pixelIsoPos.y, 
                gridX: snappedGrid.x, 
                gridY: snappedGrid.y 
            };

            if (this.state.selectedTowerType && this.state.previewTower) {
                const snappedPixelPos = this.translator.isoToPixel(isoSnappedGridPos.x, isoSnappedGridPos.y);
                this.state.previewTower.position.x = snappedPixelPos.x + this.gameConfig.configs.state.gridSize / 2;
                this.state.previewTower.position.y = snappedPixelPos.y + this.gameConfig.configs.state.gridSize / 2;
                const isValidPosition = this.checkValidTowerPosition(snappedGrid.x, snappedGrid.y);
                this.canvas.style.cursor = isValidPosition ? 'pointer' : 'not-allowed';
            }

            let hoveredTower = null;
            for (const tower of this.state.towers) {
                const towerIso = this.translator.pixelToIso(tower.x, tower.y);
                const dist = Math.hypot(towerIso.x - mouseX, towerIso.y + this.translator.tileHeight / 2 - mouseY);
                if (dist < 20) {
                    hoveredTower = tower;
                    break;
                }
            }

            if (hoveredTower) {
                let info = `${hoveredTower.type} (Level ${hoveredTower.level})\n`;
                info += `Damage: ${Math.round(hoveredTower.stats.damage * this.state.stats.damageMultiplier * 10) / 10}\n`;
                info += `Attack Speed: ${Math.round(1000 / hoveredTower.stats.attackSpeed)} per sec\n`;
                info += `Range: ${hoveredTower.stats.range}\n`;
                info += `Crit Chance: ${Math.round(hoveredTower.stats.critChance * 100)}%\n`;
                if (hoveredTower.stats.leech > 0) {
                    info += `Life Leech: ${Math.round(hoveredTower.stats.leech * 100 * this.state.stats.healingMultiplier) / 100} HP per hit\n`;
                }
                if (hoveredTower.stats.piercing > 0) {
                    info += `Piercing: ${hoveredTower.stats.piercing} enemies\n`;
                }
                if (hoveredTower.stats.summonChance > 0) {
                    info += `Summon Chance: ${Math.round(hoveredTower.stats.summonChance * 100)}%\n`;
                }

                this.showTooltip(e.clientX, e.clientY, info);
                hoveredTower.showRange = true;
            } else {
                this.hideTooltip();
                this.state.towers.forEach(t => t.showRange = false);
            }
        });

        this.canvas.addEventListener('mouseout', () => {
            this.hideTooltip();
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (!this.state.selectedTowerType) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Convert mouse (isometric pixel) to grid
            const gridPos = this.translator.isoToGrid(mouseX, mouseY);
            const snappedGrid = this.translator.snapToGrid(gridPos.x, gridPos.y);

            // Convert snapped grid back to isometric for preview
            const isoSnappedGridPos = this.translator.gridToIso(snappedGrid.x, snappedGrid.y); 
            const snappedPixelPos = this.translator.isoToPixel(isoSnappedGridPos.x, isoSnappedGridPos.y);
            
            if (this.checkValidTowerPosition(snappedGrid.x, snappedGrid.y)) {
                // Create the tower
                let cost = this.gameConfig.towers[this.state.selectedTowerType].cost;
                let populationCost = this.gameConfig.towers[this.state.selectedTowerType].population || 0;
                
                const finalCost = Math.floor(cost * this.state.stats.towerCostMod);
                
                if (this.state.bloodShards >= finalCost && this.state.stats.population + populationCost <= this.state.stats.maxPopulation) {
                    const tower = this.createTower(snappedPixelPos.x + this.gameConfig.configs.state.gridSize / 2, 
                                                 snappedPixelPos.y + this.gameConfig.configs.state.gridSize / 2, 
                                                 this.state.selectedTowerType);
                    tower.placed = true;
                    this.state.tileMap[snappedGrid.y][snappedGrid.x].buildable = false;
                    this.state.tileMap[snappedGrid.y][snappedGrid.x].tower = tower;
                    this.state.bloodShards -= finalCost;
                    this.state.previewTower.destroy();
                    this.state.previewTower = null;
                    // Clear selection
                    this.state.selectedTowerType = null;
                    this.canvas.style.cursor = 'default';
                }
            }
        });
        
        // Cancel tower placement with right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.state.selectedTowerType) {
                this.state.selectedTowerType = null;
                this.canvas.style.cursor = 'default';
            }
        });
    }

    checkValidTowerPosition(posX, posY) {
        if(posX >= 0 && posY >= 0 && this.state.tileMap.length > posY && this.state.tileMap[posY].length > posX){
            return this.state.tileMap[posY][posX].buildable;            
        }
        return false;
    }

    // Upgrade system
    showUpgradeMenu() {
        if (this.state.isLevelingUp) return; // Prevent re-triggering
        
        this.state.isLevelingUp = true;
        this.state.isPaused = true;
        
        this.uiManager.upgradeMenu.style.display = 'block';
        this.uiManager.overlay.style.display = 'block';
        this.uiManager.upgradeOptionsDiv.innerHTML = '';
        
        // Filter upgrades based on conditions
        const availableUpgrades = this.upgrades.filter(upgrade => upgrade.canApply(this.state));
        
        // Choose 3 random upgrades
        const options = [];
        while (options.length < 3 && availableUpgrades.length > 0) {
            const index = Math.floor(Math.random() * availableUpgrades.length);
            options.push(availableUpgrades[index]);
            availableUpgrades.splice(index, 1);
        }
        
        // Create upgrade options
        options.forEach(upgrade => {
            const div = document.createElement('div');
            div.className = 'upgrade-option';
            div.innerHTML = `
                <div class="upgrade-icon">${upgrade.icon}</div>
                <div class="upgrade-desc">
                    <div class="upgrade-title">${upgrade.title}</div>
                    ${upgrade.desc}
                </div>
            `;
            div.onclick = () => this.selectUpgrade(upgrade);
            this.uiManager.upgradeOptionsDiv.appendChild(div);
        });
    }

    selectUpgrade(upgrade) {       
        // Add to active upgrades list if not already
        if (!this.state.activeUpgrades[upgrade.appliesTo]) {
            this.state.activeUpgrades[upgrade.appliesTo] = [upgrade];
        } else {
            this.state.activeUpgrades[upgrade.appliesTo].push(upgrade);
        }

        this.applyActiveUpgrades();
        if(upgrade.onAcquire) {
            upgrade.onAcquire(this.state);
        }
        
        upgradeMenu.style.display = 'none';
        overlay.style.display = 'none';
        
        this.state.essence -= this.state.essenceToNextLevel;
        this.state.level++;
        this.state.essenceToNextLevel = Math.floor(this.state.essenceToNextLevel * 1.4);        
        
        this.state.isLevelingUp = false;
        this.state.isPaused = false;
    }

    // Game-over and victory functions
    gameOver() {
        this.state.gameOver = true;
        this.state.isPaused = true;
        gameOverWave.textContent = this.state.round + 1;
        gameOverMenu.style.display = 'block';
        overlay.style.display = 'block';
    }

    gameVictory() {
        this.state.victory = true;
        this.state.isPaused = true;
        victoryMenu.style.display = 'block';
        overlay.style.display = 'block';
    }

    // Tooltip system
    showTooltip(x, y, text) {
        tooltip.style.display = 'block';
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (y + 10) + 'px';
        tooltip.textContent = text;
    }

    hideTooltip() {
        tooltip.style.display = 'none';
    }

    // Entity creation methods
    createProjectile(type, x, y, target, attacker, projStats) {
        let ownerStats = attacker.getComponent('stats').stats;
        let def = this.gameConfig.projectiles[type];
        let entity = new Entity(this, x, y);
        entity.addComponent(Stats, type, stats);
        if(def.customRenderer == "lightning") {
            entity.addRenderer(LightningRenderer, ownerStats);
            entity.addComponent(ChainProjectile, type, attacker, target, projStats);
        } else {
            entity.addRenderer(Renderer, this.imageManager.getImages("projectiles", type));
            entity.addComponent(Animator, "projectiles", type);
            entity.addComponent(Projectile, type, attacker, target, projStats);
        }
        this.addEntity(entity);     
    }

    createTower(x, y, type, tracker="towers") {
        let stats = this.gameConfig.towers[type];
        let entity = new Entity(this, x, y);
        entity.addComponent(Stats, type, stats);
        entity.addRenderer(Renderer, this.imageManager.getImages("towers", type), 1);
        entity.addComponent(Animator, "towers", type);
        entity.addComponent(Leveler);
        entity.addComponent(Buildable);
        entity.addComponent(PopulationBurden);
        entity.addComponent(Attacker);
        entity.addRenderer(RangeIndicator);
        entity.addComponent(ArrayTracker, tracker);
        
        this.addEntity(entity);      
        return entity;  
    }

    createPreviewTower(x, y, type) {
        let stats = this.gameConfig.towers[type];
        let entity = new Entity(this, x, y);
        entity.addComponent(Stats, type, stats);
        entity.addRenderer(Renderer, this.imageManager.getImages("towers", type), 1);
        entity.addComponent(Animator, "towers", type);
        entity.addRenderer(RangeIndicator);
        entity.addComponent(Buildable);
        
        this.addEntity(entity);        
        return entity;
    }

    createSummon(x, y, type) {
        let stats = this.gameConfig.towers[type];
        let summon = this.createTower(x, y, type);
        summon.addComponent(LifeSpan, stats.lifeSpan);
    }

    removeSummon(summon) {
        this.state.removeEntity(summon);
    }

    createEnemy(spawnType, pathIndex) {
        let stats = this.gameConfig.enemies[spawnType];
        stats.hp *= 1 + (.01 * this.state.round);
        let entity = new Entity(this, 0, 0);
        entity.addComponent(Stats, spawnType, stats);
        entity.addRenderer(Renderer, this.imageManager.getImages("enemies", spawnType));
        entity.addComponent(Animator, "enemies", spawnType);
        entity.addRenderer(Health);
        entity.addRenderer(EnergyShield);
        entity.addComponent(EssenceBounty);
        entity.addComponent(FollowPath, pathIndex);
        entity.addComponent(SpacialGridEntity);
        entity.addComponent(ArrayTracker, "enemies");
        this.addEntity(entity);
    }
    
    createEnvironmentObject(x, y, type, tracker="environment") {
        let stats = this.gameConfig.environment[type];
        let entity = new Entity(this, x, y);
        entity.addComponent(Stats, type, stats);
        entity.addRenderer(Renderer, this.imageManager.getImages("environment", type));
        entity.addComponent(Animator, "environment", type);
        entity.addComponent(ArrayTracker, tracker);            
        this.addEntity(entity);      
        return entity;  
    }

    createHitEffect(x, y, damageType = "default") {
        let entity = new Entity(this, x, y);
        entity.addRenderer(HitEffectRenderer, null, 0);
        entity.addComponent(HitEffectParticle, damageType);
        entity.addComponent(LifeSpan, 30); // ~0.5 seconds at 60 FPS
        this.addEntity(entity);
    }
    applyUpgrade(upgradeId) {
        const upgrade = this.upgrades.find(u => u.id === upgradeId);
        if (upgrade && upgrade.canApply(this.state)) {
            upgrade.apply(this.state);
            this.uiManager.updateUpgrades(); // Hypothetical UI update
        }
    }
    initEffectsAndUpgrades() {
        this.effects = {
            slow: (stats, additiveStats, multiplicitiveStats, slowAmount) => {
                stats[this.gameConfig.effects.slow.stat] *= slowAmount;
            }
        }
        this.upgrades = [
            // Bat Swarm Upgrades
            new Upgrade(
                'sentryFrenzy',
                'Sentry Frenzy',
                'Sentry Swarm: ' + this.gameConfig.upgrades.sentryFrenzy.desc,
                '🦇',
                'sentry',
                (state) => true,
                (stats, additiveStats, multiplicitiveStats) => {
                    multiplicitiveStats['attackSpeed'].push(this.gameConfig.upgrades.sentryFrenzy.value);
                }
            ),
            new Upgrade(
                'sentryIntelligence',
                'Sentry Intelligence',
                'Sentry Swarm: ' + this.gameConfig.upgrades.sentryIntelligence.desc,
                '🦇',
                'sentry',
                (state) => true,
                (stats, additiveStats, multiplicitiveStats) => {            
                    multiplicitiveStats['damage'].push(this.gameConfig.upgrades.sentryIntelligence.damage);
                    multiplicitiveStats['range'].push(this.gameConfig.upgrades.sentryIntelligence.range);        
                }
            ),

            // Necromancer Upgrades
            new Upgrade(
                'necroSummon',
                'Raise Dead',
                'Necromancer: ' + this.gameConfig.upgrades.necroSummon.desc,
                '💀',
                'fabricator',
                (state) => true,
                (stats, additiveStats, multiplicitiveStats) => {
                    stats.summonChance = 1;
                    if(!additiveStats.summonChance) additiveStats.summonChance = [];
                    additiveStats['summonChance'].push(this.gameConfig.upgrades.necroSummon.summonChance);
                }
            ),

            // Shadow Turret Upgrades
            new Upgrade(
                'overCharge',
                'Overcharge',
                'Tesla Coil: ' + this.gameConfig.upgrades.overCharge.desc,
                '📏',
                'teslaCoil',
                (state) => true,
                (stats, additiveStats, multiplicitiveStats) => {
                    additiveStats['range'].push(this.gameConfig.upgrades.overCharge.range);
                }
            ),

            // Soul Pyre Upgrades
            new Upgrade(
                'pyreSoul',
                'Radiant Soul',
                'Soul Pyre: ' + this.gameConfig.upgrades.pyreSoul.desc,
                '💉',
                'soulPyre',
                (state) => true,
                (stats, additiveStats, multiplicitiveStats) => {
                    additiveStats['splashRadius'].push(this.gameConfig.upgrades.pyreSoul.splashRadius);
                }
            ),

            // Mist Shrine Upgrades
            new Upgrade(
                'mistSlow',
                'Chilling Mist',
                'Mist Shrine: ' + this.gameConfig.upgrades.mistSlow.desc,
                '❄️',
                'mistShrine',
                (state) => true,
                (stats, additiveStats, multiplicitiveStats) => {
                    multiplicitiveStats['slowEffect'].push(this.gameConfig.upgrades.mistSlow.slowEffect);
                }
            ),
            // Global Upgrades
            new Upgrade(
                'homeReinforcement',
                'Reinforcement',
                this.gameConfig.upgrades.bloodCore.desc,
                '🛡️',
                'global',
                (state) => true,
                (stats) => {
                    stats.maxBloodCoreHP *= this.gameConfig.upgrades.bloodCore.maxHpMultiplier;
                },
                (state) => {
                    state.bloodCoreHP = Math.min(state.stats.maxBloodCoreHP, state.bloodCoreHP + this.gameConfig.upgrades.bloodCore.healAmount);
                }
            ),
            new Upgrade(
                'essenceExtraction',
                'Essence Extraction',
                this.gameConfig.upgrades.essenceExtraction.desc,
                '🔮',
                'global',
                (state) => true,
                (stats) => {
                    stats.essenceMultiplier *= this.gameConfig.upgrades.essenceExtraction.value;
                }
            ),
            new Upgrade(
                'essenceOverflow',
                'Essence Overflow',
                this.gameConfig.upgrades.essenceOverflow.desc,
                '🔮',
                'global',
                (state) => state.bloodCoreHP > state.stats.maxBloodCoreHP / 2,
                (stats) => {
                    stats.essenceMultiplier *= this.gameConfig.upgrades.essenceOverflow.value;
                }
            ),

        ];

    }

    drawUI() {
        // To be implemented by game subclass
      
        this.drawStats();  

        // Draw wave timer
        if (this.state.enemies.length === 0 && this.state.enemiesSpawned >= this.state.numEnemiesInWave && !this.state.victory) {
            const countdown = Math.ceil((this.state.waveDelay - this.state.waveTimer) / 60);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Next Wave in ${countdown}...`, this.canvas.width / 2, 50);
        }
    }
    // Stats updating
    drawStats() {
        this.uiManager.shardsDisplay.textContent = Math.floor(this.state.bloodShards);
        this.uiManager.essenceDisplay.textContent = Math.floor(this.state.essence);
        this.uiManager.essenceNeededDisplay.textContent = Math.floor(this.state.essenceToNextLevel);
        this.uiManager.hpDisplay.textContent = Math.floor(this.state.bloodCoreHP);
        this.uiManager.populationDisplay.textContent = Math.floor(this.state.stats.population);
        this.uiManager.maxPopulationDisplay.textContent = Math.floor(this.state.stats.maxPopulation);     
    }

}
export { Game };
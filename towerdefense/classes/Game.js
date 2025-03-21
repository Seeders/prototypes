
import { CONFIG } from "../config/config.js";

import { LifeSpan } from "../components/LifeSpan.js";
import { HitEffectParticle } from "../components/HitEffectParticle.js";
import { HitEffectRenderer } from "../components/HitEffectRenderer.js";
import { Stats } from "../components/Stats.js";//
import { Renderer } from "../components/Renderer.js";
import { Animator } from "../components/Animator.js";
import { Health } from "../components/Health.js";
import { EssenceBounty } from "../components/EssenceBounty.js";//
import { FollowPath } from "../components/FollowPath.js";//
import { SpacialGridEntity } from "../components/SpacialGridEntity.js";//
import { ArrayTracker } from "../components/ArrayTracker.js";
import { Leveler } from "../components/Leveler.js";
import { Buildable } from "../components/Buildable.js";
import { PopulationBurden } from "../components/PopulationBurden.js";
import { Attacker } from "../components/Attacker.js";
import { RangeIndicator } from "../components/RangeIndicator.js";
import { LightningRenderer } from "../components/LightningRenderer.js";
import { ChainProjectile } from "../components/ChainProjectile.js";
import { Projectile } from "../components/Projectile.js";

import { GameState } from "./GameState.js";
import { MapManager } from "./MapManager.js";
import { UIManager } from "./UIManager.js";
import { SpatialGrid } from "./SpatialGrid.js";
import { ImageManager } from "./ImageManager.js";
import { Entity } from "./Entity.js";
import { Upgrade } from "./Upgrade.js";
import { MapRenderer } from "./MapRenderer.js";
import { CoordinateTranslator } from './CoordinateTranslator.js'; 

import { calculateStats } from "../functions/calculateStats.js";

class Game
 {
    constructor() {
        
        this.entityId = 0;

        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
     
        this.canvas.setAttribute('width', CONFIG.CANVAS_WIDTH);
        this.canvas.setAttribute('height', CONFIG.CANVAS_HEIGHT);

        this.entitiesToAdd = [];

    }
    // Initialize the game
    async init() {
        await this.loadConfig();
        this.state = new GameState();
        this.mapManager = new MapManager();
        this.translator = new CoordinateTranslator(CONFIG);
        this.uiManager = new UIManager(this.gameConfig);
        this.spatialGrid = new SpatialGrid(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_WIDTH, CONFIG.GRID_SIZE * 2);
        this.imageManager = new ImageManager();
        this.mapRenderer = new MapRenderer(this);
        const { tileMap, path } = this.mapManager.generateMap();
        this.state.tileMap = tileMap;
        this.state.path = path;
        this.reset();            

        for(let objectType in this.gameConfig) {
            for(let object in this.gameConfig[objectType]) {
                if(!this.gameConfig[objectType][object].render){
                    break;
                }
                await this.imageManager.loadImages(objectType, this.gameConfig[objectType]);
            }
        }
        this.gameInterval = setInterval(() => { this.gameLoop(); }, 10);
        this.state.isPaused = true;
        
        this.setupTowerPlacement();
        this.drawStats();
    }
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


    // Wave management
    updateWave() {
        // Spawn enemies
        if (this.state.enemiesSpawned < this.state.enemiesInWave) {
            this.state.spawnCounter++;
            
            if (this.state.spawnCounter >= this.state.spawnRate) {
                this.createEnemy(this.state.enemiesSpawned == parseInt(this.state.enemiesInWave / 2) ? "boss" : "");//spawn boss halfway through
                this.state.enemiesSpawned++;
                this.state.spawnCounter = 0;
                
                // Update wave progress
                waveProgress.style.width = (this.state.enemiesSpawned / this.state.enemiesInWave * 100) + '%';
            }
        } 
        // Move to next wave if all enemies defeated
        else if (this.state.enemies.length === 0 && this.state.enemiesSpawned >= this.state.enemiesInWave) {
            this.state.waveTimer++;
            
            if (this.state.waveTimer >= this.state.waveDelay) {
                this.startNextWave();
            }
        }
    }

    startNextWave() {
        this.state.wave++;
        waveDisplay.textContent = this.state.wave;
        
        // Check for victory
        // if (this.state.wave > this.state.maxWaves) {
        //     this.gameVictory();
        //     return;
        // }
        
        this.state.enemiesInWave = 10 * (this.state.wave * .5);
        this.state.enemiesSpawned = 0;
        this.state.spawnRate = Math.max(10, 60 - (this.state.wave));
        this.state.spawnCounter = 0;
        this.state.waveTimer = 0;
        
        // Reset wave progress bar
        waveProgress.style.width = '0%';
    }

    applyActiveUpgrades() {
        this.state.stats = {...this.state.defaultStats};
        calculateStats(this.state.stats, this.state.activeUpgrades['global']);    
    }

    // Tower placement system
    setupTowerPlacement() {
        let endY = parseInt(CONFIG.ROWS / 2) * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;
        let endX = (CONFIG.COLS - 1) * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2;

        const keep =  this.createTower(endX, endY, 'keep');
        keep.placed = true;
        const towerButtons = document.querySelectorAll('.tower-option');
        towerButtons.forEach(button => {
            button.addEventListener('click', () => {
                if( this.state.isPaused ) return;
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
            const pixelIsoPos = this.translator.pixelToIso( mouseX, mouseY );
            this.state.mousePosition = { x: mouseX, y: mouseY, isoX: pixelIsoPos.x, isoY: pixelIsoPos.y, gridX: snappedGrid.x, gridY: snappedGrid.y };


            if (this.state.selectedTowerType && this.state.previewTower) {
                const snappedPixelPos = this.translator.isoToPixel(isoSnappedGridPos.x, isoSnappedGridPos.y); // If checkValidTowerPosition needs pixels
                this.state.previewTower.position.x = snappedPixelPos.x + CONFIG.GRID_SIZE / 2;
                this.state.previewTower.position.y = snappedPixelPos.y + CONFIG.GRID_SIZE / 2; // Adjust if centering needed
                const isValidPosition = this.checkValidTowerPosition(snappedPixelPos.x, snappedPixelPos.y);
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
            const snappedPixelPos = this.translator.isoToPixel(isoSnappedGridPos.x, isoSnappedGridPos.y); // If checkValidTowerPosition needs pixels
            
            if (this.checkValidTowerPosition(snappedPixelPos.x + CONFIG.GRID_SIZE / 2, snappedPixelPos.y + CONFIG.GRID_SIZE / 2)) {
                // Create the tower
                let cost = this.gameConfig.towers[this.state.selectedTowerType].cost;
                let populationCost = this.gameConfig.towers[this.state.selectedTowerType].population || 0;
                
                const finalCost = Math.floor(cost * this.state.stats.towerCostMod);
                
                if (this.state.bloodShards >= finalCost && this.state.stats.population + populationCost <= this.state.stats.maxPopulation) {
                    const tower = this.createTower(snappedPixelPos.x + CONFIG.GRID_SIZE / 2, snappedPixelPos.y + CONFIG.GRID_SIZE / 2, this.state.selectedTowerType);
                    tower.placed = true;
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
        // Check if too close to path
        for (let i = 0; i < this.state.path.length - 1; i++) {
            const p1 = this.state.path[i];
            
            // Calculate distance from point to line segment
            const dist = Math.hypot(posX - p1.x, posY - p1.y);
            if (dist < CONFIG.GRID_SIZE) return false;
        }
        
        // Check if too close to other towers
        for (const tower of this.state.towers) {
            
            const towerGridPos = this.translator.isoToGrid(tower.position.x, tower.position.y);
            const dist = Math.hypot(towerGridPos.x - posX, towerGridPos.y - posY);
            if (dist < CONFIG.GRID_SIZE) return false;
        }
                
        return true;
    }
    // Game-over and reset functions
    gameOver() {
        this.state.gameOver = true;
        this.state.isPaused = true;
        gameOverWave.textContent = this.state.wave;
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

    // Game Loop
    update() {
        if (this.state.gameOver || this.state.victory || this.state.isLevelingUp) return;
        
        this.applyActiveUpgrades();
        this.state.entities.sort((a, b) => {
            return (b.position.y * CONFIG.COLS + b.position.x) - (a.position.y * CONFIG.COLS + a.position.x)
        });
        let entitiesToRemove = [];

        for( let i = this.state.entities.length - 1; i >= 0; i-- ) {
            let e = this.state.entities[i];
            let result = e.update();
            if( !result ) {               
                this.state.entities.splice(i, 1);
            }
            e.draw();
        }   

        this.entitiesToAdd.forEach((entity) => this.state.addEntity(entity));
        this.entitiesToAdd = [];
        // Update wave status
        this.updateWave();
        // Level Up check
        if (this.state.essence >= this.state.essenceToNextLevel && !this.state.isLevelingUp) {
            this.showUpgradeMenu();
        }
        
        // Game over check
        if (this.state.bloodCoreHP <= 0 && !this.state.gameOver) {
            this.gameOver();
        }      
    }

    // Draw function
    draw() {
                
        this.drawStats();  

        // Draw wave timer
        if (this.state.enemies.length === 0 && this.state.enemiesSpawned >= this.state.enemiesInWave && !this.state.victory) {
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
    // Drawing the path
    drawPath() {
        this.ctx.strokeStyle = 'rgba(100, 0, 0, 0.5)';
        this.ctx.lineWidth = 30;
        this.ctx.beginPath();
        this.ctx.moveTo(this.state.path[0].x, this.state.path[0].y);
        
        for (let i = 1; i < this.state.path.length; i++) {
            this.ctx.lineTo(this.state.path[i].x, this.state.path[i].y);
        }
        
        this.ctx.stroke();
        
        // Draw path borders
        this.ctx.strokeStyle = 'rgba(150, 0, 0, 0.7)';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.state.path[0].x, this.state.path[0].y - 15);
        for (let i = 1; i < this.state.path.length; i++) {
            this.ctx.lineTo(this.state.path[i].x, this.state.path[i].y - 15);
        }
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.state.path[0].x, this.state.path[0].y + 15);
        for (let i = 1; i < this.state.path.length; i++) {
            this.ctx.lineTo(this.state.path[i].x, this.state.this.state.path[i].y + 15);
        }
        this.ctx.stroke();
    }

    // Main Loop
    gameLoop() {
        this.mapRenderer.renderBG(this.state, { tileMap: this.state.tileMap, path: this.state.path });
        if (!this.state.isPaused) {
            this.update();
        } 
        this.mapRenderer.renderFG();
        this.draw();
    }

    addEntity(entity) {
        this.entitiesToAdd.push(entity);
    }
   
    async loadConfig() {
        let gameData = localStorage.getItem("objectTypes");
        if(gameData) {
            this.gameConfig = JSON.parse(gameData);            
            this.initEffectsAndUpgrades(); 
            return;
        }
        await fetch('game_config.json')
            .then(response => {
                if (!response.ok) throw new Error('File not found');
                return response.json();
            })
            .then(config => {
                this.gameConfig = config;    
                this.initEffectsAndUpgrades();                
            })
            .catch(error => {
                console.error('Error loading config:', error);
            });  
    }
    isPositionInCorner(x, y, cols, rows) {
        // Convert grid coordinates to relative positions (0 to 1 range)
        const relX = x / cols;
        const relY = y / rows;
        
        // In an isometric view, the diamond shape is defined by:
        // Top corner: (0.5, 0)
        // Right corner: (1, 0.5)
        // Bottom corner: (0.5, 1)
        // Left corner: (0, 0.5)
        
        // Calculate distance from the center line of the diamond
        const distFromDiagonal1 = Math.abs(relX + relY - 1);
        const distFromDiagonal2 = Math.abs(relX - relY);
        
        // If the point is far from both diagonals, it's in a corner
        const cornerThreshold = 0.2; // Adjust this value to control how much of the corners to fill
        return distFromDiagonal1 > cornerThreshold || distFromDiagonal2 > cornerThreshold;
    }
    reset() { 
        this.state.reset();
        this.uiManager.reset();
    }
    createProjectile(type, x, y, target, damage, isCritical, owner) {
        let ownerStats = owner.getComponent('stats').stats;
        let def = this.gameConfig.projectiles[type];
        let stats = {            
            speed: 5,
            damage: damage,
            isCritical: isCritical,
            piercing: ownerStats.piercing || 0,
            splashRadius: ownerStats.splashRadius || 0
        };

        let entity = new Entity(this, x, y);
        entity.addComponent(Stats, type, stats);
        if( def.customRenderer == "lightning" ) {
            entity.addRenderer(LightningRenderer, ownerStats);
            entity.addComponent(ChainProjectile, type, owner, target, stats );
        } else {
            entity.addRenderer(Renderer, this.imageManager.getImages("projectiles", type), 0);
            entity.addComponent(Animator, "projectiles", type);
            entity.addComponent(Projectile, type, owner, target, stats );
        }
        this.addEntity(entity);     
    }
    createTower(x, y, type, tracker="towers") {
        let stats = this.gameConfig.towers[type];
        let entity = new Entity(this, x, y);
        entity.addRenderer(Renderer, this.imageManager.getImages("towers", type), stats.drawOffsetY ? stats.drawOffsetY : 0 );
        entity.addComponent(Animator, "towers", type);
        entity.addComponent(Stats, type, stats);
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
        entity.addRenderer(Renderer, this.imageManager.getImages("towers", type),  stats.drawOffsetY ? stats.drawOffsetY : 0);
        entity.addComponent(Animator, "towers", type);
        entity.addRenderer(RangeIndicator);
        entity.addComponent(Stats, type, stats);
        entity.addComponent(Buildable);
        
        this.addEntity(entity);        
        return entity;
    }
    removeSummon(summon) {
        this.state.removeEntity(summon);
    }
    createSummon(x, y, type) {
        let stats = this.gameConfig.towers[type];
        let summon = this.createTower(x, y, type);
        summon.addComponent(LifeSpan, stats.lifeSpan);
    }
    createEnemy(spawnType = "") {        
        let normalTypes = [];
        let bossTypes = [];
        for(let type in this.gameConfig.enemies) {
            if(this.gameConfig.enemies[type].boss) {
                bossTypes.push(type);
            } else {
                normalTypes.push(type);
            }
        }

        let allTypes = {
            normal: normalTypes,
            boss: bossTypes
        }
        let typeArr = allTypes[spawnType];
        if(!typeArr) typeArr = allTypes.normal;    
        let type = typeArr[Math.floor(Math.random() * typeArr.length)];
     
        let stats = this.gameConfig.enemies[type];
        stats.hp *= 1 + (.01 * this.state.wave);
        let entity = new Entity(this, 0, 0);
        entity.addRenderer(Renderer, this.imageManager.getImages("enemies", type), stats.drawOffsetY ? stats.drawOffsetY : 0 );
        entity.addComponent(Animator, "enemies", type);
        entity.addComponent(Stats, type, stats);
        entity.addRenderer(Health);
        entity.addComponent(EssenceBounty);
        entity.addComponent(FollowPath);
        entity.addComponent(SpacialGridEntity);
        entity.addComponent(ArrayTracker, "enemies");
        this.addEntity(entity);
    }
    
    createEnvironmentObject(x, y, type, tracker="environment") {
        let stats = this.gameConfig.environment[type];
        let entity = new Entity(this, x, y);
        entity.addRenderer(Renderer, this.imageManager.getImages("environment", type), stats.drawOffsetY ? stats.drawOffsetY : 0 );
        entity.addComponent(Animator, "environment", type);
        entity.addComponent(Stats, type, stats);
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

}
export { Game };
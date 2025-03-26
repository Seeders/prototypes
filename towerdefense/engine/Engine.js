import { Entity } from "./Entity.js";
import { SpatialGrid } from "./SpatialGrid.js";
import { ImageManager } from "./ImageManager.js";
import { CoordinateTranslator } from './CoordinateTranslator.js';
import { MapRenderer } from "./MapRenderer.js";

class Engine {
    constructor() {
        this.entityId = 0;
        this.canvas = document.getElementById("gameCanvas");
        this.finalCtx = this.canvas.getContext("2d");
        this.canvasBuffer = document.createElement("canvas");
        this.ctx = this.canvasBuffer.getContext("2d");

        this.entitiesToAdd = [];
        
        this.currentTime = Date.now();
        this.lastTime = Date.now();
        this.deltaTime = 0;
    }

    async init(config) {
        this.gameConfig = config;
        
        this.canvasBuffer.setAttribute('width', this.gameConfig.configs.game.canvasWidth);
        this.canvasBuffer.setAttribute('height', this.gameConfig.configs.game.canvasHeight);
        this.canvas.setAttribute('width', this.gameConfig.configs.game.canvasWidth);
        this.canvas.setAttribute('height', this.gameConfig.configs.game.canvasHeight);
        
        this.translator = new CoordinateTranslator(this.gameConfig.configs.game, this.gameConfig.levels[this.state.currentLevel].tileMap.terrainMap.length);
        this.spatialGrid = new SpatialGrid(this.gameConfig.levels[this.state.currentLevel].tileMap.terrainMap.length, this.gameConfig.configs.game.gridSize);
        this.imageManager = new ImageManager(this.gameConfig.configs.game.imageSize);
     

        // Load all images
        for(let objectType in this.gameConfig) {
            await this.imageManager.loadImages(objectType, this.gameConfig[objectType]);
        }   
        
        this.mapRenderer = new MapRenderer(this.canvasBuffer, this.gameConfig.environment, this.imageManager, this.gameConfig.configs.game.level, this.gameConfig.configs.game, this.gameConfig.levels[this.state.currentLevel].tileMap.terrainBGColor );
   
        this.imageManager.dispose();
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.currentTime = Date.now();
    
        // Only update if a reasonable amount of time has passed
        const timeSinceLastUpdate = this.currentTime - this.lastTime;
        
        // Skip update if more than 1 second has passed (tab was inactive)
        if (timeSinceLastUpdate > 1000) {
            this.lastTime = this.currentTime; // Reset timer without updating
            return;
        }
        
        this.deltaTime = Math.min(1/30, timeSinceLastUpdate / 1000); // Cap at 1/30th of a second        
        this.lastTime = this.currentTime;
        
        if (this.state.gameOver || this.state.victory || this.state.isLevelingUp) return;
        
        // Sort entities by y position for proper drawing order
        this.state.entities.sort((a, b) => {
            return (b.position.y * this.state.tileMap.length + b.position.x) - (a.position.y * this.state.tileMap.length + a.position.x)
        });

        // Update all entities
        for(let i = this.state.entities.length - 1; i >= 0; i--) {
            let e = this.state.entities[i];
            let result = e.update();      
            if(!result) {               
                this.state.entities.splice(i, 1);
            }
            e.draw();
        }   
    
        // Add any new entities
        this.entitiesToAdd.forEach((entity) => this.state.addEntity(entity));
        this.entitiesToAdd = [];
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvasBuffer.width, this.canvasBuffer.height);
        this.finalCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.mapRenderer.renderBG(this.state, this.state.tileMapData, this.state.tileMap, this.state.paths, true);
        
        if (!this.state.isPaused) {
            this.update();
        } 
        
        this.mapRenderer.renderFG();
        this.drawUI();
        this.finalCtx.drawImage(this.canvasBuffer, 0, 0);
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
    stopGameLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    addEntity(entity) {
        this.entitiesToAdd.push(entity);
    }

    async loadConfig() {
        let gameData = localStorage.getItem("objectTypes");
        if(gameData) {
            return JSON.parse(gameData);
        }
        
        try {
            const response = await fetch('/config/game_config.json');
            if (!response.ok) throw new Error('File not found');
            return await response.json();
        } catch (error) {
            console.error('Error loading config:', error);
            return null;
        }
    }

    createEntity(x, y) {
        const entity = new Entity(this, x, y);
        return entity;
    }

    // Abstract UI drawing method to be implemented by subclasses
    drawUI() {
    }
}

export { Engine };
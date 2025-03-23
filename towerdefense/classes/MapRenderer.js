import { CONFIG } from "../config/config.js";

class MapRenderer {
    constructor(game) {        
        this.game = game;
        this.ctx = game.canvas.getContext('2d');
        this.selectedTowerType = null;
        this.hoverCell = { x: -1, y: -1 };
        this.showRange = false;
        this.isMapCached = false; // Flag to track if map needs redrawing
        
        // Create off-screen canvas for caching
        this.mapCacheCanvas = document.createElement('canvas');
        this.mapCacheCanvas.width = CONFIG.CANVAS_WIDTH;
        this.mapCacheCanvas.height = CONFIG.CANVAS_HEIGHT;
        this.mapCacheCtx = this.mapCacheCanvas.getContext('2d');

        
        this.envCacheCanvasBG = document.createElement('canvas');
        this.envCacheCanvasBG.width = CONFIG.CANVAS_WIDTH;
        this.envCacheCanvasBG.height = CONFIG.CANVAS_HEIGHT / 2;
        this.envCacheCtxBG = this.envCacheCanvasBG.getContext('2d');

        this.envCacheCanvasFG = document.createElement('canvas');
        this.envCacheCanvasFG.width = CONFIG.CANVAS_WIDTH;
        this.envCacheCanvasFG.height = CONFIG.CANVAS_HEIGHT / 2;
        this.envCacheCtxFG = this.envCacheCanvasFG.getContext('2d');
    }

    clearScreen() {        
        this.ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    // Call this when map data changes or on initialization
    cacheMap(tileMap, paths) {
        // Clear the cache canvas
        this.mapCacheCtx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Draw the map onto the cache canvas
        this.drawMap(tileMap, paths);
        
        // Mark cache as valid
        this.isMapCached = true;
    }

    renderBG(state, map) {
        this.clearScreen();
        
        // Generate cache if not already done
        if (!this.isMapCached) {
            this.cacheMap(map.tileMap, map.paths);
        }
        
        // Draw cached map image to main canvas
        this.ctx.drawImage(this.mapCacheCanvas, 0, 0);
        this.ctx.drawImage(this.envCacheCanvasBG, 0, 0);
    }
    renderFG() {  
        this.ctx.drawImage(this.envCacheCanvasFG, 0, CONFIG.CANVAS_HEIGHT / 2);
    }

    drawMap(tileMap, paths) {
        this.mapCacheCtx.fillStyle = '#4a7c59';
        this.mapCacheCtx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        const tileWidth = CONFIG.GRID_SIZE;
        const tileHeight = CONFIG.GRID_SIZE * 0.5;
        
        for (let y = 0; y < CONFIG.ROWS; y++) {
            for (let x = 0; x < CONFIG.COLS; x++) {
                const tile = tileMap[y][x];
                const isoX = (x - y) * (tileWidth / 2) + CONFIG.CANVAS_WIDTH / 2;
                const isoY = (x + y) * (tileHeight / 2);

                this.mapCacheCtx.fillStyle = tile.color;

                this.mapCacheCtx.beginPath();
                this.mapCacheCtx.moveTo(isoX, isoY);
                this.mapCacheCtx.lineTo(isoX + tileWidth / 2, isoY + tileHeight / 2);
                this.mapCacheCtx.lineTo(isoX, isoY + tileHeight);
                this.mapCacheCtx.lineTo(isoX - tileWidth / 2, isoY + tileHeight / 2);
                this.mapCacheCtx.closePath();
                this.mapCacheCtx.fill();

                this.mapCacheCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                this.mapCacheCtx.stroke();
            }
        }

        this.mapCacheCtx.strokeStyle = '#ffd166';
        this.mapCacheCtx.lineWidth = 2;
        this.mapCacheCtx.beginPath();
        
        paths.forEach(path => {
            const firstIsoX = (path[0].x - path[0].y) * (tileWidth / 2) + CONFIG.CANVAS_WIDTH / 2;
            const firstIsoY = (path[0].x + path[0].y) * (tileHeight / 2) + tileHeight / 2;
            this.mapCacheCtx.moveTo(firstIsoX, firstIsoY);

            path.forEach(location => {
                const isoX = (location.x - location.y) * (tileWidth / 2) + CONFIG.CANVAS_WIDTH / 2;
                const isoY = (location.x + location.y) * (tileHeight / 2) + tileHeight / 2;
                this.mapCacheCtx.lineTo(isoX, isoY);
            });
        });
        this.mapCacheCtx.stroke();
        this.drawEnvironment();
    }

    drawEnvironment() {

        let itemAmt = CONFIG.COLS * CONFIG.ROWS;
        let environmentTypes = [];
        for(let envType in this.game.gameConfig.environment){
            environmentTypes.push(envType);
        }
        let items = [];            
        for(let i = 0; i < itemAmt; i++) {
            // Define the game board boundaries
            const boardMinX = 0;
            const boardMaxX = CONFIG.COLS * CONFIG.GRID_SIZE;
            const boardMinY = 0;
            const boardMaxY = CONFIG.ROWS * CONFIG.GRID_SIZE;
            
            // Generate a random position that's outside the board but within a reasonable distance
            let x, y;
            
            // Expand the area where we can place objects
            const expandAmount = CONFIG.COLS * CONFIG.GRID_SIZE / 2; // Adjust this value as needed
            
            // Randomly choose whether to place on x-axis or y-axis outside the board
            if (Math.random() < 0.5) {
                // Place on the left or right of the board
                x = Math.random() < 0.5 ? 
                    boardMinX - Math.random() * expandAmount : // Left side
                    boardMaxX + Math.random() * expandAmount;  // Right side
                
                // Random y position with a bit of a buffer
                y = (boardMinY) + Math.random() * (boardMaxY - boardMinY);
            } else {
                // Place on the top or bottom of the board
                y = Math.random() < 0.5 ? 
                    boardMinY - Math.random() * expandAmount : // Top side
                    boardMaxY + Math.random() * expandAmount;  // Bottom side
                
                // Random x position with a bit of a buffer
                x = (boardMinX) + Math.random() * (boardMaxX - boardMinX);
            }
            
            // Double-check that the position is actually outside the board
            if (x < boardMinX || x > boardMaxX || y < boardMinY || y > boardMaxY) {
                const type = environmentTypes[Math.floor(Math.random() * environmentTypes.length)];
                const images = this.game.imageManager.getImages("environment", type);
                items.push( { img: images.idle[0][parseInt(Math.random()*images.idle[0].length)], x: x, y: y});
            } else {
                i--; // Position inside board, try again
            }
        }

        items.sort((a, b) => {
            return (a.y * CONFIG.COLS + a.x) - (b.y * CONFIG.COLS + b.x)
        });

        items.forEach((item) => {            
            // Convert pixel to isometric
            const isoPos = this.game.translator.pixelToIso(item.x, item.y);
            const image = item.img;
            const imgWidth = image.width;
            const imgHeight = image.height;
            
            const drawX = isoPos.x;
            const drawY = isoPos.y;
            if( drawY < CONFIG.CANVAS_HEIGHT / 2 ) {
                this.envCacheCtxBG.drawImage(image, drawX - imgWidth / 2, drawY - imgHeight / 2);
            } else if(drawY - CONFIG.CANVAS_HEIGHT / 2 - imgHeight / 2 > 0) {
                this.envCacheCtxFG.drawImage(image, drawX - imgWidth / 2, drawY - CONFIG.CANVAS_HEIGHT / 2 - imgHeight / 2);
            }
        });
    }
}
export { MapRenderer };
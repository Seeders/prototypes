import { CONFIG } from "../config/config.js";

class MapManager {
    generateMap(data) {
        // Extract values from the data object
        const { size, terrainTypes, terrainMap, path } = data;
        
        // Create the tile map using the provided terrainMap
        const tileMap = terrainMap.map((row, y) => 
            row.map((terrainType, x) => {
                // Find the terrain object to get color information
                const terrain = terrainTypes.find(t => t.type === terrainType);
                
                // Determine if this tile is buildable based on terrain type
                // Assuming only grass is buildable, but this can be customized
                const buildable = terrainType === 'grass';
                
                return { 
                    type: terrainType, 
                    color: terrain ? terrain.color : '#8bc34a', // Default to grass color if not found
                    buildable: buildable
                };
            })
        );
        if( !path || path.length == 0 ){
            path = this.generateRandomPath();
        }
        // Mark the path tiles
        path.forEach(p => {
            if (p.x >= 0 && p.x < size && p.y >= 0 && p.y < size) {
                tileMap[p.y][p.x].type = 'path';
                tileMap[p.y][p.x].buildable = false;
            }
        });
        
        // Mark the end of the path as the base
        const lastPoint = path[path.length - 1];
        if (lastPoint && lastPoint.x >= 0 && lastPoint.x < size && lastPoint.y >= 0 && lastPoint.y < size) {
            tileMap[lastPoint.y][lastPoint.x].type = 'base';
            tileMap[lastPoint.y][lastPoint.x].color = '#FF0000'; // Red color for base
        }
        
        return { tileMap, path };
    }

    generateRandomPath() {        
        let startX = 0;
        let startY = parseInt(CONFIG.ROWS / 2);
        let endX = CONFIG.COLS - 1;
        let endY = startY; 
        let yMin = 0;
        let yMax = CONFIG.ROWS - 1;
        // Initialize the path with the start point
        let currentX = startX;
        let currentY = startY;
        const path = [{ x: currentX, y: currentY }];

        // Track the current direction (right, up, or down)
        let currentDirection = "right"; // Start by moving right

        // Generate the path
        while (currentX != endX || currentY != endY) {
            // Define possible moves based on the current direction
            let moves = [];
            if (currentDirection === "right") {
                // If moving right, prioritize continuing right or turning up/down
                moves = [
                    { dx: 1, dy: 0 }, // Right
                    { dx: 0, dy: 1 }, // Up
                    { dx: 0, dy: -1 }, // Down
                ];

                //only move toward exit when on last column.
                if( currentX == endX && currentY > endY ) {
                    moves.splice(1, 1); 
                } else if( currentX == endX && currentY < endY ) {
                    moves.splice(2, 1);
                } else if (currentX == startX ) {
                    moves.splice(1, 2);//always go right first
                }
            } else if (currentDirection === "up" || currentDirection === "down") {
                // If moving up or down, prioritize continuing in that direction or turning right
                moves = [
                    { dx: 1, dy: 0 }, // Right
                    { dx: 0, dy: currentDirection === "up" ? 1 : -1 }, // Continue up/down
                ];
            }

            // Filter valid moves (stay within grid bounds and avoid backtracking)
            const validMoves = moves.filter(({ dx, dy }) => {
                const nextX = currentX + dx;
                const nextY = currentY + dy;
                return (
                    nextX >= startX &&
                    nextX <= endX &&
                    nextY >= yMin &&
                    nextY <= yMax &&
                    !path.some(point => point.x === nextX && point.y === nextY) // Avoid revisiting points
                );
            });
            if (validMoves.length > 0) {
                // Randomly select a valid move
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];

                // Update the current direction
                if (randomMove.dx === 1) {
                    currentDirection = "right"; // Moving right
                } else if (randomMove.dy === 1) {
                    currentDirection = "up"; // Moving up
                } else if (randomMove.dy === -1) {
                    currentDirection = "down"; // Moving down
                }

                // Update the current position
                currentX += randomMove.dx;
                currentY += randomMove.dy;

                // Add the new point to the path
                path.push({ x: currentX, y: currentY });
            } else {
                // No valid moves left (should not happen if grid is properly sized)
                break;
            }
        }

        return path;
    }

}
export { MapManager };
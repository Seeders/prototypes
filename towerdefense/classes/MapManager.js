import { CONFIG } from "../config/config.js";

class MapManager {
    generateMap() {
        const tileMap = Array(CONFIG.ROWS).fill().map(() =>
            Array(CONFIG.COLS).fill().map(() => ({ type: 'grass', tower: null, buildable: true }))
        );
        const path = this.generatePath();
        path.forEach(p => {
            if (p.x >= 0 && p.x < CONFIG.COLS && p.y >= 0 && p.y < CONFIG.ROWS) {
                tileMap[p.y][p.x].type = 'path';
                tileMap[p.y][p.x].buildable = false;
            }
        });
        tileMap[path[path.length - 1].y][path[path.length - 1].x].type = 'base';
        return { tileMap, path };
    }

    generatePath() {        
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
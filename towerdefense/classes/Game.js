import { Engine } from "../engine/Engine.js";

class Game extends Engine {
       // Tooltip system



    drawUI() {
        // To be implemented by game subclass
      
        //this.drawStats();  

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
        return;
  
    }

}
export { Game };
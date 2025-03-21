class UIManager { 
    constructor(gameConfig) {
        this.upgradeMenu = document.getElementById('upgradeMenu');
        this.upgradeOptionsDiv = document.getElementById('upgradeOptions');
        this.overlay = document.getElementById('overlay');
        this.tooltip = document.getElementById('tooltip');
        this.gameOverMenu = document.getElementById('gameOverMenu');
        this.victoryMenu = document.getElementById('victoryMenu');

        // Stats displays
        this.shardsDisplay = document.getElementById('shardsDisplay');
        this.essenceDisplay = document.getElementById('essenceDisplay');
        this.essenceNeededDisplay = document.getElementById('essenceNeededDisplay');
        this.populationDisplay = document.getElementById('populationDisplay');
        this.maxPopulationDisplay = document.getElementById('maxPopulationDisplay');
        this.hpDisplay = document.getElementById('hpDisplay');
        this.waveDisplay = document.getElementById('waveDisplay');
        this.waveProgress = document.getElementById('waveProgress');
        this.gameOverWave = document.getElementById('gameOverWave');
        this.towerMenu = document.getElementById('towerMenu');
        let towerMenuOptions = '';
        for(let type in gameConfig.towers) {
            if(gameConfig.towers[type].cost > 0){
                towerMenuOptions += `<div class="tower-option" data-type="${type}">${gameConfig.towers[type].title} (${gameConfig.towers[type].cost})</div>`;
            }
        }
        this.towerMenu.innerHTML = towerMenuOptions;
    }

    reset() {
        this.gameOverMenu.style.display = 'none';
        this.victoryMenu.style.display = 'none';
        this.overlay.style.display = 'none';
        this.waveDisplay.textContent = '1';
        this.waveProgress.style.width = '0%';        


    }

    updateWaveDisplay(waveNumber) {
        this.waveDisplay.textContent = waveNumber;
    }
}

export { UIManager };
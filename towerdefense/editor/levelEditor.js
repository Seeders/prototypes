import { CONFIG } from "../config/config.js";
import { MapManager } from "../classes/MapManager.js";
import { MapRenderer } from "../classes/MapRenderer.js";
import { ImageManager } from "../classes/ImageManager.js";
import { CoordinateTranslator } from "../classes/CoordinateTranslator.js";
(function() {
    // Grid configuration
    let gridSize = CONFIG.COLS;
    let currentTerrainType = 'grass';
    let isMouseDown = false;
    let tileMap = {
        size: 16,
        terrainTypes : [
            { type: "start", color: "#ffff00" },
            { type: "end", color: "#ff0000" },
            { type: "path", color: "#eeae9e" },
            { type: "grass", color: "#8bc34a" },
            { type: "water", color: "#64b5f6" },
            { type: "rock", color: "#9e9e9e" }
        ],
        terrainMap: []
    };    
    let environment = [];
    const canvasEl = document.getElementById('grid');
    let imageManager = new ImageManager();
    let mapRenderer = null;
    let mapManager = null;
    let translator = new CoordinateTranslator(tileMap.size);
        
    async function init() {
        setupTerrainTypesUI();
        setupEventListeners();
        updateTerrainStyles();
        await initGridCanvas();        
        // Apply initial terrain CSS
    }
    

    function setupTerrainTypesUI() {
        // Create the terrain types management UI
        const terrainsPanel = document.getElementById('terrainsPanel');
        
        // Clear existing content
        const existingColorPicker = terrainsPanel.querySelector('.terrain-types-container');
        if (existingColorPicker) {
            terrainsPanel.removeChild(existingColorPicker);
        }
        
        // Create new terrain types container
        const terrainTypesContainer = document.createElement('div');
        terrainTypesContainer.className = 'terrain-types-container';
        
        // Add terrain options from terrainTypes array
        tileMap.terrainTypes.forEach(terrain => {
            const terrainItem = document.createElement('div');
            terrainItem.className = 'terrain-item';
            
            // Color option
            const option = document.createElement('div');
            option.className = 'color-option';
            option.dataset.type = terrain.type;
            option.style.backgroundColor = terrain.color;
            
            // Set the first one as active by default (or current selected if updating)
            if (terrain.type === currentTerrainType) {
                option.classList.add('active');
            }
            
            // Add click event to select terrain
            option.addEventListener('click', function() {
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                this.classList.add('active');
                currentTerrainType = this.dataset.type;
            });
            
            // Label for the terrain type
            const label = document.createElement('div');
            label.className = 'terrain-label';
            label.textContent = terrain.type;
            
            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'terrain-buttons';
            
            // Add edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-terrain-btn';
            editBtn.innerHTML = '✏️';
            editBtn.title = 'Edit terrain';
            editBtn.addEventListener('click', () => {
                showTerrainEditForm(terrain);
            });
            buttonContainer.appendChild(editBtn);
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-terrain-btn';
            deleteBtn.innerHTML = '❌';
            deleteBtn.title = 'Delete terrain';
            deleteBtn.addEventListener('click', () => {
                deleteTerrain(terrain.type);
            });
            buttonContainer.appendChild(deleteBtn);
            
            // Assemble the terrain item
            terrainItem.appendChild(option);
            terrainItem.appendChild(label);
            terrainItem.appendChild(buttonContainer);
            
            terrainTypesContainer.appendChild(terrainItem);
        });
        
        // Add "Add New Terrain" button
        const addNewBtn = document.createElement('button');
        addNewBtn.className = 'add-terrain-btn';
        addNewBtn.innerHTML = '+ Add Terrain';
        addNewBtn.addEventListener('click', showAddTerrainForm);
        terrainTypesContainer.appendChild(addNewBtn);
        
        terrainsPanel.appendChild(terrainTypesContainer);
        
        // Create or update the terrain form (hidden by default)
        // Add form event listeners
        document.getElementById('saveTerrainBtn').addEventListener('click', saveTerrainType);
        document.getElementById('cancelTerrainBtn').addEventListener('click', hideTerrainForm);
    }
    
    function showAddTerrainForm() {
        const form = document.getElementById('terrainForm');
        form.classList.add('show');
        document.getElementById('formTitle').textContent = 'Add Terrain Type';
        document.getElementById('editingType').value = '';
        document.getElementById('terrainType').value = '';
        document.getElementById('terrainColor').value = '#cccccc';
        document.getElementById('terrainColorText').value = '#cccccc';        
        document.getElementById('terrainBuildable').checked = false;         
    }
    
    function showTerrainEditForm(terrain) {
        const form = document.getElementById('terrainForm');
        form.classList.add('show');
        document.getElementById('formTitle').textContent = 'Edit Terrain Type';
        document.getElementById('editingType').value = terrain.type;
        document.getElementById('terrainType').value = terrain.type;
        document.getElementById('terrainColor').value = terrain.color;
        document.getElementById('terrainColorText').value = terrain.color;
        document.getElementById('terrainBuildable').checked = terrain.buildable;
    }
    
    function hideTerrainForm() {
        document.getElementById('terrainForm').classList.remove('show');
    }
     
    function saveTerrainType() {
        const editingType = document.getElementById('editingType').value;
        const newType = document.getElementById('terrainType').value.trim();
        const newColor = document.getElementById('terrainColorText').value;
        const newBuildable = document.getElementById('terrainBuildable').checked;
        
        if (!newType) {
            alert('Terrain type cannot be empty');
            return;
        }
        
        if (editingType) {
            // Editing existing terrain
            const index = tileMap.terrainTypes.findIndex(t => t.type === editingType);
            if (index !== -1) {
                // If type name is changing, update all map references
                if (editingType !== newType) {
                    // Check if new type name already exists
                    if (tileMap.terrainTypes.some(t => t.type === newType)) {
                        alert('A terrain type with this name already exists');
                        return;
                    }
                    
                    // Update terrainMap
                    for (let y = 0; y < tileMap.terrainMap.length; y++) {
                        for (let x = 0; x < tileMap.terrainMap[y].length; x++) {
                            if (tileMap.terrainMap[y][x] === editingType) {
                                tileMap.terrainMap[y][x] = newType;
                            }
                        }
                    }
                    
                    // Update current terrain type if selected
                    if (currentTerrainType === editingType) {
                        currentTerrainType = newType;
                    }
                }
                
                // Update the terrain type
                tileMap.terrainTypes[index] = { type: newType, color: newColor, buildable: newBuildable };
            }
        } else {
            // Adding new terrain
            // Check if type already exists
            if (tileMap.terrainTypes.some(t => t.type === newType)) {
                alert('A terrain type with this name already exists');
                return;
            }
            
            // Add new terrain type
            tileMap.terrainTypes.push({ type: newType, color: newColor, buildable: newBuildable });
        }
        
        // Update UI and CSS
        updateTerrainStyles();
        setupTerrainTypesUI();
        hideTerrainForm();        

        // Update canvas rendering
        updateCanvasWithData();
        
        // Export updated map
        exportMap();
    }
    
    function deleteTerrain(typeToDelete) {
        // Don't allow deleting if it's the last terrain type
        if (tileMap.terrainTypes.length <= 1) {
            alert('Cannot delete the last terrain type');
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the "${typeToDelete}" terrain type? All instances will be converted to grass.`)) {
            return;
        }
        
        // Find the default terrain to replace with (grass or first available)
        const defaultType = tileMap.terrainTypes.find(t => t.type === 'grass') || tileMap.terrainTypes[0];
        
        // Remove from terrainTypes array
        const index = tileMap.terrainTypes.findIndex(t => t.type === typeToDelete);
        if (index !== -1) {
            tileMap.terrainTypes.splice(index, 1);
        }
        
        // Update terrainMap - replace all instances with defaultType
        for (let y = 0; y < tileMap.terrainMap.length; y++) {
            for (let x = 0; x < tileMap.terrainMap[y].length; x++) {
                if (tileMap.terrainMap[y][x] === typeToDelete) {
                    tileMap.terrainMap[y][x] = defaultType.type;
                }
            }
        }
        
        // Update current terrain type if selected
        if (currentTerrainType === typeToDelete) {
            currentTerrainType = defaultType.type;
        }
        
        // Update UI and CSS
        updateTerrainStyles();
        setupTerrainTypesUI();
        
        // Update canvas rendering
        updateCanvasWithData();
        
        // Export updated map
        exportMap();
    }
    
    function updateTerrainStyles() {
        // Create or update the style element for terrain colors
        let styleElem = document.getElementById('terrainStyles');
        if (!styleElem) {
            styleElem = document.createElement('style');
            styleElem.id = 'terrainStyles';
            document.head.appendChild(styleElem);
        }
        
        // Generate CSS for each terrain type
        let css = '';
        tileMap.terrainTypes.forEach(terrain => {
            css += `#level-editor-container .color-option.${terrain.type} { background-color: ${terrain.color}; }\n`;
        });
        
        styleElem.textContent = css;
    }
    
    function setupEventListeners() {
        document.getElementById('terrainColor').addEventListener('change', function(el) {                    
            document.getElementById('terrainColorText').value = el.target.value;
        });
        document.getElementById('terrainMapSize').addEventListener('change', function(ev) {    
            const newGridSize = parseInt(ev.target.value);
            const oldGridSize = tileMap.size;
            
            // Create a new map to hold the resized terrain
            const newTerrainMap = [];
            for (let i = 0; i < newGridSize; i++) {
                newTerrainMap.push(new Array(newGridSize));
            }
            
            // Calculate offsets for maintaining center
            // For both increasing and decreasing size
            const oldOffset = Math.floor(oldGridSize / 2);
            const newOffset = Math.floor(newGridSize / 2);
            
            // Fill the new map
            for (let newI = 0; newI < newGridSize; newI++) {
                for (let newJ = 0; newJ < newGridSize; newJ++) {
                    // Calculate absolute coordinates (relative to center)
                    const absI = newI - newOffset;
                    const absJ = newJ - newOffset;
                    
                    // Calculate source coordinates in old map
                    const oldI = absI + oldOffset;
                    const oldJ = absJ + oldOffset;
                    
                    // Check if source coordinates are within old map boundaries
                    if (oldI >= 0 && oldI < oldGridSize && oldJ >= 0 && oldJ < oldGridSize) {
                        // Copy existing terrain
                        newTerrainMap[newI][newJ] = tileMap.terrainMap[oldI][oldJ];
                    } else {
                        // Use nearest edge value for new areas
                        const clampedI = Math.max(0, Math.min(oldGridSize - 1, oldI));
                        const clampedJ = Math.max(0, Math.min(oldGridSize - 1, oldJ));
                        newTerrainMap[newI][newJ] = tileMap.terrainMap[clampedI][clampedJ];
                    }
                }
            }
            
            // Update tileMap with new terrain
            tileMap.terrainMap = newTerrainMap;
            tileMap.size = newGridSize;
            translator = new CoordinateTranslator(newGridSize);
            
            updateTerrainStyles();
            setupTerrainTypesUI();
            initGridCanvas();
            exportMap();
        });
        
        // Handle mouseup event (stop dragging)
        document.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        // Add mouse down event for canvas
        canvasEl.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            handleCanvasInteraction(e);
        });
        
        // Add mouse move event for drawing while dragging
        canvasEl.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                handleCanvasInteraction(e);
            }
        });
        // Add event listeners
        document.getElementById('translate-left').addEventListener('click', () => translateMap(-1, 0));
        document.getElementById('translate-right').addEventListener('click', () => translateMap(1, 0));
        document.getElementById('translate-up').addEventListener('click', () => translateMap(0, -1));
        document.getElementById('translate-down').addEventListener('click', () => translateMap(0, 1));
    
        // Handle editTileMap event
        document.body.addEventListener('editTileMap', (event) => {

            environment = event.detail.environment;
            canvasEl.width = CONFIG.CANVAS_WIDTH;
            canvasEl.height = CONFIG.CANVAS_HEIGHT;
            tileMap = event.detail.tileMap;
            mapRenderer = new MapRenderer(canvasEl, environment, imageManager);
                // Update grid size if it's different
            if (tileMap.size && tileMap.size !== gridSize) {
                gridSize = tileMap.size;
                translator = new CoordinateTranslator(gridSize);
            } else {
                gridSize = CONFIG.COLS;
                translator = new CoordinateTranslator(gridSize);
            }
            document.getElementById('terrainMapSize').value = gridSize;
            
            // Load terrain types if provided
            updateTerrainStyles();
            setupTerrainTypesUI();
            initGridCanvas();
    
        });
    }    
    function translateMap(deltaX, deltaY) {
        const gridSize = tileMap.size;
        
        // Create a new map to hold the translated terrain
        const newTerrainMap = [];
        for (let i = 0; i < gridSize; i++) {
            newTerrainMap.push(new Array(gridSize));
        }
        
        // Fill the new map
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                // Calculate source coordinates in old map
                const oldI = i - deltaY;
                const oldJ = j - deltaX;
                
                // Check if source coordinates are within map boundaries
                if (oldI >= 0 && oldI < gridSize && oldJ >= 0 && oldJ < gridSize) {
                    // Copy existing terrain
                    newTerrainMap[i][j] = tileMap.terrainMap[oldI][oldJ];
                } else {
                    // For areas that would be outside the original map,
                    // use the nearest edge value (wrap around)
                    const clampedI = Math.max(0, Math.min(gridSize - 1, oldI));
                    const clampedJ = Math.max(0, Math.min(gridSize - 1, oldJ));
                    newTerrainMap[i][j] = tileMap.terrainMap[clampedI][clampedJ];
                }
            }
        }
        
        // Update tileMap with new terrain
        tileMap.terrainMap = newTerrainMap;
        
        // Update UI and export
        initGridCanvas();
        exportMap();
    }
    async function initGridCanvas() {
        // Initialize the canvas with our map renderer
        canvasEl.width = CONFIG.CANVAS_WIDTH;
        canvasEl.height = CONFIG.CANVAS_HEIGHT;
        imageManager = new ImageManager();
        
        // Initialize the map renderer
        if (!mapRenderer) {
            mapRenderer = new MapRenderer(canvasEl, environment, imageManager);
        }
        
        // Load images for environment
        await imageManager.loadImages("environment", environment);        
        
        // Render the initial map
        updateCanvasWithData();
        // Clean up resources
        imageManager.dispose();
    }
    
    // Handle canvas click/drag for terrain placement
    function handleCanvasInteraction(event) {
        // Get mouse position relative to canvas
        const rect = canvasEl.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Convert from isometric to grid coordinates
        const gridPos = translator.isoToGrid(mouseX, mouseY);
        
        // Snap to grid
        const snappedGrid = translator.snapToGrid(gridPos.x, gridPos.y);
        
        // Check if coordinates are within bounds
        if (snappedGrid.x >= 0 && snappedGrid.x < gridSize && 
            snappedGrid.y >= 0 && snappedGrid.y < gridSize) {
            
            // Update terrain map with selected terrain type
            tileMap.terrainMap[snappedGrid.y][snappedGrid.x] = currentTerrainType;
            
            // Update the map rendering
            updateCanvasWithData();
            
            // Export the updated map
            exportMap();
        }
    }

    function updateCanvasWithData(){

        mapManager = new MapManager();
        mapRenderer.isMapCached = false;
        let map = mapManager.generateMap(tileMap);
        mapRenderer.renderBG({}, { tileMap: map.tileMap, paths: [] });
        mapRenderer.renderFG();
    }
    
    // Export the current map as JSON
    function exportMap() {
        
        // Create a custom event with data
        const myCustomEvent = new CustomEvent('saveTileMap', {
            detail: tileMap,
            bubbles: true,
            cancelable: true
        });

        // Dispatch the event
        document.body.dispatchEvent(myCustomEvent);
    }
    
    init();
})();
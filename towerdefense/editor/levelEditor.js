import { MapManager } from "../engine/MapManager.js";
import { MapRenderer } from "../engine/MapRenderer.js";
import { ImageManager } from "../engine/ImageManager.js";
import { CoordinateTranslator } from "../engine/CoordinateTranslator.js";
(function() {
    // Grid configuration
    const defaultMapSize = 16;
    let mapSize = defaultMapSize;
    let currentTerrainType = 'grass';
    let isMouseDown = false;
    let config = {
        gridSize: 48,
        imageSize: 128,
        canvasWidth: 1536, 
        canvasHeight: 768
    };
    let tileMap = {
        size: 16,
        terrainTypes : [
            { type: "start", color: "#ffff00", image: [] },
            { type: "end", color: "#ff0000", image: [] },
            { type: "path", color: "#eeae9e", image: [] },
            { type: "grass", color: "#8bc34a", image: [] },
            { type: "water", color: "#64b5f6", image: [] },
            { type: "rock", color: "#9e9e9e", image: [] }
        ],
        terrainMap: []
    };    
    let environment = [];
    let terrainTypesContainer;
    const canvasEl = document.getElementById('grid');
    let imageManager = new ImageManager(config.imageSize);
    let mapRenderer = null;
    let mapManager = null;
    let translator = new CoordinateTranslator(config, tileMap.size);
    let draggedItem = null;    
    async function init() {
        setupTerrainTypesUI();
        setupEventListeners();
        updateTerrainStyles();   
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
        terrainTypesContainer = document.createElement('div');
        terrainTypesContainer.className = 'terrain-types-container';
        
        // Add terrain options from terrainTypes array
        tileMap.terrainTypes.forEach(terrain => {
            const terrainItem = document.createElement('div');
            terrainItem.className = 'terrain-item';
            terrainItem.draggable = true; // Make the item draggable
            
            // Add drag event listeners
            terrainItem.addEventListener('dragstart', handleDragStart);
            terrainItem.addEventListener('dragover', handleDragOver);
            terrainItem.addEventListener('drop', handleDrop);
            terrainItem.addEventListener('dragend', handleDragEnd);
            
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
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        this.style.opacity = '0.4';
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    
    function handleDrop(e) {
        e.preventDefault();
        if (draggedItem !== this) {
            // Swap the positions in the DOM
            const allItems = Array.from(terrainTypesContainer.querySelectorAll('.terrain-item'));
            const draggedIndex = allItems.indexOf(draggedItem);
            const dropIndex = allItems.indexOf(this);
    
            // Update the terrainTypes array
            const temp = tileMap.terrainTypes[draggedIndex];
            tileMap.terrainTypes[draggedIndex] = tileMap.terrainTypes[dropIndex];
            tileMap.terrainTypes[dropIndex] = temp;
    
            // Update the DOM
            if (draggedIndex < dropIndex) {
                this.parentNode.insertBefore(draggedItem, this.nextSibling);
            } else {
                this.parentNode.insertBefore(draggedItem, this);
            }
            exportMap() 
        }
        return false;
    }
    
    function handleDragEnd(e) {
        this.style.opacity = '1';
        draggedItem = null;
    }
    
    function showAddTerrainForm() {
        const form = document.getElementById('terrainForm');
        form.classList.add('show');
        document.getElementById('formTitle').textContent = 'Add Terrain Type';
        document.getElementById('editingType').value = '';
        document.getElementById('terrainType').value = '';
        document.getElementById('terrainColor').value = '#cccccc';
        document.getElementById('terrainColorText').value = '#cccccc';  
        document.getElementById('terrainImage').value = '[]';        
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
        document.getElementById('terrainImage').value = JSON.stringify(terrain.image || []);   
        document.getElementById('terrainBuildable').checked = terrain.buildable;
        // Create a custom event with data
        const myCustomEvent = new CustomEvent('editTerrainImage', {
            bubbles: true,
            cancelable: true
        });

        // Dispatch the event
        document.body.dispatchEvent(myCustomEvent);
    }
    
    function hideTerrainForm() {
        document.getElementById('terrainForm').classList.remove('show');
    }
     
    function saveTerrainType() {
        const editingType = document.getElementById('editingType').value;
        const newType = document.getElementById('terrainType').value.trim();
        const newColor = document.getElementById('terrainColorText').value;
        const newImage = JSON.parse(document.getElementById('terrainImage').value);
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
                tileMap.terrainTypes[index] = { type: newType, color: newColor, image: newImage, buildable: newBuildable };
            }
        } else {
            // Adding new terrain
            // Check if type already exists
            if (tileMap.terrainTypes.some(t => t.type === newType)) {
                alert('A terrain type with this name already exists');
                return;
            }
            
            // Add new terrain type
            tileMap.terrainTypes.push({ type: newType, color: newColor, image: newImage, buildable: newBuildable });
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
            translator = new CoordinateTranslator(config, newGridSize);
            
            updateTerrainStyles();
            setupTerrainTypesUI();
            initGridCanvas();
            exportMap();
        });
        document.getElementById('terrainBGColor').addEventListener('change', function(ev) {
            tileMap.terrainBGColor = ev.target.value;
            canvasEl.backgroundColor = ev.target.value;
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
            config = event.detail.config;
            canvasEl.width = event.detail.config.canvasWidth;
            canvasEl.height = event.detail.config.canvasHeight;
            environment = event.detail.environment;
            tileMap = event.detail.tileMap;
            let bgColor = tileMap.terrainBGColor || "#7aad7b";
            document.getElementById('terrainBGColor').value = bgColor;
            canvasEl.backgroundColor = bgColor;
            imageManager.loadImages("levels", { level: { tileMap: tileMap }});
            mapRenderer = new MapRenderer(canvasEl, environment, imageManager, 'level', event.detail.config, bgColor);
                // Update grid size if it's different
            if (tileMap.size && tileMap.size !== mapSize) {
                mapSize = tileMap.size;
                translator = new CoordinateTranslator(config, mapSize);
            } else {
                mapSize = defaultMapSize;
                translator = new CoordinateTranslator(config, mapSize);
            }
            document.getElementById('terrainMapSize').value = mapSize;
            
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
        imageManager = new ImageManager(config.imageSize);
      
        await imageManager.loadImages("environment", environment);
        await imageManager.loadImages("levels", { level: { tileMap: tileMap }});
        
        // Initialize the map renderer
        if (!mapRenderer) {
            mapRenderer = new MapRenderer(canvasEl, environment, imageManager, 'level', config, tileMap.terrainBGColor);
        }
      
        
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
        if (snappedGrid.x >= 0 && snappedGrid.x < mapSize && 
            snappedGrid.y >= 0 && snappedGrid.y < mapSize) {
            
            // Update terrain map with selected terrain type
            tileMap.terrainMap[snappedGrid.y][snappedGrid.x] = currentTerrainType;
            
            // Update the map rendering
            updateCanvasWithData();
            
            // Export the updated map
            exportMap();
        }
    }

    function updateCanvasWithData() {
        if(tileMap.terrainMap.length > 0){
            mapManager = new MapManager();
            mapRenderer.isMapCached = false;
            let map = mapManager.generateMap(tileMap);
            mapRenderer.renderBG({}, tileMap, map.tileMap, [], true);
        }
        //mapRenderer.renderFG();
      
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
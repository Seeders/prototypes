import { CONFIG } from "../config/config.js";

(function() {
    // Grid configuration
    let gridSize = CONFIG.COLS;
    let currentTerrainType = 'grass';
    let isMouseDown = false;
    let terrainMap = []; // 2D array for terrain data [y][x] = 'terrainType'
    
    // Terrain types system
    let terrainTypes = [
        { type: "start", color: "#ffff00" },
        { type: "end", color: "#ff0000" },
        { type: "path", color: "#eeae9e" },
        { type: "grass", color: "#8bc34a" },
        { type: "water", color: "#64b5f6" },
        { type: "rock", color: "#9e9e9e" }
    ];
    
    function init() {
        setupTerrainTypesUI();
        setupEventListeners();
        initTerrainMap();
        initGrid();
    }
    
    function initTerrainMap() {
        // Initialize a 2D array filled with 'grass'
        terrainMap = Array(gridSize).fill().map(() => Array(gridSize).fill('grass'));
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
        terrainTypes.forEach(terrain => {
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
            const index = terrainTypes.findIndex(t => t.type === editingType);
            if (index !== -1) {
                // If type name is changing, update all map references
                if (editingType !== newType) {
                    // Check if new type name already exists
                    if (terrainTypes.some(t => t.type === newType)) {
                        alert('A terrain type with this name already exists');
                        return;
                    }
                    
                    // Update terrainMap
                    for (let y = 0; y < terrainMap.length; y++) {
                        for (let x = 0; x < terrainMap[y].length; x++) {
                            if (terrainMap[y][x] === editingType) {
                                terrainMap[y][x] = newType;
                            }
                        }
                    }
                    
                    // Update grid UI
                    document.querySelectorAll(`.cell.${editingType}`).forEach(cell => {
                        cell.classList.remove(editingType);
                        cell.classList.add(newType);
                        cell.dataset.type = newType;
                    });
                    
                    // Update current terrain type if selected
                    if (currentTerrainType === editingType) {
                        currentTerrainType = newType;
                    }
                }
                
                // Update the terrain type
                terrainTypes[index] = { type: newType, color: newColor, buildable: newBuildable };
            }
        } else {
            // Adding new terrain
            // Check if type already exists
            if (terrainTypes.some(t => t.type === newType)) {
                alert('A terrain type with this name already exists');
                return;
            }
            
            // Add new terrain type
            terrainTypes.push({ type: newType, color: newColor, buildable: newBuildable });
        }
        
        // Update UI and CSS
        updateTerrainStyles();
        setupTerrainTypesUI();
        hideTerrainForm();
        
        // Export updated map
        exportMap();
    }
    
    function deleteTerrain(typeToDelete) {
        // Don't allow deleting if it's the last terrain type
        if (terrainTypes.length <= 1) {
            alert('Cannot delete the last terrain type');
            return;
        }
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the "${typeToDelete}" terrain type? All instances will be converted to grass.`)) {
            return;
        }
        
        // Find the default terrain to replace with (grass or first available)
        const defaultType = terrainTypes.find(t => t.type === 'grass') || terrainTypes[0];
        
        // Remove from terrainTypes array
        const index = terrainTypes.findIndex(t => t.type === typeToDelete);
        if (index !== -1) {
            terrainTypes.splice(index, 1);
        }
        
        // Update terrainMap - replace all instances with defaultType
        for (let y = 0; y < terrainMap.length; y++) {
            for (let x = 0; x < terrainMap[y].length; x++) {
                if (terrainMap[y][x] === typeToDelete) {
                    terrainMap[y][x] = defaultType.type;
                }
            }
        }
        
        // Update grid UI
        document.querySelectorAll(`.cell.${typeToDelete}`).forEach(cell => {
            cell.classList.remove(typeToDelete);
            cell.classList.add(defaultType.type);
            cell.dataset.type = defaultType.type;
        });
        
        // Update current terrain type if selected
        if (currentTerrainType === typeToDelete) {
            currentTerrainType = defaultType.type;
        }
        
        // Update UI and CSS
        updateTerrainStyles();
        setupTerrainTypesUI();
        
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
        terrainTypes.forEach(terrain => {
            css += `#level-editor-container .cell.${terrain.type} { background-color: ${terrain.color}; }\n`;
        });
        
        styleElem.textContent = css;
    }
    
    function setupEventListeners() {
    
        document.getElementById('terrainColor').addEventListener('change', function(el) {                    
        document.getElementById('terrainColorText').value = el.target.value;
    });
    // Handle mouseup event (stop dragging)
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    // Handle editTileMap event
    document.body.addEventListener('editTileMap', (event) => {
        const tileMap = event.detail;
        if (tileMap) {
            loadTileMap(tileMap);
        }
    });
    
    // Apply initial terrain CSS
    updateTerrainStyles();
    }
    
    // Function to load an existing tile map into the editor
    function loadTileMap(tileMap) {
    // Update grid size if it's different
    if (tileMap.size && tileMap.size !== gridSize) {
        gridSize = tileMap.size;
        initTerrainMap();
        initGrid();
    }
    
    // Load terrain types if provided
    if (tileMap.terrainTypes && Array.isArray(tileMap.terrainTypes)) {
        terrainTypes = [...tileMap.terrainTypes];
        updateTerrainStyles();
        setupTerrainTypesUI();
    }
    
    // Load terrain data
    if (tileMap.terrainMap && Array.isArray(tileMap.terrainMap)) {
        terrainMap = tileMap.terrainMap;
    }
        
    // Update grid visuals to match data
    updateGridFromData();
}
    
    // Update the visual grid to match the data structures
    function updateGridFromData() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        
        // Reset cell class
        cell.className = 'cell';        

        // Apply terrain type
        const terrainType = terrainMap[y][x];
        cell.classList.add(terrainType);
        cell.dataset.type = terrainType;
        
    });
}
    
    // Initialize the grid
    function initGrid() {
        const grid = document.getElementById('grid');
        grid.innerHTML = '';
        grid.style.gridTemplateColumns = `repeat(${gridSize}, 30px)`; // Fixed width columns
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell grass';
                cell.dataset.index = y * gridSize + x;
                cell.dataset.y = y;
                cell.dataset.x = x;
                cell.dataset.type = 'grass';
                
                cell.addEventListener('mousedown', () => {
                    isMouseDown = true;
                    handleCellInteraction(cell);
                });
                
                cell.addEventListener('mouseenter', () => {
                    if (isMouseDown) {
                        handleCellInteraction(cell);
                    }
                });
                
                grid.appendChild(cell);
            }
        }
    }
    
    // Handle cell click/drag based on selected tool
    function handleCellInteraction(cell) {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        

        // Apply the selected terrain type
        cell.className = 'cell';
        cell.classList.add(currentTerrainType);
        cell.dataset.type = currentTerrainType;
        
        // Update terrain map
        terrainMap[y][x] = currentTerrainType;   

        exportMap();
    }
    
    // Export the current map as JSON
    function exportMap() {
        const map = {
            size: gridSize,
            terrainTypes: terrainTypes,
            terrainMap: terrainMap
        };
        
        const tileMap = JSON.stringify(map, null, 2);
        
        // Create a custom event with data
        const myCustomEvent = new CustomEvent('saveTileMap', {
            detail: map,
            bubbles: true,
            cancelable: true
        });

        // Dispatch the event
        document.body.dispatchEvent(myCustomEvent);
    }    
    init();
})();
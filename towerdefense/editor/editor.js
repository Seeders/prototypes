
(function() {
    /**
     * Game Config Editor
     * A tool for creating and editing configurations for games
     */
    
    // Configuration constants
    const CONFIG = {
        GRID_SIZE: 40,
        DEFAULT_TOWER_SIZE: 30,
        DEFAULT_TOWER_COLOR: '#ffffff',
        DEFAULT_RENDER: {animations:{idle:[{shapes:[]}]}}
    };
    let threeJsCamera = null;
    let currentCameraLocation = 0;
    
    const cameraDistance = 96;
    let cameraLocations = [ 
        { x: cameraDistance, y: cameraDistance, z: cameraDistance },
        { x: cameraDistance, y: cameraDistance, z: -cameraDistance },
        { x: -cameraDistance, y: cameraDistance, z: -cameraDistance },
        { x: -cameraDistance, y: cameraDistance, z: cameraDistance }
    ];

    //const threeJsContext = setupThreeJsRenderer('three-js-container');
    // Application state changes
    const state = {
        objectTypes: {
            towers: {},
            enemies: {},
            projectiles: {}
        },
        objectTypeDefinitions: [
            { id: 'towers', name: 'Towers', singular: 'Tower' },
            { id: 'enemies', name: 'Enemies', singular: 'Enemy' },
            { id: 'projectiles', name: 'Projectiles', singular: 'Projectile' },
            { id: 'environment', name: 'Environment', singular: 'Environment' }
        ],
        selectedType: 'towers',
        selectedObject: null,
        isDragging: false,
        objectPosition: { x: 300, y: 120 }
    };
    // Cache DOM elements
    const elements = {
        objectList: document.getElementById('object-list'),
        editor: document.getElementById('editor'),
        previewCanvas: document.getElementById('preview-canvas'),
        gridDisplay: document.getElementById('grid-display'),
        importExportModal: document.getElementById('import-export-modal'),
        importTextarea: document.getElementById('import-textarea'),
        exportTextarea: document.getElementById('export-textarea'),
        newObjectModal: document.getElementById('new-object-modal'),
        newObjectIdInput: document.getElementById('new-object-id'),
        newObjectNameInput: document.getElementById('new-object-name'),
        duplicateObjectModal: document.getElementById('duplicate-object-modal'),
        duplicateObjectIdInput: document.getElementById('duplicate-object-id'),
        duplicateObjectNameInput: document.getElementById('duplicate-object-name'),
        tabs: document.querySelectorAll('.tab'),
        rotateLeftBtn: document.getElementById('rotateLeftBtn'),
        rotateRightBtn: document.getElementById('rotateRightBtn'),
        clearDrawingBtn: document.getElementById('clearDrawingBtn'),
        colorPicker: document.getElementById('colorPicker'),
        sizeSlider: document.getElementById('sizeSlider'),
        terrainEditorContainer: document.getElementById('level-editor-container'),
        graphicsEditorContainer: document.getElementById('graphics-editor-container')
    };
    let drawingState = {
        currentShape: 'circle',
        currentColor: '#000000',
        currentSize: 32,
        isDrawing: false
    };
    function getSingularType(typeId) {
        const typeDef = state.objectTypeDefinitions.find(t => t.id === typeId);
        return typeDef ? typeDef.singular : typeId.slice(0, -1);
    }

    // Add this function to get the plural form of a type
    function getPluralType(typeId) {
        const typeDef = state.objectTypeDefinitions.find(t => t.id === typeId);
        return typeDef ? typeDef.name : typeId;
    }
    // HTML for object type selection in sidebar
    function renderTypeSelector() {
        let html = `<h2>Object Types</h2>
                    <div class="type-selector">`;
        
        state.objectTypeDefinitions.forEach(type => {
            html += `<div class="object-item ${state.selectedType === type.id ? 'selected' : ''}" data-type="${type.id}">${type.name}</div>`;
        });
        
        html += `</div>
                <div class="type-actions">
                    <button id="add-type-btn" class="small-btn">Add Type</button>
                    ${state.objectTypeDefinitions.length > 1 ? `<button id="remove-type-btn" class="small-btn danger">Remove Type</button>` : ''}
                </div>
                <h2>${getPluralType(state.selectedType)}</h2>`;
        
        return html;
    }        
    // Replace renderTowerList function
    function renderObjectList() {
        // Add type selector
        elements.objectList.innerHTML = renderTypeSelector();
        
        // Add objects of the selected type
        Object.keys(state.objectTypes[state.selectedType] || {}).forEach(objId => {
            const objectItem = document.createElement('div');
            objectItem.className = `object-item ${state.selectedObject === objId ? 'selected' : ''}`;
            objectItem.textContent = objId;
            objectItem.addEventListener('click', () => selectObject(objId));
            elements.objectList.appendChild(objectItem);
        });
        
        // Add event listeners for type selection
        document.querySelectorAll('.type-selector .object-item').forEach(item => {
            item.addEventListener('click', () => {
                state.selectedType = item.dataset.type;
                state.selectedObject = null;
                renderObjectList();
                renderEditor();
                renderPreview();
                updateSidebarButtons();
                let objects = state.objectTypes[state.selectedType];
                for(let objectType in objects) {                 
                    selectObject(objectType);
                    break;                 
                }
            });
        });
        
        // Add event listeners for type actions
        document.getElementById('add-type-btn')?.addEventListener('click', showAddTypeModal);
        document.getElementById('remove-type-btn')?.addEventListener('click', showRemoveTypeModal);
    }
    
    // Replace selectTower function
    function selectObject(objId) {
        state.selectedObject = objId;
        renderObjectList();
        renderEditor();
        renderPreview();
        updateMainContent();
    }
    
    // Update the editor UI
    function renderEditor() {
        const singularType = getSingularType(state.selectedType); // Remove 's' to get singular
        
        if (!state.selectedObject) {
            elements.editor.innerHTML = `
                <div class="instructions">
                    Select a ${singularType} from the sidebar or create a new one to start editing.
                </div>
            `;
            return;
        }
        
        elements.editor.innerHTML = `
            <h2>Editing: ${state.selectedObject} (${singularType})</h2>
            
            <div class="tab-content active" id="advanced-tab">  
                <h3>Properties</h3>
                <div class="property-list" id="custom-properties">
                    <!-- Custom properties will be rendered here -->
                </div>
                <button id="add-property-btn" style="margin-top: 10px;">Add Custom Property</button>
            </div>
            
            <div class="actions">
                <div>
                    <button class="primary" id="save-object-btn">Save ${singularType}</button>
                    <button id="revert-changes-btn">Revert Changes</button>
                </div>
                <button class="danger" id="delete-object-btn">Delete ${singularType}</button>
            </div>
        `;
        
        // Setup property editor
        const customPropertiesContainer = document.getElementById('custom-properties');
        renderCustomProperties(customPropertiesContainer, state.objectTypes[state.selectedType][state.selectedObject]);
        
        // Add event listeners for editor controls
        document.getElementById('add-property-btn').addEventListener('click', () => {
            addCustomProperty(customPropertiesContainer, '', '');
        });
        
        document.getElementById('save-object-btn').addEventListener('click', saveObject);
        document.getElementById('revert-changes-btn').addEventListener('click', () => {
            selectObject(state.selectedObject);
        });
        document.getElementById('delete-object-btn').addEventListener('click', deleteObject);
    }
    
    /**
     * Render custom properties in the editor
     */
    function renderCustomProperties(container, object) {
        container.innerHTML = '';

        Object.entries(object).forEach(([key, value]) => {
            addCustomProperty(container, key, value);
        });
    }
    
    /**
     * Add a custom property input to the editor
     */
    function addCustomProperty(container, key, value) {
        const propertyItem = document.createElement('div');
        propertyItem.className = 'property-item';
        
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'Property Name';
        keyInput.value = key;
        keyInput.className = 'property-key';
        
        // Check if the key matches a type name (plural or singular)
        const matchingTypePlural = state.objectTypeDefinitions.find(t => t.name.toLowerCase() === key.toLowerCase());
        const matchingTypeSingular = state.objectTypeDefinitions.find(t => t.singular.toLowerCase() === key.toLowerCase());
        
        propertyItem.appendChild(keyInput);
        // Regular property input (not a reference)
        const valueInput = document.createElement('input');
        let type = 'text';
        if (key === 'color') {
            type = 'color';
        } else if (key === 'render') {
            type = 'textarea';
            value = JSON.stringify(value);
            valueInput.setAttribute('id', 'render-value');
        } else if (key === 'tileMap') {
            type = 'textarea';
            value = JSON.stringify(value);
            valueInput.setAttribute('id', 'tilemap-value');
        } 
        valueInput.type = type;
        valueInput.placeholder = 'Value';
        valueInput.value = value;
        valueInput.className = 'property-value';
        
        propertyItem.appendChild(valueInput);
        if (matchingTypePlural || matchingTypeSingular) {
            // Create a container for the reference selector and value display
            const refContainer = document.createElement('div');
            refContainer.className = 'ref-container';
            
            // Create a select element for choosing objects
            const selectElement = document.createElement('select');
            selectElement.className = 'ref-select';
            
            // Determine which type we're referencing
            const typeId = matchingTypePlural ? matchingTypePlural.id : matchingTypeSingular.id;
            
            // Add options based on available objects of that type
            selectElement.innerHTML = `<option value="">-- Select ${matchingTypePlural ? matchingTypePlural.singular : matchingTypeSingular.singular} --</option>`;
            
            Object.keys(state.objectTypes[typeId] || {}).forEach(objId => {
                const option = document.createElement('option');
                option.value = objId;
                option.textContent = state.objectTypes[typeId][objId].title || objId;
                selectElement.appendChild(option);
            });
            
            // Add the select to the container
            refContainer.appendChild(selectElement);            
           
            // Convert value to array if it's a plural reference
            const valueArray = matchingTypePlural ? (Array.isArray(value) ? value : (value ? [value] : [])) : value;
            
 
            valueInput.value = matchingTypePlural ? JSON.stringify(valueArray) : valueArray || '';
            
            // Add button for inserting selected reference
            const insertBtn = document.createElement('button');
            insertBtn.textContent = 'Insert';
            insertBtn.className = 'small-btn';
            insertBtn.addEventListener('click', () => {
                const selectedValue = selectElement.value;
                if (!selectedValue) return;
                
                if (matchingTypePlural) {
                    // For plural (array) references
                    let currentValues = JSON.parse(valueInput.value || '[]');  
                    currentValues.push(selectedValue);
                    valueInput.value = JSON.stringify(currentValues);                
                } else {
                    // For singular references
                    valueInput.value = selectedValue;
                }
            });                  
            
            // Add elements to the container
            refContainer.appendChild(insertBtn);
            propertyItem.appendChild(refContainer);
            
        } 
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'danger';
        removeBtn.addEventListener('click', () => {
            container.removeChild(propertyItem);
        });
        
        propertyItem.appendChild(removeBtn);
        container.appendChild(propertyItem);
    }
    
    // Replace saveTower function
    function saveObject() {
        if (!state.selectedObject) return;
        
        const object = {}; 
        
        // Collect custom properties
        document.querySelectorAll('.property-item').forEach(item => {
            const keyInput = item.querySelector('.property-key');
            const valueInput = item.querySelector('.property-value');
            
            if (keyInput.value && valueInput) {
                let value = valueInput.value;
                const matchingTypePlural = state.objectTypeDefinitions.find(
                    t => t.name.toLowerCase() === keyInput.value.toLowerCase()
                );
                // Try to parse value types for non-reference fields
                if (!isNaN(parseFloat(value)) && isFinite(value)) {
                    value = parseFloat(value);
                } else if (value.toLowerCase() === 'true') {
                    value = true;
                } else if (value.toLowerCase() === 'false') {
                    value = false;
                }
                
                if (keyInput.value === "render") {
                    value = JSON.parse(value);
                } else if(keyInput.value === "tileMap") {
                    value = JSON.parse(value);
                } else if(matchingTypePlural) {
                    value = JSON.parse(value);
                }

                
            
                
                object[keyInput.value] = value;
            }
        });
        
        // Update the config
        state.objectTypes[state.selectedType][state.selectedObject] = object;
        
        // Update UI
        renderObjectList();
        renderPreview();
        selectObject(state.selectedObject);
        saveToLocalStorage();
        
        // Show success message
        const actions = document.querySelector('.actions');
        const successMsg = document.createElement('span');
        successMsg.textContent = 'Changes saved!';
        successMsg.className = 'success-message';
        actions.appendChild(successMsg);
        
        setTimeout(() => {
            if (actions.contains(successMsg)) {
                actions.removeChild(successMsg);
            }
        }, 2000);
    }
            
    // Replace deleteTower function
    function deleteObject() {
        if (!state.selectedObject) return;
        
        const singularType = state.selectedType.slice(0, -1);
        
        if (confirm(`Are you sure you want to delete "${state.selectedObject}" ${singularType}?`)) {
            delete state.objectTypes[state.selectedType][state.selectedObject];
            state.selectedObject = null;
            renderObjectList();
            renderEditor();
            renderPreview();
        }
    }

    
    /**
     * Render the preview canvas
     */
     function renderPreview() {
        
        if (state.selectedObject && state.objectTypes[state.selectedType][state.selectedObject]) {
            const object = state.objectTypes[state.selectedType][state.selectedObject];

            drawObject(object, state.objectPosition);               

        }
    }
    
      
    /**
     * Draw a object at the specified position
     */
    function drawObject(object, position) {
        console.log('drawObject', object);
        let data = null;
        let eventName = "";
        if(object.render) {
            eventName = "renderObject";
            data = object.render;
        } else if(object.tileMap) {
            eventName = "editTileMap";
            data = object.tileMap;
        }
        if( data ) {
            // Create a custom event with data
            const myCustomEvent = new CustomEvent(eventName, {
                detail: data, // Custom data
                bubbles: true, // Allows the event to bubble up (optional)
                cancelable: true // Allows the event to be canceled (optional)
            });

            // Dispatch the event
            document.body.dispatchEvent(myCustomEvent);
        }
    }
    /**
     * Generate JavaScript code for the current configuration
     */
    function generateConfigCode() {
        let code = `{\n`;
        
        Object.entries(state.objectTypes[state.selectedType]).forEach(([objId, config]) => {
            code += `    ${objId}: { `;
            
            const props = Object.entries(config)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => {
                    if (typeof value === 'string') {
                        return `${key}: '${value}'`;
                    } if(typeof value === 'object' ) {
                        return `${key}: ${JSON.stringify(value)}`;
                    } else {
                        return `${key}: ${value}`;
                    }
                })
                .join(', ');
            
            code += `${props} },\n`;
        });
        
        code += '}';
        
        return code;
    }

    
    /**
     * Parse configuration code and convert to object
     */
    function parseConfigCode(code) {
        try {
            // Extract the config object with variable pattern matching
            const regex = /\{([^;]*(?:\{[^;]*\}[^;]*)*)\}/s;
            const match = code.match(regex);
            
            if (!match) {
                throw new Error('Could not find configuration in the code');
            }
                            
            // Create a valid JavaScript expression
            const objText = `(${match[0]})`;
            
            // Parse the JavaScript object
            const config = eval(objText);
            
            // Determine the actual object type
            let objectType = state.selectedType;
            
            return { type: objectType, config };
        } catch (error) {
            console.error('Error parsing configuration:', error);
            alert('Failed to parse configuration. Please check format and try again.');
            return null;
        }
    }
    
    /**
     * Create a new tower
     */
    function createNewObject() {
        const id = elements.newObjectIdInput.value.trim();
        const name = elements.newObjectNameInput.value.trim();
        
        if (!id) {
            alert(`Please enter an ID`);
            return;
        }
        
        if (state.objectTypes[state.selectedType][id]) {
            alert(`Object with ID "${id}" already exists`);
            return;
        }
        
        // Create default properties based on type
        let defaultProps = {
            title: name || id,
            render: JSON.parse(JSON.stringify(CONFIG.DEFAULT_RENDER))
        };
        
        state.objectTypes[state.selectedType][id] = defaultProps;
        
        elements.newObjectModal.classList.remove('show');
        renderObjectList();
        selectObject(id);
    }
    /**
     * Create a new tower
     */
    function duplicateObject() {      
        const currentSelectedObjectType = state.objectTypes[state.selectedType];
        if( currentSelectedObjectType ) {
            // Create default properties based on type
            let defaultProps = {...currentSelectedObjectType[state.selectedObject]};
                
            const id = elements.duplicateObjectIdInput.value.trim();
            const title = elements.duplicateObjectNameInput.value.trim();
            defaultProps.title = title;
            state.objectTypes[state.selectedType][id] = defaultProps;
            
            elements.duplicateObjectModal.classList.remove('show');
            renderObjectList();
            selectObject(id);
        }
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {

        // Import/Export handling
        document.getElementById('import-export-btn').addEventListener('click', () => {
            elements.exportTextarea.value = generateConfigCode();
            elements.importExportModal.classList.add('show');
        });

        document.getElementById('close-import-export-modal').addEventListener('click', () => {
            elements.importExportModal.classList.remove('show');
        });
        
        document.getElementById('close-export-modal').addEventListener('click', () => {
            elements.importExportModal.classList.remove('show');
        });
        
        document.getElementById('copy-export-btn').addEventListener('click', copyExportToClipboard);
        
        document.getElementById('import-btn').addEventListener('click', importConfig);
        
        // New object handling
        document.getElementById('add-object-btn').addEventListener('click', () => {
            elements.newObjectIdInput.value = '';
            elements.newObjectNameInput.value = '';
            updateNewObjectModal();
            elements.newObjectModal.classList.add('show');
        });
        
        document.getElementById('close-new-object-modal').addEventListener('click', () => {
            elements.newObjectModal.classList.remove('show');
        });
        
        document.getElementById('create-object-btn').addEventListener('click', createNewObject);
        
        // New object handling
        document.getElementById('duplicate-object-btn').addEventListener('click', () => {
            elements.duplicateObjectIdInput.value = '';
            elements.duplicateObjectNameInput.value = '';
            updateDuplicateObjectModal();
            elements.duplicateObjectModal.classList.add('show');
        });

        document.getElementById('close-duplicate-object-modal').addEventListener('click', () => {
            elements.duplicateObjectModal.classList.remove('show');
        });

        document.getElementById('create-duplicate-object-btn').addEventListener('click', duplicateObject);


        // Tab navigation
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                elements.tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            });
        });
        document.body.addEventListener('saveObjectGraphics', (event) => {
            let renderData = event.detail;
            document.getElementById('render-value').value = JSON.stringify(renderData);
        });
        document.body.addEventListener('saveTileMap', (event) => {
            document.getElementById('tilemap-value').value = JSON.stringify(event.detail);
        });
    }

    /**
     * Copy export code to clipboard
     */
    function copyExportToClipboard() {
        elements.exportTextarea.select();
        document.execCommand('copy');
        const copyBtn = document.getElementById('copy-export-btn');
        copyBtn.textContent = 'Copied!';
        saveToLocalStorage();
        setTimeout(() => {
            copyBtn.textContent = 'Copy to Clipboard';
        }, 2000);
    }

    function saveToLocalStorage() {
        
        localStorage.setItem("objectTypes", JSON.stringify(state.objectTypes));
        localStorage.setItem("objectTypeDefinitions", JSON.stringify(state.objectTypeDefinitions));
        saveConfigFile();
    }
    
    function saveConfigFile() {
        state.objectTypes.objectTypeDefinitions = state.objectTypeDefinitions;
        const configText = JSON.stringify(state.objectTypes, null, 2);
        delete state.objectTypes.objectTypeDefinitions;
        fetch('/save-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: configText
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to save config');
                return response.text();
            })
            .then(message => {
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
    /**
     * Import configuration from textarea
     */
    function importConfig() {
        const code = elements.importTextarea.value;
        const result = parseConfigCode(code);
        
        if (result) {
            state.objectTypes[result.type] = result.config;
            state.selectedType = result.type;
            renderObjectList();
            elements.importExportModal.classList.remove('show');
            
            if (Object.keys(state.objectTypes[state.selectedType]).length > 0) {
                selectObject(Object.keys(state.objectTypes[state.selectedType])[0]);
            } else {
                state.selectedObject = null;
                renderEditor();
                renderPreview();
            }
            saveToLocalStorage();
        }
    }
    // Update new object modal
    function updateNewObjectModal() {
        const singularType = getSingularType(state.selectedType);
        document.querySelector('#new-object-modal h2').textContent = `Create New ${singularType.charAt(0).toUpperCase() + singularType.slice(1)}`;
        document.querySelector('#new-object-modal label[for="new-object-id"]').textContent = `${singularType.charAt(0).toUpperCase() + singularType.slice(1)} ID:`;
        document.getElementById('create-object-btn').textContent = `Create ${singularType.charAt(0).toUpperCase() + singularType.slice(1)}`;
    }
    // Update new object modal
    function updateDuplicateObjectModal() {
        const singularType = getSingularType(state.selectedType);
        document.querySelector('#duplicate-object-modal h2').textContent = `Create Duplicate ${singularType.charAt(0).toUpperCase() + singularType.slice(1)}`;
        document.querySelector('#duplicate-object-modal label[for="duplicate-object-id"]').textContent = `${singularType.charAt(0).toUpperCase() + singularType.slice(1)} ID:`;
        document.getElementById('create-duplicate-object-btn').textContent = `Create ${singularType.charAt(0).toUpperCase() + singularType.slice(1)}`;
    }

    function createNewType() {
        const typeId = document.getElementById('new-type-id').value.trim();
        const typeName = document.getElementById('new-type-name').value.trim();
        const typeSingular = document.getElementById('new-type-singular').value.trim();
        
        if (!typeId) {
            alert('Please enter a Type ID');
            return;
        }
        
        if (state.objectTypes[typeId]) {
            alert(`Type "${typeId}" already exists`);
            return;
        }
        
        // Add the new type
        state.objectTypes[typeId] = {};
        state.objectTypeDefinitions.push({
            id: typeId,
            name: typeName || typeId.charAt(0).toUpperCase() + typeId.slice(1),
            singular: typeSingular || typeId.slice(0, -1).charAt(0).toUpperCase() + typeId.slice(0, -1).slice(1)
        });
        
        // Switch to the new type
        state.selectedType = typeId;
        state.selectedObject = null;
        
        // Close the modal and update UI
        document.getElementById('add-type-modal').classList.remove('show');
        renderObjectList();
        renderEditor();
        renderPreview();
        updateSidebarButtons();
        saveToLocalStorage();
    }

    function showAddTypeModal() {
        // Create the modal if it doesn't exist
        if (!document.getElementById('add-type-modal')) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'add-type-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Add New Object Type</h2>
                    <div class="form-group">
                        <label for="new-type-id">Type ID (plural, e.g. "weapons"):</label>
                        <input type="text" id="new-type-id" placeholder="e.g. weapons">
                    </div>
                    <div class="form-group">
                        <label for="new-type-name">Display Name (plural):</label>
                        <input type="text" id="new-type-name" placeholder="e.g. Weapons">
                    </div>
                    <div class="form-group">
                        <label for="new-type-singular">Singular Name:</label>
                        <input type="text" id="new-type-singular" placeholder="e.g. Weapon">
                    </div>
                    <div class="actions">
                        <button class="primary" id="create-type-btn">Create Type</button>
                        <button id="close-add-type-modal">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add event listeners
            document.getElementById('create-type-btn').addEventListener('click', createNewType);
            document.getElementById('close-add-type-modal').addEventListener('click', () => {
                document.getElementById('add-type-modal').classList.remove('show');
            });
        }
        
        // Show the modal
        document.getElementById('add-type-modal').classList.add('show');
    }

    function showRemoveTypeModal() {
        // Create the modal if it doesn't exist
        if (!document.getElementById('remove-type-modal')) {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'remove-type-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Remove Object Type</h2>
                    <div class="warning" style="color: #f44; margin: 10px 0;">
                        Warning: This will permanently delete all objects of this type!
                    </div>
                    <div class="actions">
                        <button class="danger" id="confirm-remove-type-btn">Remove Type</button>
                        <button id="close-remove-type-modal">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add event listeners
            document.getElementById('confirm-remove-type-btn').addEventListener('click', removeSelectedType);
            document.getElementById('close-remove-type-modal').addEventListener('click', () => {
                document.getElementById('remove-type-modal').classList.remove('show');
            });
        }
        
        // Show the modal
        document.getElementById('remove-type-modal').classList.add('show');
    }

    function removeSelectedType() {
        const typeId = state.selectedType;
        
        if (!typeId) return;
        
        // Prevent removing all types
        if (state.objectTypeDefinitions.length <= 1) {
            alert('Cannot remove the last object type');
            return;
        }
        
        // Remove the type
        delete state.objectTypes[typeId];
        state.objectTypeDefinitions = state.objectTypeDefinitions.filter(type => type.id !== typeId);
        
        // Switch to the first available type
        state.selectedType = state.objectTypeDefinitions[0].id;
        state.selectedObject = null;
        
        // Close the modal and update UI
        document.getElementById('remove-type-modal').classList.remove('show');
        renderObjectList();
        renderEditor();
        renderPreview();
        updateSidebarButtons();
        saveToLocalStorage();
    }
    // Update HTML for sidebar buttons
    function updateSidebarButtons() {
        const singularType = getSingularType(state.selectedType);
        document.getElementById('add-object-btn').textContent = `Add New ${singularType}`;
        document.getElementById('import-export-btn').textContent = `Import/Export ${getPluralType(state.selectedType)}`;
    }

    function updateMainContent() {
        elements.terrainEditorContainer.classList.remove('show');
        elements.graphicsEditorContainer.classList.remove('show');
console.log(state.objectTypes[state.selectedType][state.selectedObject]);
        if(typeof state.objectTypes[state.selectedType][state.selectedObject].render != "undefined") {
            elements.graphicsEditorContainer.classList.add('show');
        } else if(typeof state.objectTypes[state.selectedType][state.selectedObject].tileMap != "undefined") {
            elements.terrainEditorContainer.classList.add('show');
        }
    }

    /**
     * Application initialization
     */
    function init() {
        fetch('/config/game_config.json')
            .then(response => {
                if (!response.ok) throw new Error('File not found');
                return response.json();
            })
            .then(config => {
                state.objectTypes = config;                    
                if(state.objectTypes.objectTypeDefinitions) {
                    state.objectTypeDefinitions = state.objectTypes.objectTypeDefinitions;
                    delete state.objectTypes.objectTypeDefinitions;                           
                }
                // Set up event listeners
                setupEventListeners();
                
                // Render initial UI
                renderObjectList();
                updateSidebarButtons();                    
                
                if (Object.keys(state.objectTypes[state.selectedType]).length > 0) {
                    selectObject(Object.keys(state.objectTypes[state.selectedType])[0]);
                }    
            })
            .catch(error => {
                console.error('Error loading config:', error);
            });             
    }
    
       
    // Initialize the application
    init();
})();



import * as THREE from '/library/three.module.min.js';
    
import { OrbitControls } from '/library/three.orbitControls.js';

(function() {
    // Global variables
    let camera, scene, renderer, controls;
    let renderData = { animations: { "idle": [{ shapes: [] }] } }; // Default to an empty idle animation
    let selectedShapeIndex = -1;

    let currentAnimation = "idle"; // Current animation type
    let currentFrame = 0; // Current frame index within the animation

    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let selectedOutline, originalMaterials = new Map();
    let isDragging = false;
    let clickStartTime = 0;
    let isPreviewingAnimation = false;
    // Initialize the application
    function init() {
        let container = document.getElementById('graphics-editor-container');
        container.classList.add('show');
        initThreeJS();
        initEventListeners();
        
        // Initial render
        renderShapes(renderData, { scene }, false);
        updateShapeList();
        animate();
    }
    
    // Initialize Three.js
    function initThreeJS() {
        // Create scene
        scene = new THREE.Scene();
        //scene.background = new THREE.Color(0x333333);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.x = 100;
        camera.position.y = 100;
        camera.position.z = 100;
        camera.lookAt(0, 0, 0);
        // Create renderer
        const canvas = document.getElementById('canvas');
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(100, 100);
        scene.add(gridHelper);
        
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
        
        // Create raycaster for object selection
        raycaster = new THREE.Raycaster();
        
        // Add orbit controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        });
    }

    
    // Show the isometric modal
    function showIsometricModal() {
        document.getElementById('isometric-modal').classList.add('show');
    }

    function generateIsometricSprites() {
        const frustumSize = parseFloat(document.getElementById('iso-frustum').value) || 48;
        const cameraDistance = parseFloat(document.getElementById('iso-distance').value) || 100;
        const size = parseFloat(document.getElementById('iso-size').value) || 64;
        const aspect = 1;
        const tempRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        tempRenderer.setSize(size, size);
        document.getElementById('isometric-modal').classList.remove('show');

        const renderTarget = new THREE.WebGLRenderTarget(size, size);
        const cameras = [
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000),
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000),
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000),
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000)
        ];
        cameras[0].position.set(cameraDistance, cameraDistance, cameraDistance);
        cameras[1].position.set(-cameraDistance, cameraDistance, cameraDistance);
        cameras[2].position.set(cameraDistance, cameraDistance, -cameraDistance);
        cameras[3].position.set(-cameraDistance, cameraDistance, -cameraDistance);
        cameras.forEach(camera => camera.lookAt(0, 0, 0));

        const sprites = {};
        for (const animType in renderData.animations) {
            sprites[animType] = [];
            renderData.animations[animType].forEach(frame => {
                const scene = new THREE.Scene();
                const light = new THREE.AmbientLight(0xffffff, 5);
                scene.add(light);
                createObjectsFromJSON(frame, scene);

                const frameSprites = [];
                for (const camera of cameras) {
                    tempRenderer.setRenderTarget(renderTarget);
                    tempRenderer.render(scene, camera);
                    const buffer = new Uint8Array(size * size * 4);
                    tempRenderer.readRenderTargetPixels(renderTarget, 0, 0, size, size, buffer);
                    const flippedBuffer = new Uint8Array(size * size * 4);
                    for (let y = 0; y < size; y++) {
                        const srcRowStart = y * size * 4;
                        const destRowStart = (size - 1 - y) * size * 4;
                        flippedBuffer.set(buffer.subarray(srcRowStart, srcRowStart + size * 4), destRowStart);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    const imageData = ctx.createImageData(size, size);
                    imageData.data.set(flippedBuffer);
                    ctx.putImageData(imageData, 0, 0);
                    frameSprites.push(canvas.toDataURL());
                }
                sprites[animType].push(frameSprites);
            });
        }

        tempRenderer.setRenderTarget(null);
        tempRenderer.dispose();
        renderTarget.dispose();
        displayIsometricSprites(sprites);
    }

    function displayIsometricSprites(sprites) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0, 0, 0, 0.7); z-index: 1000; 
            display: flex; align-items: center; justify-content: center;
        `;
        const content = document.createElement('div');
        content.style.cssText = `
            background: #333; padding: 20px; border-radius: 8px; 
            max-width: 80%; max-height: 80%; overflow: auto;
        `;

        for (const animType in sprites) {
            const animSection = document.createElement('div');
            const title = document.createElement('h3');
            title.textContent = `${animType} Animation`;
            title.style.color = '#e0e0e0';
            animSection.appendChild(title);

            const grid = document.createElement('div');
            grid.style.cssText = `display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin: 10px 0;`;
            sprites[animType].forEach(frame => {
                frame.forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.style.maxWidth = '100%';
                    grid.appendChild(img);
                });
            });
            animSection.appendChild(grid);
            content.appendChild(animSection);
        }

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.cssText = `
            margin-top: 20px; padding: 8px 16px; background-color: #4CAF50; 
            color: #fff; border: none; border-radius: 6px; cursor: pointer;
        `;
        closeButton.addEventListener('click', () => document.body.removeChild(modal));
        content.appendChild(closeButton);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    // Initialize event listeners
    function initEventListeners() {
        document.getElementById('add-shape').addEventListener('click', addNewShape);     
        document.getElementById('preview-animation').addEventListener('click', togglePreview);       
        document.getElementById('duplicate-shape').addEventListener('click', duplicateSelectedShape);         
        document.getElementById('delete-shape').addEventListener('click', deleteSelectedShape);                           
        document.getElementById('scale-all').addEventListener('click', scaleAllShapes);                       
        document.getElementById('rotate-all').addEventListener('click', rotateAllShapes);            
        document.getElementById('move-all').addEventListener('click', moveAllShapes);
        document.getElementById('generate-isometric').addEventListener('click', showIsometricModal);
        document.getElementById('add-animation').addEventListener('click', addNewAnimation);
        document.getElementById('delete-animation').addEventListener('click', deleteAnimation);
        document.getElementById('duplicate-frame').addEventListener('click', duplicateFrame);
        document.getElementById('delete-frame').addEventListener('click', deleteFrame);
        document.body.addEventListener('renderObject', (event) => {
            setPreviewAnimationState(false);
            renderData = event.detail;
            document.getElementById('json-content').value =  JSON.stringify(renderData, null, 2);
            currentAnimation = "idle";
            selectedShapeIndex = renderData.animations.idle[0].shapes.length > 0 ? 0 : -1;                
            renderShapes(renderData, { scene }, false);
            updateShapeList();
        });
        // Canvas click event for shape selection
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('mousedown', (event) => {
            isDragging = false;
            clickStartTime = Date.now();
        });
        
        canvas.addEventListener('mousemove', () => {
            if (Date.now() - clickStartTime > 100) {
                isDragging = true;
            }
        });
        
        canvas.addEventListener('mouseup', (event) => {
            if (isDragging) return; // Ignore if dragging
            
            // Calculate mouse position in normalized device coordinates
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
            
            // Update the picking ray with the camera and mouse position
            raycaster.setFromCamera(mouse, camera);
            
            // Calculate objects intersecting the picking ray
            const shapes = scene.children.filter(obj => obj.userData.isShape);
            const intersects = raycaster.intersectObjects(shapes);
            
            if (intersects.length > 0) {
                const index = intersects[0].object.userData.index;
                selectShape(index);
            }
        });

        document.getElementById('move-cancel').addEventListener('click', () => {
            document.getElementById('move-modal').classList.remove('show');
        });

        document.getElementById('move-apply').addEventListener('click', () => {
            const xOffset = parseFloat(document.getElementById('move-x').value) || 0;
            const yOffset = parseFloat(document.getElementById('move-y').value) || 0;
            const zOffset = parseFloat(document.getElementById('move-z').value) || 0;
            
            // Apply the offset to all shapes
            renderData.animations[currentAnimation][currentFrame].shapes.forEach(shape => {
                shape.x = (shape.x || 0) + xOffset;
                shape.y = (shape.y || 0) + yOffset;
                shape.z = (shape.z || 0) + zOffset;
            });
            renderShapes(renderData, { scene }, true);
            updateShapeList();
            
            // Hide the modal
            document.getElementById('move-modal').classList.remove('show');
        });
        document.getElementById('iso-cancel').addEventListener('click', () => {
            document.getElementById('isometric-modal').classList.remove('show');
        });
        document.getElementById('iso-generate').addEventListener('click', generateIsometricSprites);
    }
    function togglePreview(e) {
        isPreviewingAnimation = !isPreviewingAnimation;
        animatePreview();
        setPreviewAnimationState(isPreviewingAnimation);            
    }
    function setPreviewAnimationState(isPreviewing) {
        isPreviewingAnimation = isPreviewing
        let btn = document.getElementById('preview-animation');
        if (isPreviewingAnimation) {
            btn.classList.add("active");
        } else {
            currentFrame = 0;
            btn.classList.remove("active");
        }
    }
    function animatePreview() {
        if (!isPreviewingAnimation) return;
        currentFrame = (currentFrame + 1) % renderData.animations[currentAnimation].length;
        renderShapes(renderData, { scene }, false);
        //updateShapeList();
        setTimeout(animatePreview, 166); // ~6 FPS, adjust as needed
    }
    // Select a shape
    function selectShape(index) {
        if(isPreviewingAnimation){
            setPreviewAnimationState(false);
        }
        selectedShapeIndex = (selectedShapeIndex === index) ? -1 : index;
        updateShapeList();
        highlightSelectedShape();
    }
    
    // Highlight the selected shape
    function highlightSelectedShape() {
        // Remove existing outlines
        scene.children.forEach(obj => {
            if (obj.userData.isOutline) {
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            }
        });
        
        // Reset any highlighted materials
        originalMaterials.forEach((material, object) => {
            object.material = material;
        });
        originalMaterials.clear();
        
        // If no shape is selected, return
        if (selectedShapeIndex < 0 || selectedShapeIndex >= renderData.animations.idle[0].shapes.length) {
            return;
        }

        // Find the selected mesh
        const selectedMesh = scene.children.find(obj => 
            obj.userData.isShape && obj.userData.index === selectedShapeIndex
        );
        
        if (selectedMesh) {
            // Store original material
            originalMaterials.set(selectedMesh, selectedMesh.material);
            
            // Create a new material based on the original one but with emissive glow
            const highlightMaterial = selectedMesh.material.clone();
            highlightMaterial.emissive = new THREE.Color(0x555555);
            highlightMaterial.emissiveIntensity = 0.5;
            
            // Apply the highlight material
            selectedMesh.material = highlightMaterial;
            
            // Create outline
            const outlineGeometry = selectedMesh.geometry.clone();
            const outlineMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00, 
                side: THREE.BackSide 
            });
            
            const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
            outline.position.copy(selectedMesh.position);
            outline.rotation.copy(selectedMesh.rotation);
            outline.scale.multiplyScalar(1.05);
            outline.userData.isOutline = true;
            
            scene.add(outline);
        }
    }
    function addNewShape() {
        const newShape = {
            type: 'cube',
            size: 2,
            color: '#3498db',
            x: 0,
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0
        };
        renderData.animations[currentAnimation][currentFrame].shapes.push(newShape);
        selectedShapeIndex = renderData.animations[currentAnimation][currentFrame].shapes.length - 1;
        renderShapes(renderData, { scene });
        updateShapeList();
    }

    function duplicateSelectedShape() {
        if (selectedShapeIndex >= 0) {
            const originalShape = renderData.animations[currentAnimation][currentFrame].shapes[selectedShapeIndex];
            const newShape = JSON.parse(JSON.stringify(originalShape));
            renderData.animations[currentAnimation][currentFrame].shapes.push(newShape);
            selectedShapeIndex = renderData.animations[currentAnimation][currentFrame].shapes.length - 1;
            renderShapes(renderData, { scene });
            updateShapeList();
        }
    }

    function deleteSelectedShape() {
        if (selectedShapeIndex >= 0) {
            renderData.animations[currentAnimation][currentFrame].shapes.splice(selectedShapeIndex, 1);
            if (renderData.animations[currentAnimation][currentFrame].shapes.length > 0) {
                selectedShapeIndex = Math.min(selectedShapeIndex, renderData.animations[currentAnimation][currentFrame].shapes.length - 1);
            } else {
                selectedShapeIndex = -1;
            }
            renderShapes(renderData, { scene });
            updateShapeList();
        }
    }

    function scaleAllShapes() {
        if (renderData.animations[currentAnimation][currentFrame].shapes.length === 0) return;
        const scaleFactor = parseFloat(prompt("Enter scale factor (e.g. 2 for double size, 0.5 for half size):", "1"));
        if (isNaN(scaleFactor) || scaleFactor <= 0) {
            alert("Please enter a valid positive number");
            return;
        }
        let centerX = 0, centerY = 0, centerZ = 0;
        renderData.animations[currentAnimation][currentFrame].shapes.forEach(shape => {
            centerX += shape.x || 0;
            centerY += shape.y || 0;
            centerZ += shape.z || 0;
        });
        centerX /= renderData.animations[currentAnimation][currentFrame].shapes.length;
        centerY /= renderData.animations[currentAnimation][currentFrame].shapes.length;
        centerZ /= renderData.animations[currentAnimation][currentFrame].shapes.length;
        renderData.animations[currentAnimation][currentFrame].shapes.forEach(shape => {
            if (shape.size) shape.size *= scaleFactor;
            if (shape.width) shape.width *= scaleFactor;
            if (shape.height) shape.height *= scaleFactor;
            if (shape.depth) shape.depth *= scaleFactor;
            if (shape.tubeSize) shape.tubeSize *= scaleFactor;
            shape.x = centerX + ((shape.x || 0) - centerX) * scaleFactor;
            shape.y = centerY + ((shape.y || 0) - centerY) * scaleFactor;
            shape.z = centerZ + ((shape.z || 0) - centerZ) * scaleFactor;
        });
        renderShapes(renderData, { scene });
        updateShapeList();
    }
    function rotateAllShapes() {
        const currentShapes = renderData.animations[currentAnimation][currentFrame].shapes;
        if (currentShapes.length === 0) return;

        // Get modal elements
        const rotateModal = document.getElementById('rotate-modal');
        const rotateAngleInput = document.getElementById('rotate-angle');
        const rotateAxisSelect = document.getElementById('rotate-axis');
        const rotateCancelBtn = document.getElementById('rotate-cancel');
        const rotateApplyBtn = document.getElementById('rotate-apply');

        // Reset inputs to default values
        rotateAngleInput.value = "0";
        rotateAxisSelect.value = "y"; // Default to Y-axis

        // Show the modal
        rotateModal.classList.add('show');

        // Cancel button handler
        rotateCancelBtn.onclick = () => {
            rotateModal.classList.remove('show');
        };

        // Apply button handler
        rotateApplyBtn.onclick = () => {
            const angleDeg = parseFloat(rotateAngleInput.value);
            if (isNaN(angleDeg)) {
                alert("Please enter a valid angle");
                return;
            }

            const axis = rotateAxisSelect.value;
            const angleRad = angleDeg * Math.PI / 180;

            // Calculate the center of all shapes in the current frame
            let centerX = 0, centerY = 0, centerZ = 0;
            currentShapes.forEach(shape => {
                centerX += shape.x || 0;
                centerY += shape.y || 0;
                centerZ += shape.z || 0;
            });
            centerX /= currentShapes.length;
            centerY /= currentShapes.length;
            centerZ /= currentShapes.length;

            // Rotate shapes around the group center by adjusting positions
            currentShapes.forEach(shape => {
                const x = shape.x || 0;
                const y = shape.y || 0;
                const z = shape.z || 0;

                // Translate to origin relative to center
                const relX = x - centerX;
                const relY = y - centerY;
                const relZ = z - centerZ;

                // Apply rotation around the chosen axis
                if (axis === 'x') {
                    // X-axis rotation (y-z plane)
                    const newRelY = relY * Math.cos(angleRad) - relZ * Math.sin(angleRad);
                    const newRelZ = relY * Math.sin(angleRad) + relZ * Math.cos(angleRad);
                    shape.y = centerY + newRelY;
                    shape.z = centerZ + newRelZ;
                    // x remains unchanged
                } else if (axis === 'y') {
                    // Y-axis rotation (x-z plane)
                    const newRelX = relX * Math.cos(angleRad) + relZ * Math.sin(angleRad);
                    const newRelZ = -relX * Math.sin(angleRad) + relZ * Math.cos(angleRad);
                    shape.x = centerX + newRelX;
                    shape.z = centerZ + newRelZ;
                    // y remains unchanged
                } else if (axis === 'z') {
                    // Z-axis rotation (x-y plane)
                    const newRelX = relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
                    const newRelY = relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
                    shape.x = centerX + newRelX;
                    shape.y = centerY + newRelY;
                    // z remains unchanged
                }
                // Individual rotations (rotationX, rotationY, rotationZ) are preserved
            });

            // Update the scene and hide the modal
            renderShapes(renderData, { scene });
            updateShapeList();
            rotateModal.classList.remove('show');
        };
    }
    function moveAllShapes() {
        if (renderData.animations[currentAnimation][currentFrame].shapes.length === 0) return;
        document.getElementById('move-modal').classList.add('show');
        document.getElementById('move-x').value = '0';
        document.getElementById('move-y').value = '0';
        document.getElementById('move-z').value = '0';
    }
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    function createObjectsFromJSON(shapeData, scene) {

        shapeData.shapes.forEach((shape, index) => {
            let geometry, material, mesh;

            // Create material with the specified color
            material = new THREE.MeshStandardMaterial({ color: shape.color });

            
            // Create geometry based on shape type
            if (shape.type === 'sphere') {
                geometry = new THREE.SphereGeometry(shape.size / 2, 32, 32);
            }
            else if (shape.type === 'cube') {
                geometry = new THREE.BoxGeometry(shape.size, shape.size, shape.size);
            }
            else if (shape.type === 'box') {
                geometry = new THREE.BoxGeometry(shape.width, shape.height, shape.depth || shape.width);
            }
            else if (shape.type === 'cylinder') {
                geometry = new THREE.CylinderGeometry(shape.size / 2, shape.size / 2, shape.height, 32);
            }
            else if (shape.type === 'cone') {
                geometry = new THREE.ConeGeometry(shape.size / 2, shape.height, 32);
            }
            else if (shape.type === 'torus') {
                geometry = new THREE.TorusGeometry(shape.size / 2, shape.tubeSize || shape.size / 6, 16, 100);
            }
            else if (shape.type === 'tetrahedron') {
                geometry = new THREE.TetrahedronGeometry(shape.size / 2);
            }
            
            if (geometry) {
                const mesh = new THREE.Mesh(geometry, material);
                mesh.userData.isShape = true;                    
                mesh.userData.index = index;

                // Position and rotation
                mesh.position.set(shape.x || 0, shape.y || 0, shape.z || 0);
                
                // Handle rotation (convert from degrees to radians)
                if (shape.rotationX) mesh.rotation.x = shape.rotationX * Math.PI / 180;
                if (shape.rotationY) mesh.rotation.y = shape.rotationY * Math.PI / 180;
                if (shape.rotationZ) mesh.rotation.z = shape.rotationZ * Math.PI / 180;
                
                scene.add(mesh);
            }
        });
    }
    // Render shapes function (imported from your code)
    function renderShapes(renderData, ctx3D, fireSave=true) {
        const { scene } = ctx3D;
       
        // Clear existing shapes
        const objectsToRemove = [];
        scene.traverse(object => {
            if (object.userData.isShape || object.userData.isOutline) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(obj => {
            scene.remove(obj);
            if(obj.geometry) obj.geometry.dispose();
            if(obj.material) {
                if(obj.material.map) obj.material.map.dispose(); // dispose textures
                obj.material.dispose();
            }
        });
        
        // Add lights if they don't exist
        if (!scene.getObjectByName('ambient-light')) {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            ambientLight.name = 'ambient-light';
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 10, 7.5);
            directionalLight.name = 'dir-light';
            scene.add(directionalLight);
        }
        const currentShapes = renderData.animations[currentAnimation][currentFrame];
        createObjectsFromJSON(currentShapes, scene);
        
        // Update shape count
        document.getElementById('shape-count').textContent = currentShapes.shapes.length;
        
        // Update the JSON editor
        document.getElementById('json-content').value = JSON.stringify(renderData, null, 2);

        if(fireSave){
                    // Create a custom event with data
            const myCustomEvent = new CustomEvent('saveObjectGraphics', {
                detail: renderData, // Custom data
                bubbles: true, // Allows the event to bubble up (optional)
                cancelable: true // Allows the event to be canceled (optional)
            });

            // Dispatch the event
            document.body.dispatchEvent(myCustomEvent);
        }
        // Highlight the selected shape (if any)
        highlightSelectedShape();
    }
    
    function addNewAnimation() {
        const animName = prompt("Enter animation name:", `anim${Object.keys(renderData.animations).length + 1}`);
        if (animName && !renderData.animations[animName]) {
            renderData.animations[animName] = [ ...renderData.animations["idle"] ];
            currentAnimation = animName;
            currentFrame = 0;
            renderShapes(renderData, { scene });
            updateShapeList();
        }
    }
    
    function deleteAnimation() {
        if( currentAnimation != "idle") {
            delete renderData.animations[currentAnimation];
            currentAnimation = "idle";
            currentFrame = 0;
            selectedShapeIndex = -1;
            renderShapes(renderData, { scene });
            updateShapeList();
        }
    }

    function duplicateFrame() {
        if (renderData.animations[currentAnimation].length > 0) {
            const currentShapes = renderData.animations[currentAnimation][currentFrame];
            const newFrame = { shapes: JSON.parse(JSON.stringify(currentShapes.shapes)) };
            renderData.animations[currentAnimation].splice(currentFrame + 1, 0, newFrame);
            currentFrame++;
            renderShapes(renderData, { scene });
            updateShapeList();
        }
    }

    function deleteFrame() {
        if (renderData.animations[currentAnimation].length > 1) {
            renderData.animations[currentAnimation].splice(currentFrame, 1);
            currentFrame = Math.min(currentFrame, renderData.animations[currentAnimation].length - 1);
            renderShapes(renderData, { scene });
            updateShapeList();
        }
    }
    // Update the shape list in the sidebar
    function updateShapeList() {
        const shapeList = document.getElementById('shape-list');
        shapeList.innerHTML = '';

        // Animation selector
        const animSelector = document.createElement('select');
        animSelector.style.marginBottom = '10px';
        Object.keys(renderData.animations).forEach(anim => {
            const option = document.createElement('option');
            option.value = anim;
            option.textContent = anim;
            if (anim === currentAnimation) option.selected = true;
            animSelector.appendChild(option);
        });
        animSelector.addEventListener('change', () => {
            setPreviewAnimationState(false);
            currentAnimation = animSelector.value;
            currentFrame = 0;
            selectedShapeIndex = -1;
            renderShapes(renderData, { scene });
            updateShapeList();
        });
        shapeList.appendChild(animSelector);

        // Frame list
        const frameList = document.createElement('div');
        frameList.style.marginBottom = '10px';
        renderData.animations[currentAnimation].forEach((frame, index) => {
            const frameItem = document.createElement('div');
            frameItem.textContent = `Frame ${index + 1}`;
            frameItem.style.padding = '5px';
            frameItem.style.cursor = 'pointer';
            if (index === currentFrame) frameItem.style.backgroundColor = '#555';
            frameItem.addEventListener('click', () => {
                setPreviewAnimationState(false);
                currentFrame = index;
                renderShapes(renderData, { scene });
                updateShapeList();
            });
            frameList.appendChild(frameItem);
        });
        shapeList.appendChild(frameList);

        // Shape list for current frame
        const currentShapes = renderData.animations[currentAnimation][currentFrame].shapes;
        if (currentShapes.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No shapes in this frame.';
            emptyMessage.style.padding = '10px';
            emptyMessage.style.color = '#777';
            shapeList.appendChild(emptyMessage);
            document.getElementById('selected-shape').textContent = 'None';
            return;
        }

        currentShapes.forEach((shape, index) => {
            const shapeItem = document.createElement('div');
            shapeItem.className = 'shape-item';
            if (index === selectedShapeIndex) {
                shapeItem.classList.add('active');
                document.getElementById('selected-shape').textContent = `${shape.type} (${index})`;
            }
            const title = document.createElement('div');
            title.textContent = `${index + 1}. ${shape.name || shape.type} ${shape.color}`;
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '5px';
            shapeItem.appendChild(title);
            const position = document.createElement('div');
            position.textContent = `Position: X=${shape.x || 0}, Y=${shape.y || 0}, Z=${shape.z || 0}`;
            position.style.fontSize = '12px';
            shapeItem.appendChild(position);
            shapeItem.addEventListener('click', () => {
                selectShape(index);
                createInspector(shape);
            });
            shapeList.appendChild(shapeItem);
        });

        if (selectedShapeIndex >= 0) {
            let shape = currentShapes[selectedShapeIndex];
            if( shape ) {
                createInspector(shape);
            } else {
                const inspector = document.getElementById('inspector');
                inspector.innerHTML = "";
                selectedShapeIndex = -1;
                renderShapes(renderData, { scene });
                updateShapeList();
            }

        }
    }
    
    // Create the inspector panel for editing a shape
    function createInspector(shape) {
        const shapeList = document.getElementById('shape-list');            
 
        const inspector = document.getElementById('inspector');
        inspector.innerHTML = "";
        inspector.className = 'inspector';
        
        addFormRow(inspector, 'Name', 'text', 'name', shape.name || "");
        // Type selector
        addFormRow(inspector, 'Type', 'select', 'type', shape.type, {
            options: ['cube', 'sphere', 'box', 'cylinder', 'cone', 'torus', 'tetrahedron']
        });
        
        // Color picker
        addFormRow(inspector, 'Color', 'color', 'color', shape.color);
        
        // Position inputs
        addFormRow(inspector, 'X Position', 'number', 'x', shape.x || 0, { step: 0.1 });
        addFormRow(inspector, 'Y Position', 'number', 'y', shape.y || 0, { step: 0.1 });
        addFormRow(inspector, 'Z Position', 'number', 'z', shape.z || 0, { step: 0.1 });
        
        // Rotation inputs
        addFormRow(inspector, 'X Rotation', 'number', 'rotationX', shape.rotationX || 0, { step: 5 });
        addFormRow(inspector, 'Y Rotation', 'number', 'rotationY', shape.rotationY || 0, { step: 5 });
        addFormRow(inspector, 'Z Rotation', 'number', 'rotationZ', shape.rotationZ || 0, { step: 5 });
        
        // Size inputs
        if (shape.type === 'cube' || shape.type === 'sphere' || shape.type === 'tetrahedron' || shape.type === 'torus') {
            addFormRow(inspector, 'Size', 'number', 'size', shape.size || 2, { min: 0.1, step: 0.1 });
        }
        
        if (shape.type === 'box') {
            addFormRow(inspector, 'Width', 'number', 'width', shape.width || 2, { min: 0.1, step: 0.1 });
            addFormRow(inspector, 'Height', 'number', 'height', shape.height || 2, { min: 0.1, step: 0.1 });
            addFormRow(inspector, 'Depth', 'number', 'depth', shape.depth || 2, { min: 0.1, step: 0.1 });
        }
        
        if (shape.type === 'cylinder' || shape.type === 'cone') {
            addFormRow(inspector, 'Size', 'number', 'size', shape.size || 2, { min: 0.1, step: 0.1 });
            addFormRow(inspector, 'Height', 'number', 'height', shape.height || 3, { min: 0.1, step: 0.1 });
        }
        
        if (shape.type === 'torus') {
            addFormRow(inspector, 'Tube Size', 'number', 'tubeSize', shape.tubeSize || shape.size / 6, { min: 0.1, step: 0.1 });
        }
        
    }
    
    // Add a form row to the inspector
    function addFormRow(container, label, type, property, value, options = {}) {
        const row = document.createElement('div');
        row.className = 'form-row';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        row.appendChild(labelElement);
        
        let input;
        
        if (type === 'select') {
            input = document.createElement('select');
            (options.options || []).forEach(optionValue => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                if (value === optionValue) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        } else if(type === "color") {
            input = document.createElement('input');
            input.type = "text";
            input.value = value;
            let colorInput = document.createElement('input');
            colorInput.type = "color";
            colorInput.value = value;

            colorInput.addEventListener('change', () => {
                let newValue = colorInput.value;                
                renderData.animations[currentAnimation][currentFrame].shapes[selectedShapeIndex][property] = newValue;
                renderShapes(renderData, { scene });
                updateShapeList();
            });
            row.appendChild(colorInput);
        } else {
            input = document.createElement('input');
            input.type = type;
            input.value = value;
            
            if (type === 'number') {
                input.min = options.min !== undefined ? options.min : -64;
                input.max = options.max !== undefined ? options.max : 64;
                input.step = options.step || 1;
            }
        }
        
        input.addEventListener('change', () => {
            let newValue = input.value;
            
            if (type === 'number') {
                newValue = parseFloat(newValue);
            }
            
            renderData.animations[currentAnimation][currentFrame].shapes[selectedShapeIndex][property] = newValue;
            renderShapes(renderData, { scene });
            updateShapeList();
        });
        
        row.appendChild(input);
        container.appendChild(row);
    }
    
    // Import JSON configuration
    function importJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    renderData = importedData;
                    selectedShapeIndex = renderData.shapes.length > 0 ? 0 : -1;
                    
                    renderShapes(renderData, { scene });
                    updateShapeList();
                    
                    // Reset camera position
                    camera.position.set(0, 5, 10);
                    controls.target.set(0, 0, 0);
                } catch (error) {
                    alert('Invalid JSON file: ' + error.message);
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
    // Apply JSON from editor
    function applyJSON() {
        try {
            const newData = JSON.parse(document.getElementById('json-content').value);
            renderData = newData;
            selectedShapeIndex = renderData.shapes.length > 0 ? 0 : -1;
            
            renderShapes(renderData, { scene });
            updateShapeList();
        } catch (error) {
            alert('Invalid JSON: ' + error.message);
        }
    }

    // Initialize the application when the page loads
    window.addEventListener('load', init);
})();

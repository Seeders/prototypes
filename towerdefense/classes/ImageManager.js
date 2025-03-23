import * as THREE from "../library/three.module.min.js";

import { CONFIG } from "../config/config.js";

class ImageManager {
    constructor() {
        this.images = {};
        this.imageSize = CONFIG.IMAGE_SIZE;
        // Create a single reusable renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setSize(this.imageSize, this.imageSize);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.renderTarget = new THREE.WebGLRenderTarget(this.imageSize, this.imageSize);
        this.renderTarget.texture.flipY = true;
        
        // Create reusable scene
        this.scene = new THREE.Scene();
        
        // Create reusable cameras for different views
        const cameraDistance = 64;
        const frustumSize = cameraDistance + 16;
        const aspect = 1;
        
        this.cameras = [
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000), // Front
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000), // Left
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000), // Right
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000)  // Back
        ];
        
        this.cameras[0].position.set(cameraDistance, cameraDistance, cameraDistance);
        this.cameras[1].position.set(-cameraDistance, cameraDistance, cameraDistance);
        this.cameras[2].position.set(cameraDistance, cameraDistance, -cameraDistance);
        this.cameras[3].position.set(-cameraDistance, cameraDistance, -cameraDistance);
        this.cameras.forEach(camera => camera.lookAt(0, 0, 0));
        
        // Create reusable lights
        this.ambientLight = new THREE.AmbientLight(0xffaaff, 2);
        
        // Create a light group that will rotate with each camera view
        this.lightGroup = new THREE.Group();
        
        // Main directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffaa, 5);
        this.directionalLight.position.set(75, 96, 75);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.bias = -0.0005;
        this.directionalLight.shadow.normalBias = 0.02;
        this.directionalLight.shadow.radius = 1;
        this.lightGroup.add(this.directionalLight);
        
        // Fill light
        this.fillLight = new THREE.DirectionalLight(0xffaaff, 1);
        this.fillLight.position.set(-20, 30, -20);
        this.lightGroup.add(this.fillLight);
        
        // Create ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;
        this.ground.receiveShadow = true;
    }

    dispose() {
        // Proper cleanup when the manager is no longer needed
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        if (this.renderTarget) {
            this.renderTarget.dispose();
            this.renderTarget = null;
        }
        if (this.ground && this.ground.geometry) {
            this.ground.geometry.dispose();
            this.ground.material.dispose();
        }
        // Dispose of other reusable resources
        this.cameras = [];
        this.scene = null;
        this.lightGroup = null;
        this.ambientLight = null;
    }

    async loadImages(prefix, config) {
        for (const [type, cfg] of Object.entries(config)) {
            if (!cfg.render || !cfg.render.animations) continue;
            this.images[`${prefix}_${type}`] = await this.createAnimatedPlaceholder(cfg);
        }
    }

    async createAnimatedPlaceholder(config) {
        const animations = {};
        for (const [animType, frames] of Object.entries(config.render.animations)) {
            animations[animType] = [];
            let i = 0;
            for (const frame of frames) {
                const frameImages = await this.captureObjectImagesFromJSON(frame);
                const canvases = frameImages.map(img => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = this.imageSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    return canvas;
                });                
                animations[animType].push(canvases); // Array of 4 canvases per frame
            }
        }
        return animations; // { "idle": [[canvas0, canvas1, canvas2, canvas3], ...], "walk": [...] }
    }

    getImages(prefix, type) {
        return this.images[`${prefix}_${type}`]; // Returns animation object
    }
    
    async captureObjectImagesFromJSON(shapeData) {
        const size = this.imageSize;
        console.log(this.renderer);
        // Clear the scene
        while (this.scene.children.length > 0) {
            const object = this.scene.children[0];
            this.scene.remove(object);
        }
        
        // Add reusable elements to scene
        this.scene.add(this.ground);
        this.scene.add(this.ambientLight);
        this.scene.add(this.lightGroup);
        
        // Create objects from the JSON data
        const objectGroup = this.createObjectsFromJSON(shapeData);
        
        // Enable shadow casting and receiving for all objects
        objectGroup.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });
        
        this.scene.add(objectGroup);
        
        const images = [];
        
        // For each camera view, rotate the light group to match camera orientation
        for (let i = 0; i < this.cameras.length; i++) {
            const camera = this.cameras[i];
            
            // Reset light group rotation
            this.lightGroup.rotation.set(0, 0, 0);
            
            // Rotate light group to match camera position
            switch(i) {
                case 0: // Front camera
                    // No rotation needed - default position
                    this.lightGroup.rotation.y = Math.PI / 4; // 90 degrees
                    break;
                case 1: // Left camera
                    this.lightGroup.rotation.y = -Math.PI / 2 + Math.PI / 4; // 90 degrees
                    break;
                case 2: // Right camera
                    this.lightGroup.rotation.y = Math.PI / 2 + Math.PI / 4; // -90 degrees
                    break;
                case 3: // Back camera
                    this.lightGroup.rotation.y = Math.PI + Math.PI / 4; // 180 degrees
                    break;
            }
            // Before rendering with each camera, update shadow camera frustum
            const d = 100;
            this.directionalLight.shadow.camera.left = -d;
            this.directionalLight.shadow.camera.right = d;
            this.directionalLight.shadow.camera.top = d;
            this.directionalLight.shadow.camera.bottom = -d;
            // After rotating lightGroup in the camera loop
            this.directionalLight.shadow.camera.updateProjectionMatrix();
            this.directionalLight.shadow.camera.updateMatrixWorld();
            this.directionalLight.target.position.set(0, 0, 0);
            this.directionalLight.target.updateMatrixWorld();
            // Render and capture the image
            this.renderer.setRenderTarget(this.renderTarget);
            this.renderer.render(this.scene, camera);
            const buffer = new Uint8Array(size * size * 4);
            this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, size, size, buffer);
            
            // Flip the buffer (y-axis)
            const flippedBuffer = new Uint8Array(size * size * 4);
            for (let y = 0; y < size; y++) {
                const srcRowStart = y * size * 4;
                const destRowStart = (size - 1 - y) * size * 4;
                flippedBuffer.set(buffer.subarray(srcRowStart, srcRowStart + size * 4), destRowStart);
            }
            
            const imageData = new ImageData(new Uint8ClampedArray(flippedBuffer), size, size);
            const imageBitmap = await createImageBitmap(imageData);
            images.push(imageBitmap);
        }
        
        this.renderer.setRenderTarget(null);
        
        // Cleanup object geometries and materials
        objectGroup.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        // Remove object group from scene
        this.scene.remove(objectGroup);
        
        return images;
    }

    /**
     * Creates 3D objects from shape data.
     * @param {Object} shapeData - The JSON object containing shape definitions.
     * @returns {THREE.Group} - A group containing all 3D objects.
     */
    createObjectsFromJSON(shapeData) {
        const group = new THREE.Group(); // Group to hold all shapes

        shapeData.shapes.forEach(shape => {
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
                
                // Position and rotation
                mesh.position.set(shape.x || 0, shape.y || 0, shape.z || 0);
                
                // Handle rotation (convert from degrees to radians)
                if (shape.rotationX) mesh.rotation.x = shape.rotationX * Math.PI / 180;
                if (shape.rotationY) mesh.rotation.y = shape.rotationY * Math.PI / 180;
                if (shape.rotationZ) mesh.rotation.z = shape.rotationZ * Math.PI / 180;
                
                group.add(mesh);
            }
        });

        return group;
    }
}

export { ImageManager };
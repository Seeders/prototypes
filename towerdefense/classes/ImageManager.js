import * as THREE from "../library/three.module.min.js";

class ImageManager {
    constructor() {
        this.images = {};
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
            for (const frame of frames) {
                const frameImages = await this.captureObjectImagesFromJSON(frame);
                const canvases = frameImages.map(img => {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 64;
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
        const size = 64;
        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        renderer.setSize(size, size);
        
        const renderTarget = new THREE.WebGLRenderTarget(size, size);
        renderTarget.texture.flipY = true;

        const scene = new THREE.Scene();
        const light = new THREE.AmbientLight(0xffffff, 5);
        scene.add(light);

        const objectGroup = this.createObjectsFromJSON(shapeData);
        scene.add(objectGroup);

        const frustumSize = 48;
        const cameraDistance = 64;
        const aspect = 1;
        const cameras = [
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000), // Front
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000), // Left
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000), // Right
            new THREE.OrthographicCamera(-frustumSize * aspect, frustumSize * aspect, frustumSize, -frustumSize, 0.1, 1000)  // Back
        ];

        cameras[0].position.set(cameraDistance, cameraDistance, cameraDistance);
        cameras[1].position.set(-cameraDistance, cameraDistance, cameraDistance);
        cameras[2].position.set(cameraDistance, cameraDistance, -cameraDistance);
        cameras[3].position.set(-cameraDistance, cameraDistance, -cameraDistance);
        cameras.forEach(camera => camera.lookAt(0, 0, 0));

        const images = [];
        for (const camera of cameras) {
            renderer.setRenderTarget(renderTarget);
            renderer.render(scene, camera);
            const buffer = new Uint8Array(size * size * 4);
            renderer.readRenderTargetPixels(renderTarget, 0, 0, size, size, buffer);
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

        renderer.setRenderTarget(null);
        renderer.dispose();
        renderTarget.dispose();

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
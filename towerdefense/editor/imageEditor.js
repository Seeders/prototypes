(function() {
    const canvas = document.getElementById('terrain-image-editor');
    const gridCanvas = document.getElementById('terrain-grid-canvas')
    const pixelCtx = canvas.getContext('2d');
    const gridCtx = gridCanvas.getContext('2d');
    const ctx = canvas.getContext('2d');
    const colorValue = document.getElementById('terrainColor');
    const colorPicker = document.getElementById('terrain-image-color-picker');
    const output = document.getElementById('terrainImage');
    const saveImageButton = document.getElementById('terrain-save-image-button');
    const clearImageButton = document.getElementById('terrain-clear-image-button');
    const pencilButton = document.getElementById('terrain-pencil-button');
    const floodFillButton = document.getElementById('terrain-flood-fill-button');
    const spriteWidth = 24;
    const spriteHeight = 24;
    let currentTool = "pencil";
    // Initialize pixel data array (48 rows × 96 columns)
    let pixelData = Array(48).fill().map(() => Array(96).fill('#ffffff'));

    // Draw initial grid with sprite boundaries
    function drawGrid() {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        gridCtx.strokeStyle = '#888888';
        gridCtx.lineWidth = 0.5;
        gridCtx.imageSmoothingEnabled = false;

        // Vertical lines
        for (let x = 0; x <= 96; x += spriteWidth) {
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, 48);
            gridCtx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= 48; y += spriteHeight) {
            gridCtx.beginPath();
            gridCtx.moveTo(0, y);
            gridCtx.lineTo(96, y);
            gridCtx.stroke();
        }
    }

    // Handle drawing
    let isDrawing = false;
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        if (currentTool == "fill") {
            floodFill(e);
        } else {
            draw(e);
        }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing && currentTool == "pencil") draw(e);
    });
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseleave', () => isDrawing = false);

    function draw(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x >= 0 && x < 96 && y >= 0 && y < 48) {
            pixelData[y][x] = colorPicker.value;
            ctx.fillStyle = colorPicker.value;
            ctx.fillRect(x, y, 1, 1);
        }
        saveCanvasToBase64();
    }

    // Clear canvas
    function clearCanvas() {
        pixelData = Array(48).fill().map(() => Array(96).fill('#ffffff'));
        // Redraw the canvas based on pixelData
        for (let y = 0; y < pixelData.length; y++) {
            for (let x = 0; x < pixelData[y].length; x++) {
                pixelCtx.fillStyle = pixelData[y][x];
                pixelCtx.fillRect(x, y, 1, 1);
            }
        }
    }


    function saveCanvasToBase64(format = 'png', quality = 1.0) {
        // Define the sprite sheet dimensions
        const tileWidth = 24;
        const tileHeight = 24;
        const tilesX = 4; // 4 tiles wide
        const tilesY = 2; // 2 tiles high
    
        // Validate format
        const validFormats = ['png', 'jpeg', 'webp'];
        if (!validFormats.includes(format)) {
            console.warn(`Unsupported format: ${format}. Defaulting to 'png'.`);
            format = 'png';
        }
    
        // Validate quality (for JPEG/WebP, between 0 and 1)
        if (typeof quality !== 'number' || quality < 0 || quality > 1) {
            console.warn("Quality must be between 0 and 1. Defaulting to 1.0.");
            quality = 1.0;
        }
    
        // Array to store the 8 Base64 strings
        const base64Tiles = [];
    
        try {
            // Create a temporary canvas to hold the sprite sheet without the grid
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
    
            // Create an ImageData object to manipulate pixels
            const imageData = tempCtx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;
    
            // Convert pixel data to ImageData with transparency
            for (let y = 0; y < pixelData.length; y++) {
                for (let x = 0; x < pixelData[y].length; x++) {
                    const index = (y * canvas.width + x) * 4;
                    const color = pixelData[y][x];
    
                    // Check if the color is white (#FFFFFF or #ffffff)
                    if (color.toLowerCase() === '#ffffff') {
                        // Set transparent pixel
                        data[index] = 0;     // R
                        data[index + 1] = 0; // G
                        data[index + 2] = 0; // B
                        data[index + 3] = 0; // A (fully transparent)
                    } else {
                        // Convert hex to RGB
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);
    
                        data[index] = r;     // R
                        data[index + 1] = g; // G
                        data[index + 2] = b; // B
                        data[index + 3] = 255; // A (fully opaque)
                    }
                }
            }
    
            // Put the modified ImageData back to the canvas
            tempCtx.putImageData(imageData, 0, 0);
    
            // Array to store the 8 Base64 tiles
            const base64Tiles = [];
    
            // Loop through the 4x2 grid (8 tiles total)
            for (let y = 0; y < tilesY; y++) {
                for (let x = 0; x < tilesX; x++) {
                    // Create a temporary canvas for each tile
                    const tileCanvas = document.createElement('canvas');
                    tileCanvas.width = tileWidth;
                    tileCanvas.height = tileHeight;
                    const tileCtx = tileCanvas.getContext('2d');
    
                    // Calculate the source position on the temporary canvas
                    const srcX = x * tileWidth;
                    const srcY = y * tileHeight;
    
                    // Draw the tile onto the tile canvas
                    tileCtx.drawImage(
                        tempCanvas, // Source canvas (with transparency)
                        srcX, srcY, tileWidth, tileHeight, // Source rectangle
                        0, 0, tileWidth, tileHeight // Destination rectangle
                    );
    
                    // Convert the tile canvas to a data URL
                    const dataUrl = tileCanvas.toDataURL(`image/${format}`, quality);
    
                    // Extract the Base64 string (remove the prefix)
                    const base64String = dataUrl.split(',')[1];
    
                    // Add to the array
                    base64Tiles.push(base64String);
                }
            }
    
            // Save the array of 8 Base64 strings to the output
            output.value = JSON.stringify(base64Tiles);
        } catch (error) {
            console.error("Failed to convert canvas to Base64 tiles:", error);
            return null;
        }
    }


    saveImageButton.addEventListener('click', saveCanvasToBase64);
    clearImageButton.addEventListener('click', clearCanvas);
    floodFillButton.addEventListener('click', () => setTool("fill"));
    pencilButton.addEventListener('click', () => setTool("pencil"));


    document.body.addEventListener('editTerrainImage', (event) => {
        colorPicker.value = colorValue.value;        
        displayBase64OnCanvas(fillPixelDataFromCanvas);
    });
    // Flood fill implementation
    function floodFill(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        if (x < 0 || x >= 96 || y < 0 || y >= 48) return;

        const targetColor = pixelData[y][x];
        const fillColor = colorPicker.value;

        if (targetColor === fillColor) return; // No change needed

        // Queue-based flood fill (non-recursive to avoid stack overflow)
        const queue = [[x, y]];
        while (queue.length > 0) {
            const [currX, currY] = queue.shift();
            
            if (currX < 0 || currX >= 96 || currY < 0 || currY >= 48) continue;
            if (pixelData[currY][currX] !== targetColor) continue;

            pixelData[currY][currX] = fillColor;
            ctx.fillStyle = fillColor;
            ctx.fillRect(currX, currY, 1, 1);

            // Add adjacent pixels to queue
            queue.push([currX + 1, currY]);
            queue.push([currX - 1, currY]);
            queue.push([currX, currY + 1]);
            queue.push([currX, currY - 1]);
        }

        saveCanvasToBase64();
        drawGrid();
    }
       // Toggle flood fill mode
    function setTool(toolName) {
        currentTool = toolName;
    }
    function displayBase64OnCanvas(callback = () => {}) {
        const base64Array = JSON.parse(output.value);
        // Define the sprite sheet dimensions
        const tileWidth = 24;
        const tileHeight = 24;
        const tilesX = 4; // 4 tiles wide
        const tilesY = 2; // 2 tiles high
    
        // Set the main canvas dimensions
        canvas.width = tileWidth * tilesX; // 96 pixels
        canvas.height = tileHeight * tilesY; // 48 pixels
        gridCanvas.width = tileWidth * tilesX;
        gridCanvas.height = tileHeight * tilesY;
        // Counter to track loaded images
        let loadedImages = 0;
    
        // Loop through the 4x2 grid (8 tiles total)
        base64Array.forEach((base64String, index) => {
            // Create an Image object for each tile
            const img = new Image();
    
            // Calculate the position on the canvas
            const x = (index % tilesX) * tileWidth; // Column (0, 24, 48, 72)
            const y = Math.floor(index / tilesX) * tileHeight; // Row (0, 24)
    
            // When the image loads, draw it on the canvas at the correct position
            img.onload = function() {
                pixelCtx.drawImage(img, x, y, tileWidth, tileHeight);
                loadedImages++;
    
                // Draw the grid and call the callback after all images are loaded
                if (loadedImages === base64Array.length) {
                    drawGrid();
                    callback(); // Call the callback (e.g., fillPixelDataFromCanvas)
                }
            };
    
            // Handle errors in case the Base64 string is invalid
            img.onerror = function() {
                console.error(`Failed to load image from Base64 string at index ${index}.`);
                loadedImages++;
    
                // Still attempt to draw the grid and call the callback even if an image fails
                if (loadedImages === base64Array.length) {
                    drawGrid();
                    callback();
                }
            };
    
            // Set the Base64 string as the image source
            if (!base64String.startsWith('data:image/')) {
                base64String = 'data:image/png;base64,' + base64String;
            }
            img.src = base64String;
        });
    }
    function fillPixelDataFromCanvas() {
        // Validate the canvas
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            console.error("Invalid canvas element!");
            return false;
        }
    
        // Validate canvas dimensions (should be 96x48 for a 4x2 sprite sheet with 24x24 tiles)
        const expectedWidth = 96; // 4 tiles × 24 pixels
        const expectedHeight = 48; // 2 tiles × 24 pixels
        if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
            console.error(`Canvas dimensions must be ${expectedWidth}x${expectedHeight} for a 4x2 sprite sheet!`);
            return false;
        }
    
        // Validate pixelData array dimensions
        if (!Array.isArray(pixelData) || pixelData.length !== expectedHeight || !pixelData.every(row => Array.isArray(row) && row.length === expectedWidth)) {
            console.error(`pixelData must be a 2D array with dimensions ${expectedHeight}x${expectedWidth}!`);
            return false;
        }
    
        try {
            // Get the canvas context
            const ctx = canvas.getContext('2d');
    
            // Get the image data from the entire canvas
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data; // Uint8ClampedArray with RGBA values
    
            // Loop through each pixel on the canvas
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    // Calculate the index in the flat data array
                    const index = (y * canvas.width + x) * 4;
    
                    // Extract RGBA values
                    const r = data[index];     // Red (0-255)
                    const g = data[index + 1]; // Green (0-255)
                    const b = data[index + 2]; // Blue (0-255)
                    // Ignore alpha (data[index + 3]) since hex codes typically don't include it
    
                    // Convert to hex
                    const hex = rgbToHex(r, g, b);
    
                    // Store in pixelData[y][x]
                    pixelData[y][x] = hex;
                }
            }
    
            drawGrid();
            return true;
        } catch (error) {
            console.error("Failed to extract pixel data from canvas:", error);
            return false;
        }
    }
    
    // Helper function to convert RGB values to a hex color code
    function rgbToHex(r, g, b) {
        // Convert each component to a two-digit hex string
        const toHex = (value) => {
            const hex = Math.max(0, Math.min(255, value)).toString(16); // Clamp to 0-255
            return hex.length === 1 ? '0' + hex : hex; // Pad with 0 if needed
        };
    
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }
    drawGrid();

})();



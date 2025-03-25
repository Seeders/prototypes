(function() {
    const output = document.getElementById('terrainImage');
    const fileInput = document.getElementById('terrain-image-upload');
    const displayImage = document.getElementById('terrain-image-display');

    // Sprite sheet dimensions
    const tileWidth = 24;
    const tileHeight = 24;
    const tilesX = 4; // 4 tiles wide
    const tilesY = 1; // Now 1 row instead of 2

    // Function to handle image upload and conversion
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Create a temporary canvas to process the image
                const canvas = document.createElement('canvas');
                canvas.width = tileWidth * tilesX;
                canvas.height = tileHeight * tilesY; // Now height matches original width

                const ctx = canvas.getContext('2d');
                
                // Set transparent background
                ctx.globalCompositeOperation = 'source-over';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw the uploaded image, scaling to fit the canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to base64 tiles with vertical flips
                const base64Tiles = convertCanvasToBase64Tiles(canvas);
                
                // Save base64 tiles to output
                output.value = JSON.stringify(base64Tiles);

                // Display the original uploaded image
                displayImage.src = e.target.result;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Function to convert canvas to array of base64 tiles with vertical flips
    function convertCanvasToBase64Tiles(canvas, format = 'png', quality = 1.0) {
        const base64Tiles = [];

        // First, process the first row of tiles normally
        for (let x = 0; x < tilesX; x++) {
            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = tileWidth;
            tileCanvas.height = tileHeight;
            const tileCtx = tileCanvas.getContext('2d');

            // Calculate the source position on the main canvas
            const srcX = x * tileWidth;
            const srcY = 0;

            // Get the image data for this tile
            const imageData = canvas.getContext('2d').getImageData(
                srcX, srcY, tileWidth, tileHeight
            );

            // Put the image data on the tile canvas
            tileCtx.putImageData(imageData, 0, 0);

            // Convert the tile canvas to a data URL
            const dataUrl = tileCanvas.toDataURL(`image/${format}`, quality);

            // Extract the Base64 string (remove the prefix)
            const base64String = dataUrl.split(',')[1];

            // Add to the array
            base64Tiles.push(base64String);
        }

        // Now create vertically flipped versions of the first row
        for (let x = 0; x < tilesX; x++) {
            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = tileWidth;
            tileCanvas.height = tileHeight;
            const tileCtx = tileCanvas.getContext('2d');

            // Calculate the source position on the main canvas
            const srcX = x * tileWidth;
            const srcY = 0;

            // Get the image data for this tile
            const imageData = canvas.getContext('2d').getImageData(
                srcX, srcY, tileWidth, tileHeight
            );

            // Create a new ImageData for the flipped tile
            const flippedImageData = new ImageData(tileWidth, tileHeight);
            for (let y = 0; y < tileHeight; y++) {
                for (let x = 0; x < tileWidth; x++) {
                    const srcIndex = (y * tileWidth + x) * 4;
                    const destIndex = ((tileHeight - 1 - y) * tileWidth + x) * 4;
                    
                    flippedImageData.data[destIndex] = imageData.data[srcIndex];     // R
                    flippedImageData.data[destIndex + 1] = imageData.data[srcIndex + 1]; // G
                    flippedImageData.data[destIndex + 2] = imageData.data[srcIndex + 2]; // B
                    flippedImageData.data[destIndex + 3] = imageData.data[srcIndex + 3]; // A
                }
            }

            // Put the flipped image data on the tile canvas
            tileCtx.putImageData(flippedImageData, 0, 0);

            // Convert the tile canvas to a data URL
            const dataUrl = tileCanvas.toDataURL(`image/${format}`, quality);

            // Extract the Base64 string (remove the prefix)
            const base64String = dataUrl.split(',')[1];

            // Add to the array
            base64Tiles.push(base64String);
        }

        return base64Tiles;
    }

    // Function to display stored base64 tiles
    function displayStoredBase64Tiles() {
        // Check if there are stored base64 tiles
        if (!output.value) return;

        try {
            // Parse the stored base64 tiles
            const base64Tiles = JSON.parse(output.value);

            // Validate the number of tiles
            if (!Array.isArray(base64Tiles) || base64Tiles.length !== 8) {
                console.error('Invalid base64 tiles array');
                return;
            }

            // If we've gotten to this point and there's no image src, we'll try 
            // to recreate the original image from the base64 tiles

            const img = new Image();
            const canvas = document.createElement('canvas');
            canvas.width = tileWidth * tilesX;
            canvas.height = tileHeight * tilesY;
            const ctx = canvas.getContext('2d');

            let loadedImages = 0;
            const tileImages = new Array(8).fill(null);

            base64Tiles.forEach((base64String, index) => {
                const tileImg = new Image();
                tileImg.onload = function() {
                    tileImages[index] = tileImg;
                    loadedImages++;

                    // Once all images are loaded, draw them
                    if (loadedImages === base64Tiles.length) {
                        // Draw first row of tiles
                        for (let x = 0; x < tilesX; x++) {
                            ctx.drawImage(tileImages[x], x * tileWidth, 0);
                        }

                        // Set the final image
                        displayImage.src = canvas.toDataURL('image/png');
                    }
                };

                // Ensure the base64 string has the correct data URL prefix
                if (!base64String.startsWith('data:image/')) {
                    base64String = 'data:image/png;base64,' + base64String;
                }
                tileImg.src = base64String;
            });
            

        } catch (error) {
            console.error('Error parsing stored base64 tiles:', error);
        }
    }

    // Add event listeners
    fileInput.addEventListener('change', handleImageUpload);

    document.body.addEventListener('editTerrainImage', (event) => {
        displayStoredBase64Tiles();
    });

})();
(function() {
    const output = document.getElementById('terrainImage');
    const fileInput = document.getElementById('terrain-image-upload');
    const displayImage = document.getElementById('terrain-image-display');

    // Sprite sheet dimensions
    const tileWidth = 24;
    const tileHeight = 24;
    const tilesX = 4; // 4 tiles wide
    const tilesY = 2; // 2 tiles high

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
                canvas.height = tileHeight * tilesY;

                const ctx = canvas.getContext('2d');
                
                // Set transparent background
                ctx.globalCompositeOperation = 'source-over';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw the uploaded image, scaling to fit the canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to base64 tiles
                const base64Tiles = convertCanvasToBase64Tiles(canvas);
                
                // Save base64 tiles to output
                output.value = JSON.stringify(base64Tiles);

                // Create a composite image from the tiles
                createCompositeImage(base64Tiles);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Function to convert canvas to array of base64 tiles
    function convertCanvasToBase64Tiles(canvas, format = 'png', quality = 1.0) {
        const base64Tiles = [];

        // Loop through the 4x2 grid (8 tiles total)
        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                // Create a temporary canvas for each tile
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = tileWidth;
                tileCanvas.height = tileHeight;
                const tileCtx = tileCanvas.getContext('2d');

                // Set transparent background
                tileCtx.globalCompositeOperation = 'source-over';
                tileCtx.clearRect(0, 0, tileWidth, tileHeight);

                // Calculate the source position on the main canvas
                const srcX = x * tileWidth;
                const srcY = y * tileHeight;

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
        }

        return base64Tiles;
    }

    // Function to create a composite image from base64 tiles
    function createCompositeImage(base64Tiles) {
        // Create a temporary canvas to combine tiles
        const canvas = document.createElement('canvas');
        canvas.width = tileWidth * tilesX;
        canvas.height = tileHeight * tilesY;
        const ctx = canvas.getContext('2d');

        // Set transparent background
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Counter to track loaded images
        let loadedImages = 0;

        // Loop through the base64 tiles
        base64Tiles.forEach((base64String, index) => {
            const img = new Image();

            // Calculate the position on the canvas
            const x = (index % tilesX) * tileWidth;
            const y = Math.floor(index / tilesX) * tileHeight;

            img.onload = function() {
                // Draw the image with proper transparency
                ctx.drawImage(img, x, y, tileWidth, tileHeight);
                loadedImages++;

                // If all images are loaded, set the composite image
                if (loadedImages === base64Tiles.length) {
                    displayImage.src = canvas.toDataURL('image/png');
                }
            };

            img.onerror = function() {
                console.error(`Failed to load tile at index ${index}`);
                loadedImages++;
            };

            // Ensure the base64 string has the correct data URL prefix
            if (!base64String.startsWith('data:image/')) {
                base64String = 'data:image/png;base64,' + base64String;
            }
            img.src = base64String;
        });
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

            // Create composite image from stored tiles
            createCompositeImage(base64Tiles);

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
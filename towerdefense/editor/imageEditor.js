(function() {
    const canvas = document.getElementById('terrain-image-editor');
    const ctx = canvas.getContext('2d');
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
        ctx.imageSmoothingEnabled = false;
        // Fill pixels
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 96; x++) {
                ctx.fillStyle = pixelData[y][x];
                ctx.fillRect(x, y, 1, 1);
            }
        }
        // Draw grid lines
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= 96; x += spriteWidth) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 48);
            ctx.stroke();
        }
        for (let y = 0; y <= 48; y += spriteHeight) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(96, y);
            ctx.stroke();
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
        if (isDrawing && !currentTool == "pencil") draw(e);
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
        saveImage();
        drawGrid();
    }

    // Clear canvas
    function clearCanvas() {
        pixelData = Array(48).fill().map(() => Array(96).fill('#ffffff'));
        drawGrid();
    }

    // Save as 2D hex array
    function saveImage() {
        const jsonString = JSON.stringify(pixelData, null, 2);
        output.value = jsonString;
        navigator.clipboard.writeText(jsonString)
            .then(() => console.log('Copied to clipboard'))
            .catch(err => console.error('Failed to copy:', err));
    }

    function loadFromTextarea() {
        try {
            const newData = JSON.parse(output.value);
            // Validate dimensions
            if (newData.length === 48 && newData.every(row => row.length === 96)) {
                // Validate hex colors
                const isValidHex = newData.every(row => 
                    row.every(color => /^#[0-9A-Fa-f]{6}$/.test(color))
                );
                if (isValidHex) {
                    pixelData = newData;
                    drawGrid();
                } else {
                    alert('Invalid hex colors in data');
                }
            } else {
                alert('Data must be a 48×96 array');
            }
        } catch (e) {
            alert('Invalid JSON: ' + e.message);
        }
    }
    saveImageButton.addEventListener('click', saveImage);
    clearImageButton.addEventListener('click', clearCanvas);
    floodFillButton.addEventListener('click', () => setTool("fill"));
    pencilButton.addEventListener('click', () => setTool("pencil"));


    document.body.addEventListener('editTerrainImage', (event) => {
        loadFromTextarea();
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

        saveImage();
    }
       // Toggle flood fill mode
    function setTool(toolName) {
        currentTool = toolName;
    }

    // Initial draw
    drawGrid();

})();
class AIPromptPanel {
    constructor(gameEditor) {
        this.gameEditor = gameEditor;
        this.elements = {
            aiPromptModal: null,
            promptTextarea: null,
            generateBtn: null,
            sendBtn: null,
            previewArea: null
        };
        this.init();
    }

    init() {
        // Create the AI Prompt Modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'ai-prompt-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>AI Object Generator</h2>
                <div class="form-group">
                    <label for="ai-prompt-textarea">Prompt:</label>
                    <textarea id="ai-prompt-textarea" rows="6" placeholder="Enter your AI generation prompt"></textarea>
                </div>
                <div class="actions">
                    <button id="send-ai-prompt-btn" class="primary">Send to AI</button>
                    <button id="close-ai-prompt-modal">Cancel</button>
                </div>
                <div class="preview-section">
                    <h3>AI Response Preview</h3>
                    <pre id="ai-response-preview"></pre>
                    <div class="preview-actions">
                        <button id="apply-ai-response-btn" class="primary" style="display:none;">Apply Response</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Cache elements
        this.elements = {
            aiPromptModal: modal,
            promptTextarea: modal.querySelector('#ai-prompt-textarea'),
            sendBtn: modal.querySelector('#send-ai-prompt-btn'),
            closeBtn: modal.querySelector('#close-ai-prompt-modal'),
            previewArea: modal.querySelector('#ai-response-preview'),
            applyBtn: modal.querySelector('#apply-ai-response-btn')
        };

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {


        // Send to AI Button
        this.elements.sendBtn.addEventListener('click', () => this.sendPromptToAI());

        // Close Modal Button
        this.elements.closeBtn.addEventListener('click', () => {
            this.elements.aiPromptModal.classList.remove('show');
        });

        // Apply Response Button
        this.elements.applyBtn.addEventListener('click', () => {
            this.applyAIResponse();
        });
    }

    getCurrentObjectContext() {
        const { selectedType, selectedObject, objectTypes } = this.gameEditor.state;
        return objectTypes[selectedType][selectedObject] || {};
    }

    generateContextPrompt(object) {
        const type = this.gameEditor.getSingularType(this.gameEditor.state.selectedType);
        const contextDescription = `
Generate a new ${type} object based on the following existing context:

${JSON.stringify(object, null, 2)}

Please provide ONLY a valid JSON object with properties similar to the context above. Ensure all existing key types are maintained.
        `;
        return contextDescription.trim();
    }

    async sendPromptToAI() {
        const prompt = this.elements.promptTextarea.value;
        
        try {
            const response = await fetch('/ai-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error('AI generation failed');
            }

            const responseData = await response.json();
            
            // Validate JSON response
            try {
                const parsedResponse = JSON.parse(responseData.result);
                this.elements.previewArea.textContent = JSON.stringify(parsedResponse, null, 2);
                this.elements.applyBtn.style.display = 'block';
            } catch (parseError) {
                this.elements.previewArea.textContent = 'Invalid JSON response from AI';
                this.elements.applyBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('AI Generation Error:', error);
            this.elements.previewArea.textContent = `Error: ${error.message}`;
        }
    }

    applyAIResponse() {
        try {
            const responseText = this.elements.previewArea.textContent;
            const parsedResponse = JSON.parse(responseText);
            
            const { selectedType, selectedObject } = this.gameEditor.state;
            
            // Update the current object with AI-generated data
            this.gameEditor.state.objectTypes[selectedType][selectedObject] = parsedResponse;
            
            // Re-render and select the object
            this.gameEditor.renderObjectList();
            this.gameEditor.selectObject(selectedObject);
            this.gameEditor.saveToLocalStorage();
            
            // Close the modal
            this.elements.aiPromptModal.classList.remove('show');
        } catch (error) {
            console.error('Error applying AI response:', error);
            alert('Failed to apply AI response. Please check the JSON format.');
        }
    }

    showModal() {
        // Generate initial context
        const currentObject = this.getCurrentObjectContext();
        this.elements.promptTextarea.value = this.generateContextPrompt(currentObject);
        
        // Reset preview
        this.elements.previewArea.textContent = '';
        this.elements.applyBtn.style.display = 'none';
        
        // Show modal
        this.elements.aiPromptModal.classList.add('show');
    }
}

export { AIPromptPanel }
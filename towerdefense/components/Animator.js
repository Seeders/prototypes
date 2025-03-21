import { Component } from "./Component.js";

class Animator extends Component {
    constructor(game, parent, prefix, type) {
        super(game, parent);
        this.animations = game.imageManager.getImages(prefix, type); // { "idle": [...], "walk": [...] }
        this.currentAnimation = "idle";
        if(this.animations.walk) this.currentAnimation = "walk";
        this.currentFrame = 0;
        this.frameDuration = 10; // 10 frames per animation frame (~0.166s at 60 FPS)
        this.frameTimer = 0;
    }

    update() {
        this.frameTimer++;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            const animFrames = this.animations[this.currentAnimation];
            this.currentFrame = (this.currentFrame + 1) % animFrames.length;
        }

        // Sync direction with Renderer (if separate)
        const renderer = this.parent.getComponent("Renderer");
        if (renderer) {
            renderer.images = this.animations[this.currentAnimation][this.currentFrame];
        }
    }

    setAnimation(animationType) {
        if (this.animations[animationType] && this.currentAnimation !== animationType) {
            this.currentAnimation = animationType;
            this.currentFrame = 0;
            this.frameTimer = 0;
        }
    }
}


export { Animator };
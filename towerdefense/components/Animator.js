import { Component } from "../engine/Component.js";

class Animator extends Component {
    constructor(game, parent, prefix, type) {
        super(game, parent);
        this.animations = game.imageManager.getImages(prefix, type); // { "idle": [...], "walk": [...] }
        this.currentAnimation = "idle";
        if(this.animations.walk) this.currentAnimation = "walk";
        this.currentFrame = 0;
        this.frameDuration = 10; // 10 frames per animation frame (~0.166s at 60 FPS)
        this.frameTimer = 0;

        this.baseSpeed = this.parent.getComponent("stats").stats.speed || 1;
    }

    update() {
        this.frameTimer++;
        let currentSpeedPercent = this.parent.getComponent("stats").stats.speed / this.baseSpeed || 1;
        if (this.frameTimer >= this.frameDuration / currentSpeedPercent) {
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
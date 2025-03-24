class Component {
    constructor(game, parent) {
        this.game = game;
        this.parent = parent;
    }
    getComponent(type) {
        return this.parent.getComponent(type);
    }
    update() {}
    destroy() {}
}

export { Component };
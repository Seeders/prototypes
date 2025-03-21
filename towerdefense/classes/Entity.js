class Entity {
    constructor(game, x, y) {
        this.game = game;
        this.position = { x: x, y: y };
        this.components = [];
        this.renderers = [];
        this.destroyed = false;        
        this.id = ++game.entityId;
    }

    getComponent(name) {
        return this.components[name.toLowerCase()];
    }
    addRenderer(ComponentClass, ...params) {
        let renderer = this.addComponent(ComponentClass, ...params);
        this.renderers.push(renderer);
        return renderer;
    }
    addComponent(ComponentClass, ...params) {
        const component = new ComponentClass(this.game, this, ...params);
        this.components[ComponentClass.name.toLowerCase()] = component;
        return component;
    }
    removeComponent(component) {
        let index = this.components.indexOf(component);
        if( index >= 0 ) {
            this.components.splice(index, 1);
        }
    }
    update() {   

        for(let c in this.components) {
            this.components[c].update();   
            if(this.destroyed) break;
        }
        return !this.destroyed;
    }
    draw() {
        if( this.renderers.length ) {
            this.renderers.forEach( (r) => r.draw() );
        }
    }
    destroy() {
        this.destroyed = true;
        for(let c in this.components) {
            this.components[c].destroy();   
        }
    }
}
export { Entity };
class Upgrade { 
    constructor(id, title, desc, icon, appliesTo, condition, apply, onAcquire) {
        this.id = id;
        this.title = title;
        this.desc = desc;
        this.icon = icon;
        this.appliesTo = appliesTo;
        this.conditionFn = condition;
        this.applyFn = apply;
        this.onAcquire = onAcquire;        
    }

    canApply(gameState) {
        return this.conditionFn(gameState);
    }

    apply(s, add, mul) {
        this.applyFn(s, add, mul);
    }
}

export { Upgrade };
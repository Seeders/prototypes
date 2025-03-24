import { Component } from "../engine/Component.js";

class Buildable extends Component {
    constructor(game, parent) {
        super(game, parent);
        this.placed = false;
    }
}

export { Buildable };
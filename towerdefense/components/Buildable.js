import { Component } from "../engine/Component.js";

class Buildable extends Component {
    init() {        
        this.placed = false;
    }
}

export { Buildable };
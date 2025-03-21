import { Component } from "./Component.js";

class Leveler extends Component {
    constructor(game, parent, level = 1) {
        super(game, parent);
        this.level = level;
    }
}
export { Leveler };
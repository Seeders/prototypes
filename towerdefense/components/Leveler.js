import { Component } from "../engine/Component.js";

class Leveler extends Component {
    init( level = 1) {
        this.level = level;
    }
}
export { Leveler };
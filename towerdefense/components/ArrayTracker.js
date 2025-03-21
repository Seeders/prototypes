import { Component } from "./Component.js";

class ArrayTracker extends Component {
    constructor(game, parent, arr) {
        super(game, parent);
        this.arr = arr;
        if(!this.game.state[this.arr]){
            this.game.state[this.arr] = [];
        }
        this.game.state[this.arr].push(this.parent);
    }

    destroy(){
        let index = this.game.state[this.arr].indexOf(this.parent);
        this.game.state[this.arr].splice(index, 1);        
    }
}    


export { ArrayTracker };
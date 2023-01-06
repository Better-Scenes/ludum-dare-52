import Phaser from "phaser";

export default class Demo extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image('cranberry', 'assets/cranberry.png');
  }

  create() {
    const cranberry = this.add.image(400, 70, 'cranberry');


  }
}

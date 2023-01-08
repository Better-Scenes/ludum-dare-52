import Phaser from "phaser";

export default class Menu extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  preload() {
    // todo: no-op
  }

  create() {
    this.add
      .text(0, 0, "Start game", {
        fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.newGame());
  }

  update(time: number, delta: number): void {
    // todo: no-op
  }

  newGame() {
    this.scene.start("GameScene");
  }
}

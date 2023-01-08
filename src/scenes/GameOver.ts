import Phaser from "phaser";

export default class GameOver extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  preload() {
    // todo: no-op
  }

  create() {
    this.add
      .text(0, 0, "GAME OVER", {
        fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.returnMenu());
  }

  update(time: number, delta: number): void {
    // todo: no-op
  }

  returnMenu() {
    this.scene.start("Menu");
  }
}

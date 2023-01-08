import Phaser from "phaser";

import {
  renderTextAt,
  getScreenHalfWidth,
  getScreenHalfHeight,
} from "../utils";

export default class Menu extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  preload() {
    // todo: no-op
  }

  create() {
    renderTextAt(
      this,
      "Bogger",
      getScreenHalfWidth(),
      getScreenHalfHeight() - 50
    ).setFontSize(36);
    renderTextAt(
      this,
      "A game of collecting cranberries",
      getScreenHalfWidth(),
      getScreenHalfHeight() + 25
    );

    renderTextAt(
      this,
      "Start Game",
      getScreenHalfWidth(),
      getScreenHalfHeight() + 50
    )
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

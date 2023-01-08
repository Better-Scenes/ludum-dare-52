import Phaser from "phaser";
import {
  renderTextAt,
  getScreenHalfWidth,
  getScreenHalfHeight,
} from "../utils";

interface GameOverProps {
  score: number;
}

export default class GameOver extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  preload() {
    // todo: no-op
  }

  create(input: GameOverProps) {
    renderTextAt(
      this,
      "GAME OVER",
      getScreenHalfWidth(),
      getScreenHalfHeight() - 25
    )
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.returnMenu());

    renderTextAt(
      this,
      `You scored: ${input.score}`,
      getScreenHalfWidth(),
      getScreenHalfHeight() + 25
    );
  }

  update(time: number, delta: number): void {
    // todo: no-op
  }

  returnMenu() {
    this.scene.start("Menu");
  }
}

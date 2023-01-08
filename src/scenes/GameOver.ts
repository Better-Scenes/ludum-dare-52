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
      "Game Over",
      getScreenHalfWidth(),
      getScreenHalfHeight() - 50
    ).setFontSize(36);

    renderTextAt(
      this,
      `You scored: ${input.score}`,
      getScreenHalfWidth(),
      getScreenHalfHeight() + 25
    );

    renderTextAt(
      this,
      "Return to Menu",
      getScreenHalfWidth(),
      getScreenHalfHeight() + 50
    )
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.scene.start("Menu", { score: input.score });
      });
  }

  update(time: number, delta: number): void {
    // todo: no-op
  }
}
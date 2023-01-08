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
    this.load.image("water", "assets/water.png");
  }

  create(input: GameOverProps) {
    const water = this.add.tileSprite(400, 300, 800, 600, "water");

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

    const highScore = localStorage.getItem("highScore");
    let intHighScore = highScore ? parseInt(highScore) : 0;
    if (input.score > intHighScore) {
      intHighScore = input.score;
      renderTextAt(
        this,
        `That is a new high score!`,
        getScreenHalfWidth(),
        getScreenHalfHeight() + 50
      );
    }
    localStorage.setItem("highScore", `${intHighScore}`);

    renderTextAt(
      this,
      "Return to Menu",
      getScreenHalfWidth(),
      getScreenHalfHeight() + 75
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

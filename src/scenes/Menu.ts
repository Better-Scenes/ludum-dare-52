import Phaser from "phaser";
import config from "../config";

import {
  renderTextAt,
  getScreenHalfWidth,
  getScreenHalfHeight,
  getRandomInt,
  textStyle,
} from "../utils";

export default class Menu extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  preload() {
    this.load.image("cranberry", "assets/cranberry.png");
    this.load.image("water", "assets/water.png");
  }

  create(input: object) {
    const water = this.add.tileSprite(400, 300, 800, 600, "water");
    this.createBerries(300, 10, 10, config.scale?.width, config.scale?.height);

    const mouseCircle = this.matter.add.circle(500, 500, 25, { mass: 0.1 });
    this.input.on("pointermove", (pointer) => {
      mouseCircle.position.x = pointer.worldX;
      mouseCircle.position.y = pointer.worldY;
    });

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
      getScreenHalfHeight() - 20
    );

    this.add.text(
      250,
      300,
      `Controls:
    WASD movement
    Space to extend the boom
    Shift to retract`,
      textStyle
    );

    this.add.text(
      250,
      380,
      `Goal:
      Collect the cranberries in the collector
      Save spiders to increase time limit`,
      textStyle
    );

    renderTextAt(
      this,
      "Start Game",
      getScreenHalfWidth(),
      getScreenHalfHeight() + 150
    )
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.newGame());

    if (input.score) {
      renderTextAt(
        this,
        `Your score in the previous game: ${input.score}`,
        getScreenHalfWidth(),
        getScreenHalfHeight() + 100
      );
    }
  }

  update(time: number, delta: number): void {}

  newGame() {
    this.scene.start("GameScene");
  }

  createBerries(
    count: number,
    startX: number,
    startY: number,
    xrange = 10,
    yrange = 10
  ) {
    for (let i = 0; i < count; i++) {
      const berry = this.matter.add.image(
        getRandomInt(startX, startX + xrange),
        getRandomInt(startY, startY + yrange),
        "cranberry",
        0,
        { mass: 0.1, scale: { x: 1, y: 1 }, frictionAir: 0.04 }
      );
    }
  }
}

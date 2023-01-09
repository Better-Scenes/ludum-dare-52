import Phaser from "phaser";
import config from "../config";
import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";

import {
  assets,
  renderTextAt,
  getScreenHalfWidth,
  getScreenHalfHeight,
  getRandomInt,
  textStyle,
} from "../utils";

let isMusicPlaying = false;

export default class Menu extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  preload() {
    this.load.scenePlugin({
      key: "rexuiplugin",
      url: UIPlugin,
      sceneKey: "rexUI",
    });
    this.load.image(assets.CRANBERRY, "assets/cranberry.png");
    this.load.image(assets.WATER, "assets/water.png");
    this.load.audio(assets.SOUNDTRACK, "assets/bogger-soundtrack.mp3");
    this.load.image(assets.PONTOON, "assets/pontoon.png");
    this.load.image(assets.COLLECTOR, "assets/collector.png");
    this.load.image(assets.SPIDER, "assets/spider.png");
    this.load.image(assets.ROCK, "assets/rock.png");
  }

  create(input: object) {
    const water = this.add.tileSprite(400, 300, 800, 600, "water");
    // this.createBerries(300, 10, 10, config.scale?.width, config.scale?.height);

    const COLOR_PRIMARY = 0x4e342e;
    const COLOR_LIGHT = 0x7b5e57;
    const COLOR_DARK = 0x260e04;
    this.rexUI.add
      .slider({
        x: 770,
        y: 593,
        width: 50,
        height: 5,
        orientation: "x",
        value: this.sound.volume,

        track: this.rexUI.add.roundRectangle(0, 0, 0, 0, 3, COLOR_DARK),
        thumb: this.rexUI.add.roundRectangle(0, 0, 0, 0, 5, COLOR_LIGHT),

        valuechangeCallback: (value) => {
          this.sound.setVolume(value);
        },
        space: {
          top: 4,
          bottom: 4,
        },
        input: "drag", // 'drag'|'click'
      })
      .layout();

    this.sound.add("soundtrack");
    if (!isMusicPlaying) {
      this.sound.play("soundtrack", {
        volume: 0.1,
        loop: true,
      });
      isMusicPlaying = true;
    }

    const mouseCircle = this.matter.add.circle(500, 500, 25, { mass: 0.1 });
    this.input.on("pointermove", (pointer) => {
      mouseCircle.position.x = pointer.worldX;
      mouseCircle.position.y = pointer.worldY;
    });

    this.writeText(input.score);
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
        assets.CRANBERRY,
        0,
        { mass: 0.1, scale: { x: 1, y: 1 }, frictionAir: 0.04 }
      );
    }
  }

  writeText(score: number) {
    const textObjects: { text: Phaser.GameObjects.Text; offset: number }[] = [];
    textObjects.push({
      text: this.add
        .text(getScreenHalfWidth(), 50, "Bogger", {
          ...textStyle,
          fontSize: "36px",
        })
        .setOrigin(0.5, 0.5),
      offset: 10,
    });
    textObjects.push({
      text: this.add
        .text(
          getScreenHalfWidth(),
          getScreenHalfHeight() - 20,
          "A game of collecting cranberries",
          {
            ...textStyle,
            fontSize: "24px",
          }
        )
        .setOrigin(0.5, 0.5),
      offset: 30,
    });

    const goalPosition = textObjects.push({
      text: this.add.text(
        200,
        300,
        `Goal:
      Surround cranberries     with your pontoon
      And drag them into the collector
      Collect as many cranberries     as you can before the time runs out
      Save spiders     by pushing them onto rocks     to get more time`,
        textStyle
      ),
      offset: 10,
    });

    // Oh no these are all wrong and based off the wrong position. Oh well
    this.matter.add
      .image(
        textObjects[goalPosition - 1].text.x + 185,
        textObjects[goalPosition - 1].text.y - 115,
        assets.CRANBERRY
      )
      .setStatic(true);
    this.matter.add
      .image(
        textObjects[goalPosition - 1].text.x + 335,
        textObjects[goalPosition - 1].text.y - 115,
        assets.PONTOON
      )
      .setStatic(true);
    this.matter.add
      .image(
        textObjects[goalPosition - 1].text.x + 265,
        textObjects[goalPosition - 1].text.y - 96,
        assets.COLLECTOR
      )
      .setScale(0.4)
      .setStatic(true);
    this.matter.add
      .image(
        textObjects[goalPosition - 1].text.x + 228,
        textObjects[goalPosition - 1].text.y - 79,
        assets.CRANBERRY
      )
      .setStatic(true);
    this.matter.add
      .image(
        textObjects[goalPosition - 1].text.x + 120,
        textObjects[goalPosition - 1].text.y - 60,
        assets.SPIDER
      )
      .setStatic(true);
    this.matter.add
      .image(
        textObjects[goalPosition - 1].text.x + 335,
        textObjects[goalPosition - 1].text.y - 60,
        assets.ROCK
      )
      .setScale(0.4)
      .setStatic(true);

    textObjects.push({
      text: this.add.text(
        200,
        300,
        `Controls:
    Move with WASD
    Extend your pontoon with Space
    Retract your pontoon with Shift`,
        textStyle
      ),
      offset: 100,
    });
    textObjects.push({
      text: this.add
        .text(getScreenHalfWidth(), 300, "Start Game", {
          ...textStyle,
          fontSize: "24px",
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.newGame())
        .setOrigin(0.5, 0.5),
      offset: 100,
    });
    if (score) {
      textObjects.push({
        text: this.add
          .text(
            getScreenHalfWidth(),
            300,
            `Your score in the previous game: ${score}`,
            textStyle
          )
          .setOrigin(0.5, 0.5),

        offset: 10,
      });
    }

    const highScore = localStorage.getItem("highScore");
    if (highScore) {
      textObjects.push({
        text: this.add
          .text(
            getScreenHalfWidth(),
            300,
            `The highest score is: ${highScore}`,
            textStyle
          )
          .setOrigin(0.5, 0.5),

        offset: 10,
      });
    }

    textObjects.forEach((item, index) => {
      if (index === 0) {
        return;
      }
      const previousText = textObjects[index - 1];

      item.text.y =
        previousText.text.y + previousText.text.height + previousText.offset;
    });
  }
}

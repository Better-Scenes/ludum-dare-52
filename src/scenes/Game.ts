import Phaser from "phaser";

import config from "../config";

enum assets {
  CRANBERRY = "cranberry",
  BUSH = "bush",
  PADDLESEGMENT = "paddleSegment",
}

export default class Demo extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image(assets.CRANBERRY, "assets/cranberry.png");
    this.load.image(assets.BUSH, "assets/bush.png");
    this.load.image(assets.PADDLESEGMENT, "assets/paddle-segment.png");
  }

  create() {
    this.createFloat(100, 100);
    this.createBushes(10);
    this.matter.add.mouseSpring();

    const cursors = this.input.keyboard.createCursorKeys();
  }

  createFloat(startX: number, startY: number) {
    const segmentLength = 50;
    const numberOfSegments = 10;
    const startSegment = this.matter.add.image(
      startX,
      startY,
      assets.PADDLESEGMENT,
      0,
      { ignoreGravity: true }
    );
    const jointSize = 5;
    startSegment.setFixedRotation();
    startSegment.setMass(50000);
    startSegment.setStatic(true);

    startX += segmentLength;
    let prev = startSegment;

    for (let i = 0; i < numberOfSegments; i++) {
      const segment = this.matter.add.image(
        startX,
        startY,
        assets.PADDLESEGMENT,
        0,
        { mass: 0.1, scale: { x: 1, y: 1 }, frictionAir: 0.08 }
      );
      this.matter.add.joint(prev, segment, jointSize, 0.4, {
        pointA: { x: segmentLength * 0.5, y: 0 },
        pointB: { x: -segmentLength * 0.5, y: 0 },
      });
      segment.setMass(100);

      prev = segment;

      startX += segmentLength + jointSize;
    }
  }

  createBerries(count: number, startX: number, startY: number, range = 10) {
    for (let i = 0; i < count; i++) {
      const berry = this.matter.add.image(
        getRandomInt(startX, startX + range),
        getRandomInt(startY, startY + range),
        assets.CRANBERRY,
        0,
        { mass: 0.1, scale: { x: 1, y: 1 }, frictionAir: 0.04 }
      );
    }
  }

  createBushes(count: number) {
    for (let i = 0; i < count; i++) {
      const bush = this.matter.add.image(
        getRandomInt(0, config.scale?.width ?? 500),
        getRandomInt(0, config.scale?.height ?? 500),
        assets.BUSH,
        0,
        {
          mass: 0.1,
          scale: { x: 1, y: 1 },
          frictionAir: 1,
          isSensor: true,
          isStatic: true,
        }
      );
      bush.setInteractive();
      bush.on("pointerdown", () => {
        console.log("clicked bush");
        this.createBerries(getRandomInt(5, 10), bush.x, bush.y);
        bush.destroy();
      });
    }
  }
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

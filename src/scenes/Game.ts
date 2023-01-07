import Phaser from "phaser";

import config from "../config";

enum assets {
  CRANBERRY = "cranberry",
  BUSH = "bush",
  PADDLESEGMENT = "paddleSegment",
  PADDLEEND = "paddleEnd",
  COLLECTOR = "collector",
  PLAYER = "player",
}

enum berryData {
  START_HEALTH = "startHealth",
  CURRENT_HEALTH = "health",
}

const segmentLength = 50;
const numberOfSegments = 10;
const segmentStartingGap = 5;
const jointLength = 0;
const jointStiffness = 0.1;
const paddleEndWeight = 0.5;
const anchorDragForceMultiplier = 0.02;

type Grabber = {
  joint: MatterJS.ConstraintType;
  item?: Phaser.Physics.Matter.Image;
};

export default class Demo extends Phaser.Scene {
  berries: Phaser.GameObjects.Group;
  berryCollisionCategory: number;
  player: Phaser.Physics.Matter.Image;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  grabbing?: Grabber;
  endSegment: Phaser.Physics.Matter.Image;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image(assets.CRANBERRY, "assets/cranberry.png");
    this.load.image(assets.BUSH, "assets/bush.png");
    this.load.image(assets.PADDLESEGMENT, "assets/paddle-segment.png");
    this.load.image(assets.PADDLEEND, "assets/float-end.png");
    this.load.image(assets.COLLECTOR, "assets/collector.png");
    this.load.image(assets.PLAYER, "assets/player.png");
  }

  create() {
    this.berries = this.add.group();
    this.berryCollisionCategory = this.matter.world.nextCategory();

    this.createPlayer(110, 110);
    this.createPontoon(100, 100);
    // this.createBushes(10);
    this.createRocks(20);
    this.createBerries(100, 10, 10, 550);
    this.createBucket(config.scale?.width / 2, config.scale?.height - 100);
  }

  update(time: number, delta: number): void {
    // this.reduceBerriesHealth(delta);

    const moveForce = 0.05;
    if (this.cursors.left.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: -moveForce, y: 0 }));
    } else if (this.cursors.right.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: moveForce, y: 0 }));
    }
    if (this.cursors.down.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: 0, y: moveForce }));
    } else if (this.cursors.up.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: 0, y: -moveForce }));
    }
  }

  createPlayer(x: number, y: number) {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.player = this.matter.add.image(x, y, assets.PLAYER, 0, {
      mass: 10,
      frictionAir: 0.5,
    });
    this.player.setFixedRotation();
    this.input.keyboard.on("keydown", (key: { key: string }) => {
      if (key.key == " ") {
        if (this.grabbing) {
          this.matter.world.removeConstraint(this.grabbing.joint);
          delete this.grabbing;
        } else {
          this.grabbing = {
            joint: this.matter.add.joint(this.endSegment, this.player, 20, 0.2),
          };
        }
      }
    });
  }

  createBucket(x: number, y: number) {
    const collector = this.matter.add.image(x, y, assets.COLLECTOR, 0, {
      isSensor: true,
    });

    collector.setCollidesWith(this.berryCollisionCategory);
    collector.setOnCollide(
      (collision: Phaser.Types.Physics.Matter.MatterCollisionData) => {
        collision.bodyA.gameObject.destroy();
        console.log("collided");
      }
    );
  }

  createPontoon(startX: number, startY: number) {
    // Create all the segments
    const segments: Phaser.Physics.Matter.Image[] = [];

    const group = this.matter.world.nextGroup(true);

    // Add all the middle segments
    for (let i = 0; i < numberOfSegments; i++) {
      const segment = this.matter.add.image(
        startX + (segmentLength + segmentStartingGap) * i,
        startY,
        assets.PADDLESEGMENT,
        0,
        {
          mass: 1.0,
          scale: { x: 1, y: 1 },
          frictionAir: 0.28,
        }
      );
      segment.setCollisionGroup(group);
      segments.push(segment);
    }

    // Join all the segments
    segments.map((segment, index) => {
      if (!segments[index + 1]) return;

      this.matter.add.joint(segments[index + 1], segment, 0, jointStiffness, {
        pointA: { x: segmentLength * 0.5 + jointLength, y: 0 },
        pointB: { x: -segmentLength * 0.5 - jointLength, y: 0 },
      });
    });

    // Attach an anchor to the start
    const startSegment = this.matter.add.image(
      startX,
      startY,
      assets.PADDLEEND,
      0,
      {
        ignoreGravity: true,
        frictionAir: 0.4,
      }
    );

    startSegment.setCollisionGroup(group);
    startSegment.setFixedRotation();
    startSegment.setMass(paddleEndWeight);
    this.matter.add.joint(startSegment, segments[0], 0, jointStiffness, {
      pointA: { x: 0, y: 0 },
      pointB: { x: segmentLength * 0.5 + jointLength, y: 0 },
    });

    // Attach an anchor to the end
    this.endSegment = this.matter.add.image(
      startX,
      startY + 50,
      assets.PADDLEEND,
      0,
      {
        ignoreGravity: true,
        frictionAir: 0.4,
      }
    );

    this.endSegment.setCollisionGroup(group);
    this.endSegment.setFixedRotation();
    this.endSegment.setMass(paddleEndWeight);
    this.matter.add.joint(
      this.endSegment,
      segments[segments.length - 1],
      0,
      jointStiffness,
      {
        pointA: { x: 0, y: 0 },
        pointB: { x: -segmentLength * 0.5 - jointLength, y: 0 },
      }
    );

    startSegment.setInteractive();
    this.endSegment.setInteractive();
    this.input.setDraggable([startSegment, this.endSegment]);

    this.input.on(
      "drag",
      function (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.Physics.Matter.Image,
        dragX: number,
        dragY: number
      ) {
        const dragPositionVector = new Phaser.Math.Vector2(dragX, dragY);
        const dragVector = dragPositionVector.subtract(
          gameObject.body.position
        );

        if (dragVector.length() < 20) {
          return;
        }

        const normalizedVector = dragVector
          .normalize()
          .scale(anchorDragForceMultiplier);

        gameObject.applyForce(normalizedVector);
      }
    );
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
      berry.setCollisionCategory(this.berryCollisionCategory);
      berry.setDataEnabled();
      const randomHealth = getRandomInt(10000, 20000);
      berry.setData({
        [berryData.START_HEALTH]: randomHealth,
        [berryData.CURRENT_HEALTH]: randomHealth,
      });
      this.berries.add(berry);
    }
  }

  reduceBerriesHealth(delta: number) {
    this.berries.children.each((berry) => {
      let health = berry.getData(berryData.CURRENT_HEALTH) as number;
      const maxHealth = berry.getData(berryData.START_HEALTH) as number;
      health -= delta;
      if (health <= 0) {
        berry.destroy();
      }
      berry.setData(berryData.CURRENT_HEALTH, health);

      const healthPercent = 100 - (health / maxHealth) * 100;
      const tint = new Phaser.Display.Color(255, 255, 255).darken(
        healthPercent
      );
      (berry as Phaser.Physics.Matter.Image).setTint(tint.color);
    });
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
          // isSensor: true,
          isStatic: true,
        }
      );
      bush.setInteractive();
      bush.on("pointerdown", () => {
        this.createBerries(getRandomInt(5, 10), bush.x, bush.y);
        bush.destroy();
      });
    }
  }

  createRocks(count: number) {
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
          // isSensor: true,
          isStatic: true,
        }
      );
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

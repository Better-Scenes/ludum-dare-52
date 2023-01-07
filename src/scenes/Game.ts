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

const segmentLength = 20;
const numberOfSegments = 10;
const segmentStartingGap = 5;
const jointLength = 0;
const jointStiffness = 0.4;
const jointDamping = 1.0;
const paddleEndWeight = 0.5;
const paddleFriction = 0.5;
const anchorDragForceMultiplier = 0.02;

type Segment = {
  joint?: MatterJS.ConstraintType;
  item: Phaser.Physics.Matter.Image;
};

export default class Demo extends Phaser.Scene {
  berries: Phaser.GameObjects.Group;
  berryCollisionCategory: number;
  segmentGroup: number;
  player: Phaser.Physics.Matter.Image;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  grabbing?: Segment;
  segments: Segment[] = [];

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
    this.segmentGroup = this.matter.world.nextGroup(true);

    this.createPlayer(140, 140);
    this.createPontoon(100, 100);
    // this.createBushes(10);
    // this.createRocks(20);
    this.createBerries(300, 10, 10, config.scale?.width, 500);
    this.createBucket(100, 100);
    this.toggleGrabbing();
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

    if (!this.grabbing) {
      const endSegment = this.segments[this.segments.length - 1].item;

      const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
      const deltaPlayer = playerPos.subtract(
        new Phaser.Math.Vector2(endSegment.x, endSegment.y)
      );
      const dist = deltaPlayer.length();
      if (dist > segmentLength + 50) {
        //this.createSegment(this.player.x, this.player.y);
        // this.createSegment(endSegment.x + segmentLength, endSegment.y);
        // this.createSegment(endSegment.x, endSegment.y + segmentLength);
      }
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
        this.toggleGrabbing();
      }
    });
  }

  toggleGrabbing() {
    if (this.grabbing) {
      this.matter.world.removeConstraint(this.grabbing.joint);
      delete this.grabbing;
    } else {
      const endSegment = this.segments[this.segments.length - 1].item;
      this.grabbing = {
        joint: this.matter.add.joint(endSegment, this.player, 20, 0.2),
        item: endSegment,
      };
    }
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

  createSegment(x: number, y: number) {
    const isFirst = this.segments.length == 0;
    const segment = this.matter.add.image(x, y, assets.PADDLESEGMENT, 0, {
      mass: 1.0,
      scale: { x: 1, y: 1 },
      frictionAir: paddleFriction,
      isStatic: isFirst,
    });
    segment.setCollisionGroup(this.segmentGroup);

    let joint: MatterJS.ConstraintType | undefined;
    if (!isFirst) {
      const anchor = this.segments[this.segments.length - 1].item;

      // anchor

      joint = this.matter.add.joint(anchor, segment, 0, jointStiffness, {
        pointA: { x: segmentLength * 0.5 + jointLength, y: 0 },
        pointB: { x: -segmentLength * 0.5 - jointLength, y: 0 },
        // angleA: 0,
        damping: jointDamping,
      });
    }

    this.segments.push({ joint, item: segment });
  }

  createPontoon(startX: number, startY: number) {
    // Create all the segments
    for (let i = 0; i < numberOfSegments; i++) {
      this.createSegment(
        startX + (segmentLength + segmentStartingGap) * i,
        startY
      );
    }
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

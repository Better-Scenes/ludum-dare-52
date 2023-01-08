import Phaser, { GameObjects } from "phaser";

import config from "../config";
import {
  getRandomFloat,
  getRandomInt,
  getScreenHalfHeight,
  getScreenHalfWidth,
  getScreenSize,
} from "../utils";

enum assets {
  CRANBERRY = "cranberry",
  BUSH = "bush",
  ROCK = "rock",
  PADDLESEGMENT = "paddleSegment",
  PADDLEEND = "paddleEnd",
  COLLECTOR = "collector",
  PLAYER = "player",
  WATER = "water",
  SPIDER = "spider",
  PARTICLE = "particle",
}

enum berryData {
  START_HEALTH = "startHealth",
  CURRENT_HEALTH = "health",
  BERRY_VALUE = "berryValue",
}

// pontoon/segments/rope/snake
const segmentLength = 20;
const numberOfSegments = 10;
const segmentStartingGap = 5;
const jointLength = 0;
const jointStiffness = 0.4;
const jointDamping = 1.0;
const paddleMass = 1.0;
const paddleFriction = 0.5;
const paddleCooldownMilliseconds = 120;
const gameLengthInMs = 1000000;

// Player
const playerMass = 2;
const playerMoveForce = 0.02;
const playerSpoolForceMultiplier = 0.7;
const playerRetractForceMultiplier = 1.0;
const playerGrabStiffness = 0.2;

// Spiders
const spiderSpawnProbability = 0.02;
const spiderLifetimeMilliseconds = 10000;
const spiderRescueSeconds = 5;

// Berries
const edgeRepulsionForce = 0.00005;
const edgeRepulsionDistance = 10;
const numberOfBerries = 500;

// Collector
const collectorPosition = new Phaser.Math.Vector2(
  getScreenHalfWidth(),
  config.scale?.height - 100
);
const collectorNoSpawnDistance = 100;

//Game state
let score = 0;
let timeRemaining = gameLengthInMs;
let spidersRescused = 0;

type Segment = {
  joint?: MatterJS.ConstraintType;
  item: Phaser.Physics.Matter.Image;
};

export default class Demo extends Phaser.Scene {
  initialized = false;
  berries: Phaser.GameObjects.Group;
  berryCollisionCategory: number;
  spiderCollisionCategory: number;
  segmentGroup: number;
  player: Phaser.Physics.Matter.Image;
  collectorEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  keys: { [key: string]: Phaser.Input.Keyboard.Key };
  grabbing?: Segment;
  segments: Segment[] = [];
  cooldown = 0;
  particleEmitUntil = 0;
  uiText: GameObjects.Text;

  constructor() {
    super("GameScene");
  }

  init() {
    this.segments = [];

    if (!this.initialized) {
      this.initialized = true;
      this.berryCollisionCategory = this.matter.world.nextCategory();
      this.spiderCollisionCategory = this.matter.world.nextCategory();
      this.segmentGroup = this.matter.world.nextGroup(true);
    }
  }

  preload() {
    this.load.image(assets.CRANBERRY, "assets/cranberry.png");
    this.load.image(assets.BUSH, "assets/bush.png");
    this.load.image(assets.ROCK, "assets/rock.png");
    this.load.image(assets.PADDLESEGMENT, "assets/paddle-segment.png");
    this.load.image(assets.PADDLEEND, "assets/float-end.png");
    this.load.image(assets.COLLECTOR, "assets/collector.png");
    this.load.image(assets.PLAYER, "assets/player.png");
    this.load.image(assets.WATER, "assets/water.png");
    this.load.image(assets.SPIDER, "assets/spider.png");
    this.load.image(assets.PARTICLE, "assets/particle.png");
  }

  create() {
    timeRemaining = gameLengthInMs;
    score = 0;
    spidersRescused = 0;
    this.cooldown = 0;
    this.berries = this.add.group();

    const water = this.add.tileSprite(400, 300, 800, 600, "water");
    this.createPlayer(140, 140);
    this.createPontoon(collectorPosition.x, collectorPosition.y);
    // this.createBushes(10);
    this.createRocks(20);
    this.createBerries(
      numberOfBerries,
      10,
      10,
      config.scale?.width,
      config.scale?.height
    );
    this.createBucket(collectorPosition.x, collectorPosition.y);
    this.toggleGrabbing();

    this.keys = this.input.keyboard.addKeys({
      retract: "shift",
      spool: "space",
      left: "a",
      right: "d",
      up: "w",
      down: "s",
    }) as {
      [key: string]: Phaser.Input.Keyboard.Key;
    };

    this.uiText = this.add.text(20, 20, "", {
      font: "16px Courier",
      fill: "black",
    });

    this.input.keyboard.on("keydown", (key) => {
      if (key.key == "Escape") {
        this.scene.start("Menu");
      }
    });
  }

  update(time: number, delta: number): void {
    // this.reduceBerriesHealth(delta);

    if (this.particleEmitUntil < new Date().getTime()) {
      this.collectorEmitter.stop();
    }

    timeRemaining -= delta;
    if (timeRemaining <= 0) {
      this.endGame();
    }

    this.uiText.setText([
      "Score: " + score.toString(),
      "Time: " + parseInt(timeRemaining / 1000).toString(),
      "Spiders rescued: " + spidersRescused.toString(),
    ]);

    let moveForce = this.keys.spool.isDown
      ? playerMoveForce * playerSpoolForceMultiplier
      : playerMoveForce;
    if (this.keys.spool.isDown) {
      moveForce *= playerSpoolForceMultiplier;
    } else if (this.keys.retract.isDown) {
      moveForce *= playerRetractForceMultiplier;
    }

    if (this.keys.left.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: -moveForce, y: 0 }));
    } else if (this.keys.right.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: moveForce, y: 0 }));
    }
    if (this.keys.down.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: 0, y: moveForce }));
    } else if (this.keys.up.isDown) {
      this.player.applyForce(new Phaser.Math.Vector2({ x: 0, y: -moveForce }));
    }
    if (
      this.keys.retract.isDown &&
      this.segments.length > 1 &&
      this.cooldown + paddleCooldownMilliseconds <= Date.now()
    ) {
      this.cooldown = Date.now();
      if (this.grabbing) {
        this.toggleGrabbing();
      }
      const endSegment = this.segments[this.segments.length - 1];
      if (endSegment.joint) {
        this.matter.world.removeConstraint(endSegment.joint);
      }
      endSegment.item.destroy();
      this.segments.splice(-1, 1);
      this.toggleGrabbing();
    }

    if (
      (this.keys.spool.isDown && this.grabbing) ||
      (!this.keys.spool.isDown && !this.grabbing)
    ) {
      this.toggleGrabbing();
    }

    if (this.keys.spool.isDown) {
      const endSegment = this.segments[this.segments.length - 1].item;
      const playerPos = new Phaser.Math.Vector2(
        this.player.x + this.player.width * 0.5,
        this.player.y + this.player.height * 0.5
      );
      const segmentPos = new Phaser.Math.Vector2(
        endSegment.x + endSegment.width * 0.5,
        endSegment.y + endSegment.height * 0.5
      );

      const deltaPlayer = playerPos.subtract(segmentPos);
      const dist = deltaPlayer.length();
      if (dist > segmentLength * 2.0 + 5) {
        const radians = Math.atan2(deltaPlayer.y, deltaPlayer.x);
        this.createSegment(
          endSegment.x + segmentLength * Math.cos(radians),
          endSegment.y + segmentLength * Math.sin(radians),
          (radians * 180) / Math.PI
        );
      }
    }

    if (Math.random() < spiderSpawnProbability) {
      this.createSpider();
    }

    this.pullBerriesFromEdge(delta);
  }

  endGame() {
    //go to game over scene and display score
    this.scene.start("GameOver", { score: score });
  }

  createPlayer(x: number, y: number) {
    this.player = this.matter.add.image(x, y, assets.PLAYER, 0, {
      mass: playerMass,
      frictionAir: 0.5,
      shape: "circle",
    });
    this.player.setFixedRotation();
  }

  toggleGrabbing() {
    if (this.grabbing) {
      this.matter.world.removeConstraint(this.grabbing.joint);
      delete this.grabbing;
    } else {
      const endSegment = this.segments[this.segments.length - 1].item;
      this.grabbing = {
        joint: this.matter.add.joint(
          endSegment,
          this.player,
          25,
          playerGrabStiffness
        ),
        item: endSegment,
      };
    }
  }

  createSpider() {
    const size = getScreenSize();
    const xpos = Math.random() * size.x;
    const ypos = Math.random() * size.y;

    const existing = this.matter.intersectRect(xpos, ypos, 16, 16);
    if (existing.some((item) => item.label === "rock")) {
      return;
    }

    let collected = false;
    const spider = this.matter.add.image(xpos, ypos, assets.SPIDER, 0, {
      mass: 0.1,
      frictionAir: 0.5,
      shape: "circle",
      label: "spider",
    });
    spider.setOnCollide(
      (collision: Phaser.Types.Physics.Matter.MatterCollisionData) => {
        const rock =
          collision.bodyA.label === "rock"
            ? collision.bodyA
            : collision.bodyB.label === "rock"
            ? collision.bodyB
            : null;
        if (!rock) {
          return;
        }
        collected = true;
        spidersRescused++;
        timeRemaining += spiderRescueSeconds * 1000;
        spider.destroy();
      }
    );
    setTimeout(() => {
      if (!collected) {
        spider.destroy();
      }
    }, spiderLifetimeMilliseconds);
  }

  createBucket(x: number, y: number) {
    const collector = this.matter.add.image(x, y, assets.COLLECTOR, 0, {
      isSensor: true,
    });
    const particles = this.add.particles(assets.PARTICLE);
    this.collectorEmitter = particles.createEmitter({
      x,
      y,
      speed: 100,
      lifespan: 800,
      blendMode: "ADD",
      on: false,
      scale: { min: 1, max: 3 },
    });

    collector.setCollidesWith(this.berryCollisionCategory);
    collector.setOnCollide(
      (collision: Phaser.Types.Physics.Matter.MatterCollisionData) => {
        score +=
          (collision.bodyA.gameObject as Phaser.Physics.Matter.Image).getData(
            berryData.BERRY_VALUE
          ) ?? 1;
        this.collectorEmitter.start();
        this.particleEmitUntil = new Date().getTime() + 100;
        collision.bodyA.gameObject.destroy();
      }
    );
  }

  createSegment(x: number, y: number, angle?: number) {
    const isFirst = this.segments.length == 0;
    const segment = this.matter.add.image(x, y, assets.PADDLESEGMENT, 0, {
      mass: paddleMass,
      frictionAir: paddleFriction,
      isStatic: isFirst,
    });
    segment.setCollisionGroup(this.segmentGroup);

    let joint: MatterJS.ConstraintType | undefined;
    if (!isFirst) {
      const anchor = this.segments[this.segments.length - 1].item;
      const offsetDist = segmentLength * 0.5 + jointLength;
      const radians = (anchor.angle * Math.PI) / 180.0;
      const xOff = offsetDist * Math.cos(radians);
      const yOff = offsetDist * Math.sin(radians);

      joint = this.matter.add.joint(anchor, segment, 0, jointStiffness, {
        pointA: { x: xOff, y: yOff },
        pointB: { x: -offsetDist, y: 0 },
        damping: jointDamping,
      });
    }
    if (angle) {
      segment.setAngle(angle);
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
      const berryScale = getRandomFloat(0.5, 1);

      const potentialSpawnPosition = new Phaser.Math.Vector2(
        getRandomInt(startX, startX + xrange),
        getRandomInt(startY, startY + yrange)
      );

      if (
        potentialSpawnPosition.distance(collectorPosition) <
        collectorNoSpawnDistance
      ) {
        continue;
      }

      const berry = this.matter.add.image(
        potentialSpawnPosition.x,
        potentialSpawnPosition.y,
        assets.CRANBERRY,
        0,
        {
          mass: 0.1,
          frictionAir: 0.04,
        }
      );
      berry.setScale(berryScale);
      berry.setCollisionCategory(this.berryCollisionCategory);
      berry.setDataEnabled();
      const randomHealth = getRandomInt(10000, 20000);
      berry.setData({
        [berryData.START_HEALTH]: randomHealth,
        [berryData.CURRENT_HEALTH]: randomHealth,
        [berryData.BERRY_VALUE]: 1,
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

  pullBerriesFromEdge(delta: number) {
    this.berries.children.each((berry) => {
      if (berry.body.position.x < edgeRepulsionDistance) {
        berry.body.gameObject.applyForce(
          new Phaser.Math.Vector2({ x: edgeRepulsionForce, y: 0 }).scale(
            delta / 1000
          )
        );
      }
      if (berry.body.position.x > config.scale?.width - edgeRepulsionDistance) {
        berry.body.gameObject.applyForce(
          new Phaser.Math.Vector2({ x: -edgeRepulsionForce, y: 0 }).scale(
            delta / 1000
          )
        );
      }
      if (berry.body.position.y < edgeRepulsionDistance) {
        berry.body.gameObject.applyForce(
          new Phaser.Math.Vector2({ x: 0, y: edgeRepulsionForce }).scale(
            delta / 1000
          )
        );
      }
      if (
        berry.body.position.y >
        config.scale?.height - edgeRepulsionDistance
      ) {
        berry.body.gameObject.applyForce(
          new Phaser.Math.Vector2({ x: -0, y: -edgeRepulsionForce }).scale(
            delta / 1000
          )
        );
      }
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
      const rock = this.matter.add.image(
        getRandomInt(0, config.scale?.width ?? 500),
        getRandomInt(0, config.scale?.height ?? 500),
        assets.ROCK,
        0,
        {
          label: "rock",
          scale: { x: 1, y: 1 },
          isStatic: true,
          shape: "circle",
        }
      );
      rock.setScale(getRandomFloat(1, 1.2));
      rock.setAngle(getRandomInt(0, 360));
    }
  }
}

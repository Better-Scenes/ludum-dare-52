import Phaser from "phaser";

import config from "../config";
import {
  getRandomFloat,
  getRandomInt,
  getRandomVertexColors,
  getScreenHalfHeight,
  getScreenHalfWidth,
  getScreenSize,
  getTintForVertexColor,
} from "../utils";
import WaterPipeline from "../pipeline";

enum assets {
  CRANBERRY = "cranberry",
  BUSH = "bush",
  ROCK = "rock",
  PADDLESEGMENT = "paddleSegment",
  PONTOON = "pontoon",
  PADDLEEND = "paddleEnd",
  COLLECTOR = "collector",
  PLAYER = "player",
  WATER = "water",
  SPIDER = "spider",
  PARTICLE = "particle",
  SOUND_COLLECT = "soundCollect",
  SOUND_HURT = "soundHurt",
  SOUND_RESCUE = "soundRescue",
  WATER_SHADER = "waterShader",
}

enum berryData {
  START_HEALTH = "startHealth",
  CURRENT_HEALTH = "health",
  BERRY_VALUE = "berryValue",
}

enum spiderData {
  START_HEALTH = "startHealth",
  CURRENT_HEALTH = "health",
  SPIDER_VALUE = "spiderValue",
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
const gameLengthInMs = 1 * 60 * 1000;

// Player
const playerMass = 2;
const playerMoveForce = 0.02;
const playerSpoolForceMultiplier = 0.7;
const playerRetractForceMultiplier = 1.0;
const playerGrabStiffness = 0.2;

// Spiders
const spiderSpawnProbability = 0.002;
const spiderLifetimeMilliseconds = 20000;
const spiderRescueSeconds = 5;

// Berries
const edgeRepulsionForce = 0.00005;
const edgeRepulsionDistance = 20;
const numberOfBerries = 1000;
const rareBerryChance = 0.01;

// Rocks
const numberOfRocks = 20;

// Collector
const collectorPosition = new Phaser.Math.Vector2(
  getScreenHalfWidth(),
  config.scale?.height - 100
);
const collectorNoSpawnDistance = 100;

//Game state
let score = 0;
let timeRemaining = gameLengthInMs;
let spidersRescued = 0;

type Segment = {
  joint?: MatterJS.ConstraintType;
  item: Phaser.Physics.Matter.Image;
};

export default class Demo extends Phaser.Scene {
  initialized = false;
  berries: Phaser.GameObjects.Group;
  spiders: Phaser.GameObjects.Group;
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
  sounds: { [key: string]: Phaser.Sound.BaseSound } = {};
  rope: Phaser.GameObjects.Rope;
  shader: Phaser.Renderer.WebGL.Pipelines.SinglePipeline;
  startTime: number = Date.now();

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
    this.load.image(assets.PONTOON, "assets/pontoon.png");
    this.load.image(assets.PADDLEEND, "assets/float-end.png");
    this.load.image(assets.COLLECTOR, "assets/collector.png");
    this.load.image(assets.PLAYER, "assets/player.png");
    this.load.image(assets.WATER, "assets/water.png");
    this.load.image(assets.SPIDER, "assets/spider.png");
    this.load.image(assets.PARTICLE, "assets/particle.png");

    this.load.audio(assets.SOUND_COLLECT, "assets/collect.wav");
    this.load.audio(assets.SOUND_HURT, "assets/hurt.wav");
    this.load.audio(assets.SOUND_RESCUE, "assets/rescue.wav");

    this.load.glsl(assets.WATER_SHADER, "assets/shaders/water.frag");
  }

  create() {
    timeRemaining = gameLengthInMs;
    score = 0;
    spidersRescued = 0;
    this.cooldown = 0;
    this.berries = this.add.group();
    this.spiders = this.add.group();

    this.sounds[assets.SOUND_COLLECT] = this.sound.add(assets.SOUND_COLLECT);
    this.sounds[assets.SOUND_HURT] = this.sound.add(assets.SOUND_HURT);
    this.sounds[assets.SOUND_RESCUE] = this.sound.add(assets.SOUND_RESCUE);

    this.shader = this.renderer.pipelines.add(
      "Water",
      new WaterPipeline(
        this.game,
        this.cache.shader.get(assets.WATER_SHADER).fragmentSrc
      )
    );
    this.shader.set2f("uResolution", config.scale?.width, config.scale?.height);

    const water = this.add
      .tileSprite(400, 300, config.scale?.width, 600, "water")
      .setPipeline("Water");
    this.createPlayer(140, 140);
    this.createPontoon(collectorPosition.x, collectorPosition.y);
    this.createRocks(numberOfRocks);
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
    this.shader.set1f("uTime", Date.now() - this.startTime);
    this.shader.set1i("uNumRipples", 2);
    this.shader.set3fv("uRipples", [400, 300, 0, 300, 200, 500]);

    this.reduceSpiderHealth(delta);

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
      "Spiders rescued: " + spidersRescued.toString(),
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

    const segPoints = this.segments.map((seg) => seg.item.body.position);
    this.rope.setPoints(segPoints);
    this.rope.setDirty();
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
    spider.setCollisionCategory(this.spiderCollisionCategory);
    spider.setDataEnabled();
    spider.setData({
      [spiderData.CURRENT_HEALTH]: spiderLifetimeMilliseconds,
      [spiderData.START_HEALTH]: spiderLifetimeMilliseconds,
      [spiderData.SPIDER_VALUE]: 10,
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
        spidersRescued++;
        timeRemaining += spiderRescueSeconds * 1000;
        spider.destroy();
        this.sounds[assets.SOUND_RESCUE].play();
      }
    );
    this.spiders.add(spider);
  }

  createBucket(x: number, y: number) {
    const collector = this.matter.add.image(x, y, assets.COLLECTOR, 0, {
      isSensor: true,
      label: "collector",
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

    collector.setCollidesWith([
      this.berryCollisionCategory,
      this.spiderCollisionCategory,
    ]);
    collector.setOnCollide(
      (collision: Phaser.Types.Physics.Matter.MatterCollisionData) => {
        const target =
          collision.bodyA.label == "collector"
            ? collision.bodyB
            : collision.bodyA;
        if (target.label == "berry") {
          score +=
            (target.gameObject as Phaser.Physics.Matter.Image).getData(
              berryData.BERRY_VALUE
            ) ?? 1;
          this.collectorEmitter.start();
          this.particleEmitUntil = new Date().getTime() + 100;
          target.gameObject.destroy();
          this.sounds[assets.SOUND_COLLECT].play();
        } else if (target.label == "spider") {
          if (score - 10 < 0) {
            score = 0;
          } else {
            score -= 10;
          }
          target.gameObject.destroy();
          this.sounds[assets.SOUND_HURT].play();
        }
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
    const segPoints = this.segments.map((seg) => seg.item.body.position);
    this.rope = this.add.rope(0, 0, assets.PONTOON, 0, segPoints);
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
          label: "berry",
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

      if (Math.random() < rareBerryChance) {
        berry.setData(berryData.BERRY_VALUE, 10);
        let fromColors = getRandomVertexColors();
        let toColors = getRandomVertexColors();
        berry.setTint(
          fromColors.topLeft.color,
          fromColors.topRight.color,
          fromColors.bottomLeft.color,
          fromColors.bottomRight.color
        );

        this.tweens.addCounter({
          from: 0,
          to: 100,
          duration: 2000,
          loop: -1,
          onUpdate: function (tween) {
            berry.setTintFill(
              getTintForVertexColor(
                "topLeft",
                tween.getValue(),
                fromColors,
                toColors
              )
            );
          },
          onLoop: () => {
            fromColors = toColors || fromColors;
            toColors = getRandomVertexColors();
          },
        });
      }
      this.berries.add(berry);
    }
  }

  reduceSpiderHealth(delta: number) {
    this.spiders.children.each((spider) => {
      spider.getData(spiderData.CURRENT_HEALTH);
      let health = spider.getData(berryData.CURRENT_HEALTH) as number;
      const maxHealth = spider.getData(berryData.START_HEALTH) as number;
      health -= delta;
      if (health <= 0) {
        spider.destroy();
        //to-do play spider drown sound
      }
      spider.setData(berryData.CURRENT_HEALTH, health);

      const healthPercent = (health / maxHealth) * 100;
      (spider as Phaser.Physics.Matter.Image).alpha = healthPercent / 100;
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

  createRocks(count: number) {
    for (let i = 0; i < count; i++) {
      const potentialSpawnPosition = new Phaser.Math.Vector2(
        getRandomInt(0, config.scale?.width ?? 500),
        getRandomInt(0, config.scale?.height ?? 500)
      );

      if (
        potentialSpawnPosition.distance(collectorPosition) <
        collectorNoSpawnDistance
      ) {
        i--;
        continue;
      }

      const rock = this.matter.add.image(
        potentialSpawnPosition.x,
        potentialSpawnPosition.y,
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

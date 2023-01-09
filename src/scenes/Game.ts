import Phaser from "phaser";

import config from "../config";
import {
  assets,
  getRandomFloat,
  getRandomInt,
  getRandomVertexColors,
  getScreenHalfHeight,
  getScreenHalfWidth,
  getScreenSize,
  getTintForVertexColor,
} from "../utils";
import WaterPipeline from "../pipeline";

import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";

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

// game
const gameLengthInMs = 90 * 1000;
const maxRipples = 64;

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
const paddleRippleProbability = 0.04;

// Player
const playerMass = 2;
const playerMoveForce = 0.02;
const playerSpoolForceMultiplier = 0.7;
const playerRetractForceMultiplier = 1.0;
const playerGrabStiffness = 0.2;
const playerRippleCooldownMilliseconds = 50;
const playerRippleRadius = 100;

// Spiders
const spiderSpawnProbability = 0.002;
const spiderLifetimeMilliseconds = 20000;
const spiderRescueSeconds = 5;
const spiderRippleProbability = 0.02;

// Berries
const edgeRepulsionForce = 0.00005;
const edgeRepulsionDistance = 20;
const numberOfBerries = 1000;
const rareBerryChance = 0.01;

// Rocks
const numberOfRocks = 20;
const rockRippleProbability = 0.0; // 0.01

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

type Ripple = {
  x: number;
  y: number;
  time: number;
  radius: number;
};

class ProgressBar {
  xpos: number;
  ypos: number;
  barWidth: number;
  barHeight: number;
  progressBar: Phaser.GameObjects.Graphics;
  progressBox: Phaser.GameObjects.Graphics;
  fillColor: number;
  alpha: number;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    backColor: number,
    fillColor: number,
    alpha = 1.0
  ) {
    this.xpos = x;
    this.ypos = y;
    this.barWidth = width;
    this.barHeight = height;
    this.fillColor = fillColor;
    this.alpha = alpha;
    this.progressBox = scene.add.graphics();
    this.progressBar = scene.add.graphics();
    this.progressBox.fillStyle(backColor, alpha);
    this.progressBox.fillRect(x, y, width, height);
  }
  update(fraction: number) {
    this.progressBar.clear();
    this.progressBar.fillStyle(this.fillColor, this.alpha);
    this.progressBar.fillRect(
      this.xpos,
      this.ypos,
      this.barWidth * Math.max(0.0, Math.min(1.0, fraction)),
      this.barHeight
    );
  }
  remove() {
    this.progressBar.destroy();
    this.progressBox.destroy();
  }
}

export default class Demo extends Phaser.Scene {
  initialized = false;
  berries: Phaser.GameObjects.Group;
  spiders: Phaser.GameObjects.Group;
  rocks: Phaser.GameObjects.Group;
  berryCollisionCategory = 0;
  spiderCollisionCategory = 0;
  segmentGroup = 0;
  player: Phaser.Physics.Matter.Image;
  collectorEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  grabbing?: Segment;
  segments: Segment[] = [];
  cooldown = 0;
  particleEmitUntil = 0;
  uiText: GameObjects.Text;
  sounds: { [key: string]: Phaser.Sound.BaseSound } = {};
  rope: Phaser.GameObjects.Rope;
  shader: Phaser.Renderer.WebGL.Pipelines.SinglePipeline;
  startTime: number = Date.now();
  ripples: Ripple[] = [];
  playerRippleCooldown = 0;
  countdownProgressBar: ProgressBar;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.scenePlugin({
      key: "rexuiplugin",
      url: UIPlugin,
      sceneKey: "rexUI",
    });

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
    if (!this.initialized) {
      this.initialized = true;
      this.berryCollisionCategory = this.matter.world.nextCategory();
      this.spiderCollisionCategory = this.matter.world.nextCategory();
      this.segmentGroup = this.matter.world.nextGroup(true);
      this.shader = this.renderer.pipelines.add(
        "Water",
        new WaterPipeline(
          this.game,
          this.cache.shader.get(assets.WATER_SHADER).fragmentSrc
        )
      );
      this.shader.set2f(
        "uResolution",
        config.scale?.width,
        config.scale?.height
      );
    }

    timeRemaining = gameLengthInMs;
    score = 0;
    spidersRescued = 0;
    this.cooldown = 0;
    this.berries = this.add.group();
    this.spiders = this.add.group();
    this.rocks = this.add.group();
    this.ripples = [];
    this.segments = [];

    this.sounds[assets.SOUND_COLLECT] = this.sound.add(assets.SOUND_COLLECT);
    this.sounds[assets.SOUND_HURT] = this.sound.add(assets.SOUND_HURT);
    this.sounds[assets.SOUND_RESCUE] = this.sound.add(assets.SOUND_RESCUE);

    this.add
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

    if (this.countdownProgressBar) {
      this.countdownProgressBar.remove();
    }
    this.countdownProgressBar = new ProgressBar(
      this,
      20,
      10,
      config.scale?.width - 40,
      10,
      0x227777,
      0x22d0d0,
      1.0
    );
  }

  update(time: number, delta: number): void {
    this.shader.set1f("uTime", Date.now() - this.startTime);
    this.shader.set1i("uNumRipples", this.ripples.length);
    this.shader.set4fv(
      "uRipples",
      this.ripples.reduce((arr: number[], ripple: Ripple) => {
        return arr.concat([
          ripple.x,
          config.scale?.height - ripple.y,
          ripple.radius,
          ripple.time,
        ]);
      }, [])
    );

    // if (Math.random() < 0.05) {
    //   this.addRipple(
    //     Math.random() * 800,
    //     Math.random() * 600,
    //     50 + Math.random() * 100
    //   );
    // }

    this.reduceSpiderHealth(delta);

    if (this.particleEmitUntil < new Date().getTime()) {
      this.collectorEmitter.stop();
    }

    timeRemaining -= delta;
    if (timeRemaining <= 0) {
      this.endGame();
    }

    this.countdownProgressBar.update(timeRemaining / gameLengthInMs);
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

    const playerSpeed = new Phaser.Math.Vector2(
      this.player.body.velocity
    ).length();
    if (
      playerSpeed > 0.1 &&
      this.playerRippleCooldown < Date.now() - playerRippleCooldownMilliseconds
    ) {
      this.addRipple(this.player.x, this.player.y, playerRippleRadius);
      this.playerRippleCooldown = Date.now();
    }

    this.segments.forEach((segment) => {
      if (Math.random() > paddleRippleProbability) {
        return;
      }
      const body = segment.item.body;
      const paddleSpeed = new Phaser.Math.Vector2(body.velocity).length();
      if (paddleSpeed < 0.1) {
        return;
      }
      this.addRipple(body.position.x, body.position.y, 30 + Math.random() * 30);
    });

    this.spiders.children.each((spider) => {
      if (Math.random() < spiderRippleProbability) {
        this.addRipple(
          spider.body.position.x,
          spider.body.position.y,
          20 + Math.random() * 30
        );
      }
    });

    this.rocks.children.each((rock) => {
      if (Math.random() < rockRippleProbability) {
        this.addRipple(rock.body.position.x, rock.body.position.y, 80);
      }
    });

    if (
      this.keys.retract.isDown &&
      this.segments.length > 3 &&
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

  addRipple(x: number, y: number, radius: number) {
    const currTime = Date.now() - this.startTime;
    const cutoffTime = currTime - 1000 * 10;
    this.ripples.unshift({ x, y, radius, time: currTime });
    this.ripples = this.ripples
      .slice(0, maxRipples)
      .filter((ripple) => ripple.time > cutoffTime);
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
        this.addRipple(spider.body.position.x, spider.body.position.y, 150);
        spider.destroy();
        //to-do play spider drown sound
      }
      spider.setData(berryData.CURRENT_HEALTH, health);

      const minFade = 0.2;
      const healthPercent = (health / maxHealth) * 100;
      (spider as Phaser.Physics.Matter.Image).alpha =
        healthPercent * 0.01 * (1.0 - minFade) + minFade;
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
      this.rocks.add(rock);
    }
  }
}

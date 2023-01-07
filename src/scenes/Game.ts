import Phaser from "phaser";

export default class Demo extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("cranberry", "assets/cranberry.png");
    this.load.image("paddleSegment", "assets/paddle-segment.png");
  }

  create() {
    // const cranberry = this.add.image(400, 70, "cranberry");

    const block = this.matter.add.image(400, 50, 'paddleSegment', 0, { ignoreGravity: true });
    block.setFixedRotation();
    block.setMass(50000);

    let x = 150;
    let prev = block;

    const segmentLength = 50;
    for (let i = 0; i < 12; i++) {
        const ball = this.matter.add.image(x, 50, 'paddleSegment', 0, {mass: 0.1, scale: { x: 1, y: 1 } });

        this.matter.add.joint(prev, ball, 5, 0.4, { pointA: { x: segmentLength * 0.5, y: 0 }, pointB: { x: -segmentLength * 0.5, y: 0 } });

        prev = ball;

        x += segmentLength * 2.5;
    }

    this.matter.add.mouseSpring();

    const cursors = this.input.keyboard.createCursorKeys();    
  }
}

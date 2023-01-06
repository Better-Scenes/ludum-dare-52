import Phaser from "phaser";

export default class Demo extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("cranberry", "assets/cranberry.png");
  }

  create() {
    // const cranberry = this.add.image(400, 70, "cranberry");

    const block = this.matter.add.image(400, 50, 'cranberry', 0, { ignoreGravity: true });
    block.setFixedRotation();
    block.setMass(500);

    let y = 150;
    let prev = block;

    for (let i = 0; i < 12; i++) {
        const ball = this.matter.add.image(400, y, 'cranberry', 0, { shape: 'circle', mass: 0.1, scale: { x: 1, y: 3 } });
        // ball.scaleY = 3;
        // ball.refreshBody();

        this.matter.add.joint(prev, ball, (i === 0) ? 90 : 15, 0.4);

        prev = ball;

        y += 18;
    }

    this.matter.add.mouseSpring();

    const cursors = this.input.keyboard.createCursorKeys();    
  }
}

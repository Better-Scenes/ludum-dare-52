import Phaser from "phaser";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#33A5E7",
  scale: {
    width: 800,
    height: 600,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "matter",
    matter: {
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 4,
      gravity: { y: 0 },
      debug: {
        showBody: true,
        showStaticBody: true,
      },
    },
  },
};

export default config;

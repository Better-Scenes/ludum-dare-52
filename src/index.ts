import Phaser from "phaser";
import config from "./config";
import MenuScene from "./scenes/Menu";
import GameScene from "./scenes/Game";
import GameOver from "./scenes/GameOver";

new Phaser.Game(
  Object.assign(config, {
    // scene: [MenuScene, GameScene],
    scene: [MenuScene, GameScene, GameOver],
  })
);

import Phaser from "phaser";
import config from "./config";
import MenuScene from "./scenes/Menu";
import GameScene from "./scenes/Game";
import GameOver from "./scenes/GameOver";

new Phaser.Game(
  Object.assign(config, {
    // scene: [GameScene, MenuScene, GameOver],
    scene: [MenuScene, GameScene, GameOver],
    callbacks: {
      preBoot: (game) => {
        game.music = Phaser.Sound.SoundManagerCreator.create(game);
      },
    },
  })
);

import Phaser from "phaser";
import config from "./config";
import MenuScene from "./scenes/Menu";
import GameScene from "./scenes/Game";
import GameOver from "./scenes/GameOver";
import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";

new Phaser.Game(
  Object.assign(config, {
    // scene: [GameScene, MenuScene, GameOver],
    scene: [MenuScene, GameScene, GameOver],
    plugins: UIPlugin,
  })
);

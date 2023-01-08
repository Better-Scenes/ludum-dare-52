import config from "./config";

export function renderTextAt(
  scene: Phaser.Scene,
  text: string,
  x: number,
  y: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
    })
    .setOrigin(0.5, 0.5);
}

export function getScreenHalfWidth(): number {
  return config.scale.width * 0.5;
}

export function getScreenHalfHeight(): number {
  return config.scale.height * 0.5;
}

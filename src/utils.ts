import config from "./config";
import Phaser from "phaser";

export enum assets {
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
  SOUNDTRACK = "soundtrack",
  WATER_SHADER = "waterShader",
}

export const textStyle = {
  fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
  color: "black",
};

export function renderTextAt(
  scene: Phaser.Scene,
  text: string,
  x: number,
  y: number
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, textStyle).setOrigin(0.5, 0.5);
}

export function getScreenHalfWidth(): number {
  return config.scale.width * 0.5;
}

export function getScreenHalfHeight(): number {
  return config.scale.height * 0.5;
}

export function getScreenSize(): { x: number; y: number } {
  return { x: config.scale.width, y: config.scale.height };
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function getRandomVertexColors() {
  // Create a random color for each vertex.
  // RandomRGB returns a Phaser.Display.Color object with random RGB values.
  const RandomRGB = Phaser.Display.Color.RandomRGB;
  return {
    topLeft: RandomRGB(),
    topRight: RandomRGB(),
    bottomLeft: RandomRGB(),
    bottomRight: RandomRGB(),
  };
}

export function getTintForVertexColor(vertex, value, fromColors, toColors) {
  // Interpolate between the fromColor and toColor of the current vertex,
  // using the current tween value.
  const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
    fromColors[vertex],
    toColors[vertex],
    100,
    value
  );

  // Interpolate.ColorWithColor returns a Javascript object with
  // interpolated RGB values. We convert it to a Phaser.Display.Color object
  // in order to get the integer value of the tint color.
  return Phaser.Display.Color.ObjectToColor(tint).color;
}

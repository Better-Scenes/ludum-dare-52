import Phaser from "phaser";

const WaterPipeline = new Phaser.Class({
  Extends: Phaser.Renderer.WebGL.Pipelines.SinglePipeline,

  initialize: function WaterPipeline(game, fragSrc: string) {
    Phaser.Renderer.WebGL.Pipelines.SinglePipeline.call(this, {
      game: game,
      fragShader: fragSrc,
      uniforms: [
        "uProjectionMatrix",
        "uViewMatrix",
        "uModelMatrix",
        "uMainSampler",
        "uResolution",
        "uTime",
      ],
    });
  },
});

export default WaterPipeline;

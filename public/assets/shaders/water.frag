precision highp float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform float uTime;
uniform float uStartTime;

varying vec2 outTexCoord;
varying vec4 outTint;

void main() {
    vec2 ripple_pos = uResolution * 0.5;
    const float decay_dist = 150.0;
    const float freq_mult_dist = 0.4;
    const float phase_mult_time = 0.03;

    vec2 delta = gl_FragCoord.xy - ripple_pos;
    float dist = length(delta);

    float time_elapsed = uTime - uStartTime;

    const float env_size = 25.0;
    float env_pos = time_elapsed * phase_mult_time / freq_mult_dist;
    float env = (1.0 - smoothstep(env_pos, env_pos + env_size, dist)) * smoothstep(env_pos - env_size, env_pos, dist);

    float amp = sin(dist * freq_mult_dist - time_elapsed * phase_mult_time) * (1.0 - smoothstep(0.0, decay_dist, dist)) * env;
    float power = (amp + 1.0) * 0.5;

    // vec4 texture = texture2D(uMainSampler, outTexCoord);
    // gl_FragColor = texture * power;

    gl_FragColor = vec4(power, power, power, 1.0);
}
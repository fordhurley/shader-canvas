precision highp float;

vec3 gradient(vec2 uv, vec3 startColor, vec3 endColor, vec2 startUV, vec2 endUV) {
  vec2 gradientVector = endUV - startUV;
  float k = dot(uv - startUV, gradientVector);
  k /= dot(gradientVector, gradientVector); // length squared
  k = clamp(k, 0.0, 1.0);
  return mix(startColor, endColor, k);
}

// From THREE.js:
// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float hash(const in vec2 uv) {
  #define PI 3.14159265359
	const highp float a = 12.9898;
  const highp float b = 78.233;
  const highp float c = 43758.5453;
	highp float dt = dot(uv, vec2(a, b));
  highp float sn = mod(dt, PI);
	return fract(sin(sn) * c);
}

highp float hash(const in float x, const in float y) {
  return hash(vec2(x, y));
}

// From Inigo Quilez
// http://iquilezles.org/www/articles/functions/functions.htm
//
// Great for triggering behaviours or making envelopes for music or animation,
// and for anything that grows fast and then slowly decays.
//
// Use k to control the stretching of the function. Btw, it's maximum, which is
// 1.0, happens at exactly x = 1/k.
float impulse(float k, float x) {
  float h = k * x;
  return h * exp(1.0-h);
}

float map(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec2 map(vec2 value, float inMin, float inMax, float outMin, float outMax) {
  return vec2(
    map(value.x, inMin, inMax, outMin, outMax),
    map(value.y, inMin, inMax, outMin, outMax)
  );
}

vec2 map(vec2 value, vec2 inMin, vec2 inMax, vec2 outMin, vec2 outMax) {
  return vec2(
    map(value.x, inMin.x, inMax.x, outMin.x, outMax.x),
    map(value.y, inMin.y, inMax.y, outMin.y, outMax.y)
  );
}

vec3 map(vec3 value, float inMin, float inMax, float outMin, float outMax) {
  return vec3(
    map(value.x, inMin, inMax, outMin, outMax),
    map(value.y, inMin, inMax, outMin, outMax),
    map(value.z, inMin, inMax, outMin, outMax)
  );
}

// polynomial smooth min
// http://iquilezles.org/www/articles/smin/smin.htm
float smoothUnion(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b-a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0-h);
}

float circleSDF(vec2 st, float radius) {
  return length(st) - radius;
}

vec4 hash1to4(float x) {
  vec4 seed = vec4(hash(vec2(x)));
  seed.y = hash(seed.xx + 12.329);
  seed.z = hash(seed.xy * PI + 43.239);
  seed.w = hash(seed.xz * 417.109 - PI*0.1);
  return seed;
}

float randomDotSDF(vec2 st, float t, float index) {
  vec4 seed = hash1to4(index);

  float angle = 2.0 * PI * seed.x;
  float size = mix(0.15, 0.2, seed.y);
  float speed = mix(1.5, 2.0, seed.z);
  float popiness = mix(10.0, 30.0, seed.w);

  float alpha = t * t * speed;

  vec2 center = vec2(
    alpha * cos(angle),
    alpha * sin(angle)
  );
  float radius = size * impulse(popiness, alpha);

  return circleSDF(st - center, radius);
}

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  uv.x *= aspect;
  uv.x += 0.5 - aspect/2.0;

  vec2 st = map(uv, 0.0, 1.0, -1.0, 1.0);

  const float magicOffset = 29.0; // to find a nicer beginning
  const float loopTime = 5.0;
  const int numParticles = 20;

  float d = 1e12;
  for (int i = 0; i < numParticles; i++) {
    float shiftedTime = u_time;
    shiftedTime -= loopTime * float(i) / float(numParticles);
    shiftedTime += magicOffset;
    float t = fract(shiftedTime / loopTime);
    float loopIndex = floor(shiftedTime / loopTime);
    float seed = loopIndex + float(i) * 142.8;
    float k = 0.3;
    d = smoothUnion(d, randomDotSDF(st, t, seed), k);
  }

  float alpha = 1.0 - step(0.0, d);

  vec3 bg = gradient(st,
    vec3(0.8, 0.85, 0.9),
    vec3(0.9, 0.95, 0.95),
    vec2(-1.0, -1.0),
    vec2(1.0, 0.8)
  );
  vec3 fg = mix(
    vec3(0.0, 0.2, 0.6),
    vec3(0.0, 0.3, 0.9),
    dot(st, st)
  );
  vec3 color = mix(bg, fg, alpha);

  gl_FragColor = vec4(color, 1.0);
}

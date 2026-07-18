import * as THREE from 'three'

// Materiale per l'ombra portata di uno sprite.
//
// Non usa luci: prende la sagoma dello sprite (il solo canale alpha), la
// riempie di un colore piatto e la sfoca. È l'equivalente digitale dell'ombra
// che una sagoma di carta proietta sul foglio dietro — coerente con la scena
// unlit e senza shadow map.
//
// Il piano dell'ombra è più grande dello sprite (vedi `uExpand`): la sfocatura
// deve poter sbordare oltre la sagoma, altrimenti viene tranciata di netto al
// bordo della geometria — taglio che resta nascosto finché l'ombra sta dietro
// lo sprite e salta fuori appena si alza la distanza.
//
// La morbidezza viene da due cose insieme: i livelli mip della texture, scelti
// con un bias proporzionale al raggio (una sfocatura vera, gratis), e alcuni
// campioni su tre anelli che ne smussano la struttura. Solo i tap, senza mip,
// darebbero il tipico aspetto "a scalini".

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec2 uBlur;
  uniform vec2 uExpand;
  uniform float uLod;
  varying vec2 vUv;

  float alphaAt(vec2 uv) {
    // Fuori dalla sagoma non c'è nulla da proiettare. Senza questo controllo
    // il campionamento ai bordi verrebbe "spalmato" (clamp to edge) lungo
    // tutto il piano allargato.
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    return texture2D(uMap, uv, uLod).a;
  }

  void main() {
    // Dal piano allargato alle coordinate della sagoma: al centro coincidono,
    // verso i bordi escono da [0,1] ed è lì che la sfocatura ha spazio.
    vec2 uv = (vUv - 0.5) * uExpand + 0.5;

    float a = alphaAt(uv) * 0.2;

    // Tre anelli a raggio crescente, con peso decrescente.
    for (int i = 0; i < 8; i++) {
      float ang = float(i) * 0.7853981634; // 2π / 8
      vec2 dir = vec2(cos(ang), sin(ang));
      a += alphaAt(uv + dir * uBlur) * 0.055;
      a += alphaAt(uv + dir * uBlur * 2.0) * 0.03;
      a += alphaAt(uv + dir * uBlur * 3.2) * 0.015;
    }

    if (a <= 0.002) discard;
    gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0) * uOpacity);
  }
`

export function createShadowMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uColor: { value: new THREE.Color('#2e4a4a') },
      uOpacity: { value: 0.3 },
      uBlur: { value: new THREE.Vector2(0.01, 0.01) },
      uExpand: { value: new THREE.Vector2(1, 1) },
      uLod: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    // Come gli sprite: l'ordine lo decide renderOrder, non il depth buffer.
    depthWrite: false,
    depthTest: false,
  })
}

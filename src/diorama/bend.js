import * as THREE from 'three'

// Piegatura della coda.
//
// Una coda che ruota rigida attorno alla base sembra un tergicristallo: si
// muove tutta insieme, e l'occhio legge un'asta. Una coda vera propaga il
// movimento dalla base alla punta con un ritardo.
//
// Qui il piano ha qualche segmento e ogni vertice viene ruotato attorno al
// perno di un angolo che cresce lungo la coda e che è *sfasato* in base alla
// distanza: la punta ripete con ritardo ciò che ha fatto la base. Un pezzo
// solo, nessuna gerarchia di segmenti da esportare.

const bendChunk = /* glsl */ `
  vec2 pv = transformed.xy - uPivot;
  // 0 al perno, 1 in punta.
  float t = clamp(-pv.y / uLen, 0.0, 1.0);
  // Il ritardo lungo la coda è ciò che trasforma l'oscillazione in un'onda.
  float a = uAmp * t * sin(uTime * uFreq - uLag * t);
  float s = sin(a), c = cos(a);
  transformed.xy = uPivot + vec2(pv.x * c - pv.y * s, pv.x * s + pv.y * c);
`

// Il materiale resta un meshBasicMaterial, così mappa, alpha e blending
// continuano a funzionare come per ogni altro layer: si inietta solo lo
// spostamento dei vertici.
export function createBendMaterial(texture, { shadow = false } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uPivot: { value: new THREE.Vector2() },
    uLen: { value: 1 },
    uAmp: { value: 0 },
    uFreq: { value: 1 },
    uLag: { value: 1 },
  }

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  })

  if (shadow) {
    // Come le altre sagome d'ombra: unione col massimo, non somma.
    material.blending = THREE.CustomBlending
    material.blendEquation = THREE.MaxEquation
    material.blendSrc = THREE.OneFactor
    material.blendDst = THREE.OneFactor
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform vec2 uPivot;
         uniform float uLen;
         uniform float uAmp;
         uniform float uFreq;
         uniform float uLag;`,
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${bendChunk}`)
  }

  return { material, uniforms }
}

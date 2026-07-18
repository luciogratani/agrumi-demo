import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import * as THREE from 'three'

// Ombre del diorama, disegnate in un buffer separato invece che sprite per sprite.
//
// Sfocare ogni ombra per conto suo non funziona: per un raggio ampio servono
// centinaia di campioni per pixel, e le scorciatoie (mipmap, pochi tap) fanno
// collassare la sagoma in un rettangolo pieno.
//
// Qui invece le sagome finiscono tutte in una texture fuori schermo, che viene
// sfocata UNA volta sola con una gaussiana separabile (due passate, orizzontale
// e verticale) e poi composta sulla scena. Tre vantaggi in un colpo:
//
//  - è una sfocatura vera, quindi nessun artefatto per quanto si alzi il raggio;
//  - le ombre si uniscono nel buffer, prima della composizione: sovrapponendosi
//    non si sommano, e l'opacità agisce sul risultato come fosse un pezzo solo;
//  - il buffer sta a un quarto di risoluzione (un'ombra sfocata non ha dettaglio
//    da perdere), quindi le passate di blur costano pochissimo.
//
// Le sagome restano figlie dei rispettivi pivot e continuano quindi a seguire
// vento e parallasse; si separano dal resto della scena con i layer di three.js.
//
// La risoluzione del buffer è regolabile (piena, metà, un quarto) per poter
// confrontare qualità e costo: a un quarto la riduzione stessa fa parte della
// sfocatura, quindi costa meno E risulta più liscia, ma perde i dettagli fini
// delle sagome.

export const SHADOW_LAYER = 1

const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Gaussiana separabile a 9 campioni. `uStep` è la direzione (orizzontale o
// verticale) già moltiplicata per il passo in coordinate texture.
const blurFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uStep;
  varying vec2 vUv;

  void main() {
    vec4 sum = texture2D(uMap, vUv) * 0.227027;
    sum += (texture2D(uMap, vUv + uStep * 1.0) + texture2D(uMap, vUv - uStep * 1.0)) * 0.1945946;
    sum += (texture2D(uMap, vUv + uStep * 2.0) + texture2D(uMap, vUv - uStep * 2.0)) * 0.1216216;
    sum += (texture2D(uMap, vUv + uStep * 3.0) + texture2D(uMap, vUv - uStep * 3.0)) * 0.0540540;
    sum += (texture2D(uMap, vUv + uStep * 4.0) + texture2D(uMap, vUv - uStep * 4.0)) * 0.0162162;
    gl_FragColor = sum;
  }
`

// Composizione: del buffer interessa solo la copertura (il canale alpha), il
// colore lo decide il pannello. Le UV vengono dalla posizione a schermo, così
// il piano può essere di qualsiasi dimensione e resta comunque allineato.
const compositeFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec2 uResolution;

  void main() {
    float a = texture2D(uMap, gl_FragCoord.xy / uResolution).a;
    if (a <= 0.002) discard;
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`

export default function ShadowPass({ shadow, world }) {
  const { gl, scene, camera, size } = useThree()

  const rtW = Math.max(1, Math.round(size.width * shadow.resolution))
  const rtH = Math.max(1, Math.round(size.height * shadow.resolution))

  const settings = { type: THREE.UnsignedByteType, depthBuffer: false, stencilBuffer: false }
  const rtA = useFBO(rtW, rtH, settings)
  const rtB = useFBO(rtW, rtH, settings)

  // Scena minima per le passate di blur: un piano che copre lo schermo,
  // disegnato da e verso i render target.
  const blur = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: null }, uStep: { value: new THREE.Vector2() } },
      vertexShader: fullscreenVertex,
      fragmentShader: blurFragment,
      depthTest: false,
      depthWrite: false,
    })
    const quadScene = new THREE.Scene()
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))
    return { scene: quadScene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), material }
  }, [])

  const composite = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uColor: { value: new THREE.Color('#2e4a4a') },
          uOpacity: { value: 0.3 },
          uResolution: { value: new THREE.Vector2() },
        },
        vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: compositeFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )

  // Priorità 1: R3F smette di disegnare da solo e il ciclo lo gestiamo qui,
  // perché il buffer delle ombre va riempito e sfocato prima della scena.
  useFrame(() => {
    composite.uniforms.uColor.value.set(shadow.color)
    composite.uniforms.uOpacity.value = shadow.enabled ? shadow.opacity : 0
    composite.uniforms.uMap.value = rtA.texture
    // gl_FragCoord è in pixel del buffer di disegno, non in pixel CSS.
    gl.getDrawingBufferSize(composite.uniforms.uResolution.value)

    if (shadow.enabled) {
      // 1. Le sole sagome, senza sfocatura, nel buffer. Lo sfondo della scena
      //    va tolto per la durata della passata: three lo disegnerebbe anche
      //    qui, riempiendo di opaco un buffer che deve restare trasparente.
      const background = scene.background
      scene.background = null
      camera.layers.set(SHADOW_LAYER)
      gl.setRenderTarget(rtA)
      gl.setClearColor(0x000000, 0)
      gl.clear(true, false, false)
      gl.render(scene, camera)
      scene.background = background

      // 2. Sfocatura: orizzontale e verticale, ripetute `iterations` volte.
      //
      //    Il raggio arriva in pixel a schermo e va convertito in pixel del
      //    buffer, così cambiando risoluzione la sfocatura resta la stessa e
      //    si confronta la qualità invece dell'entità.
      //
      //    Le varianze delle gaussiane si sommano, quindi ogni passata usa un
      //    raggio diviso per la radice del numero di passate: il risultato
      //    finale ha lo stesso raggio, solo più liscio. Serve alle risoluzioni
      //    alte, dove i 9 campioni sono troppo radi per un raggio ampio e la
      //    struttura del kernel torna a vedersi.
      const n = shadow.iterations
      const r = ((shadow.blur * shadow.resolution) / 4) / Math.sqrt(n)

      for (let i = 0; i < n; i++) {
        blur.material.uniforms.uMap.value = rtA.texture
        blur.material.uniforms.uStep.value.set(r / rtW, 0)
        gl.setRenderTarget(rtB)
        gl.render(blur.scene, blur.camera)

        blur.material.uniforms.uMap.value = rtB.texture
        blur.material.uniforms.uStep.value.set(0, r / rtH)
        gl.setRenderTarget(rtA)
        gl.render(blur.scene, blur.camera)
      }
    }

    // 3. La scena vera, col piano di composizione che legge il buffer.
    gl.setRenderTarget(null)
    camera.layers.set(0)
    gl.render(scene, camera)
  }, 1)

  // Piano di composizione: abbondante, perché deve coprire il frame anche
  // quando la camera è spostata con l'orbit control. Sta fra il fondale e i
  // layer, così le ombre cadono sul muro e non sugli sprite.
  return (
    <mesh renderOrder={-10} material={composite} frustumCulled={false}>
      <planeGeometry args={[world.w * 6, world.h * 6]} />
    </mesh>
  )
}

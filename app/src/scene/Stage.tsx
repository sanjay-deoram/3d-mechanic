import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  BackSide,
  Box3,
  Color,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Object3D,
} from 'three'
import { computeState, type SceneState } from '../engine'
import type { Procedure, ToolKind } from '../types'
import { BrakeCorner } from './BrakeCorner'
import { RegistryContext, type PartRegistry } from './registry'
import { SPINNER, Tool } from './Tool'

const TOOL_KINDS: ToolKind[] = ['ratchet', 'breaker', 'torque', 'compressor']
const INK = '#141414'
const FAINT = '#b3b3ad'
const ACCENT = new Color('#e6502e')
const X_AXIS = new Vector3(1, 0, 0)
/** Parts drawn in grey so they read as background. */
const BACKGROUND_PARTS = new Set(['chassis'])
/** Outline weight in CSS pixels. */
const OUTLINE_PX = 1.3
/** Matches the old 38° perspective view, so step camera distances still frame the same area. */
const VIEW_FACTOR = 2 * Math.tan((19 * Math.PI) / 180)

/** Element for each on-model label, keyed by the part id it points at. */
export type LabelElements = Record<string, HTMLElement | null>

export interface StageProps {
  procedure: Procedure
  stepIndex: number
  /** Bump to restart the current step's animation. */
  playNonce: number
  /** Bump to fly the camera back to the step's view. */
  viewNonce: number
  onProgress?: (t: number) => void
  labels?: RefObject<LabelElements>
  /** Render the step's fixed close-up instead of the interactive view. */
  detail?: boolean
}

/** What the line-art pass added to one part, kept so it can be faded, tinted and removed. */
interface Drawn {
  fills: MeshBasicMaterial[]
  line: LineBasicMaterial
  hull: ShaderMaterial
  added: Object3D[]
  center: Vector3
}

/**
 * Silhouette outline: the mesh drawn again inside-out and pushed outward on screen.
 * Catches the edges of round parts, which have no hard creases for EdgesGeometry to find.
 */
function hullMaterial(px: { value: Vector2 }, color: string) {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: { uPx: px, uColor: { value: new Color(color) }, uOpacity: { value: 1 } },
    vertexShader: `
      uniform vec2 uPx;
      void main() {
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        p.xy += n.xy * uPx * p.w;
        gl_Position = p;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() { gl_FragColor = vec4(uColor, uOpacity); }`,
  })
}

/** Turn a group of flat-filled meshes into line art: crease lines plus a silhouette. */
function draw(group: Group, px: { value: Vector2 }, ink: string): Drawn {
  const center = new Box3().setFromObject(group).getCenter(new Vector3())
  const line = new LineBasicMaterial({ color: ink })
  const hull = hullMaterial(px, ink)
  const fills: MeshBasicMaterial[] = []
  const added: Object3D[] = []
  const meshes: Mesh[] = []
  group.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshBasicMaterial) meshes.push(o)
  })
  for (const mesh of meshes) {
    const fill = mesh.material as MeshBasicMaterial
    // Push fills back a touch so the lines on their surface win the depth test.
    fill.polygonOffset = true
    fill.polygonOffsetFactor = 1
    fill.polygonOffsetUnits = 1
    fill.userData.base = fill.color.clone()
    fills.push(fill)
    const edges = new LineSegments(new EdgesGeometry(mesh.geometry, 30), line)
    mesh.add(edges)
    added.push(edges)
    if (fill.side !== DoubleSide) {
      const outline = new Mesh(mesh.geometry, hull)
      mesh.add(outline)
      added.push(outline)
    }
  }
  return { fills, line, hull, added, center }
}

function erase(d: Drawn) {
  for (const o of d.added) {
    o.removeFromParent()
    if (o instanceof LineSegments) o.geometry.dispose()
  }
  d.line.dispose()
  d.hull.dispose()
}

function Scene({ procedure, stepIndex, playNonce, viewNonce, onProgress, labels, detail }: StageProps) {
  const registry = useMemo<PartRegistry>(() => new Map(), [])
  const state = useMemo<SceneState>(() => ({ parts: new Map(), tool: null }), [])
  const drawn = useMemo(() => new Map<string, Drawn>(), [])
  const px = useMemo(() => ({ value: new Vector2() }), [])
  const tools = useRef<Partial<Record<ToolKind, Group | null>>>({})
  const clock = useRef(0)
  const flying = useRef(true)
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const goal = useMemo(() => ({ pos: new Vector3(), target: new Vector3() }), [])
  const quat = useMemo(() => new Quaternion(), [])
  const twist = useMemo(() => new Quaternion(), [])
  const point = useMemo(() => new Vector3(), [])

  const step = procedure.steps[stepIndex]

  useLayoutEffect(() => {
    const all: Drawn[] = []
    for (const [id, group] of registry) {
      const d = draw(group, px, BACKGROUND_PARTS.has(id) ? FAINT : INK)
      drawn.set(id, d)
      all.push(d)
    }
    for (const kind of TOOL_KINDS) {
      const g = tools.current[kind]
      if (g) all.push(draw(g, px, INK))
    }
    return () => {
      all.forEach(erase)
      drawn.clear()
    }
  }, [registry, drawn, px])

  useEffect(() => {
    clock.current = 0
  }, [stepIndex, playNonce])

  useEffect(() => {
    flying.current = true
  }, [stepIndex, viewNonce])

  useFrame(({ camera, size, clock: sceneClock }, delta) => {
    const duration = step.duration ?? 3
    clock.current = Math.min(1, clock.current + Math.min(delta, 0.1) / duration)
    const t = step.actions.length ? clock.current : 1
    onProgress?.(t)

    computeState(procedure, stepIndex, t, state)
    px.value.set((2 * OUTLINE_PX) / size.width, (2 * OUTLINE_PX) / size.height)

    const pulse = 0.72 + 0.2 * Math.sin(sceneClock.elapsedTime * 4)
    for (const [id, group] of registry) {
      const s = state.parts.get(id)
      const opacity = s ? s.opacity : 1
      if (s) group.matrix.copy(s.matrix)
      else group.matrix.identity()
      group.matrixWorldNeedsUpdate = true
      group.visible = opacity > 0.01
      const d = drawn.get(id)
      if (!d) continue
      const lit = step.highlight?.includes(id) ?? false
      const see = opacity < 0.999
      for (const fill of d.fills) {
        fill.transparent = see
        fill.opacity = opacity
        fill.color.copy(fill.userData.base as Color)
        if (lit) fill.color.lerp(ACCENT, pulse)
      }
      d.line.transparent = see
      d.line.opacity = opacity
      d.hull.transparent = see
      d.hull.uniforms.uOpacity.value = opacity
    }

    for (const kind of TOOL_KINDS) {
      const g = tools.current[kind]
      if (!g) continue
      const pose = state.tool?.kind === kind ? state.tool : null
      g.visible = !!pose
      if (!pose) continue
      quat.setFromUnitVectors(X_AXIS, pose.axis)
      twist.setFromAxisAngle(X_AXIS, pose.angle)
      // Tools with a spinner turn only that part; the rest hold still.
      const spinner = g.getObjectByName(SPINNER)
      if (spinner) {
        spinner.quaternion.copy(twist)
        g.quaternion.copy(quat)
      } else {
        g.quaternion.copy(quat).multiply(twist)
      }
      g.position.copy(pose.position)
      g.scale.setScalar(pose.scale)
    }

    if (detail) {
      if (!step.detail) return
      goal.target.set(...step.detail.target)
      goal.pos
        .set(...step.camera.pos)
        .sub(point.set(...step.camera.target))
        .normalize()
        .multiplyScalar(20)
        .add(goal.target)
      camera.position.copy(goal.pos)
      camera.lookAt(goal.target)
      camera.zoom = size.height / step.detail.span
      camera.updateProjectionMatrix()
      return
    }

    if (flying.current && controls.current) {
      // Pull back on narrow (phone) screens so the part stays in frame.
      const aspect = size.width / size.height
      const pullBack = aspect < 1.25 ? Math.min(2, 1.25 / aspect) : 1
      goal.target.set(...step.camera.target)
      goal.pos.set(...step.camera.pos)
      const zoom = size.height / (VIEW_FACTOR * goal.pos.distanceTo(goal.target) * pullBack)
      const k = 1 - Math.exp(-4 * delta)
      camera.position.lerp(goal.pos, k)
      camera.zoom += (zoom - camera.zoom) * k
      camera.updateProjectionMatrix()
      controls.current.target.lerp(goal.target, k)
      controls.current.update()
      if (camera.position.distanceTo(goal.pos) < 0.01 && Math.abs(zoom - camera.zoom) < 0.05) flying.current = false
    }

    const els = labels?.current
    if (els) {
      for (const id in els) {
        const el = els[id]
        const d = drawn.get(id)
        const s = state.parts.get(id)
        if (!el || !d) continue
        point.copy(d.center)
        if (s) point.applyMatrix4(s.matrix)
        point.project(camera)
        const x = (point.x * 0.5 + 0.5) * size.width
        const y = (0.5 - point.y * 0.5) * size.height
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        el.style.opacity = (s ? s.opacity : 1) > 0.4 ? '1' : '0'
      }
    }
  })

  return (
    <RegistryContext.Provider value={registry}>
      <BrakeCorner />
      {TOOL_KINDS.map((kind) => (
        <Tool
          key={kind}
          kind={kind}
          ref={(g) => {
            tools.current[kind] = g
          }}
        />
      ))}
      {!detail && (
        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          minZoom={18}
          maxZoom={700}
          maxPolarAngle={Math.PI * 0.62}
          onStart={() => {
            flying.current = false
          }}
        />
      )}
    </RegistryContext.Provider>
  )
}

export function Stage(props: StageProps) {
  const start = props.procedure.steps[0].camera.pos
  return (
    <Canvas flat orthographic camera={{ position: start, zoom: 60, near: -200, far: 400 }} dpr={[1, 2]}>
      <Scene {...props} />
    </Canvas>
  )
}

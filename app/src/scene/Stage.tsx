import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Color, Group, Mesh, MeshStandardMaterial, PMREMGenerator, Quaternion, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { computeState, type SceneState } from '../engine'
import type { Procedure, ToolKind } from '../types'
import { BrakeCorner } from './BrakeCorner'
import { RegistryContext, type PartRegistry } from './registry'
import { SPINNER, Tool } from './Tool'

const TOOL_KINDS: ToolKind[] = ['ratchet', 'breaker', 'torque', 'compressor']
const GLOW = new Color('#ff6a00')
const X_AXIS = new Vector3(1, 0, 0)

export interface StageProps {
  procedure: Procedure
  stepIndex: number
  /** Bump to restart the current step's animation. */
  playNonce: number
  /** Bump to fly the camera back to the step's view. */
  viewNonce: number
  onProgress: (t: number) => void
}

function Lighting() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return (
    <>
      <hemisphereLight args={['#ffffff', '#30343a', 0.6]} />
      <directionalLight position={[6, 8, 7]} intensity={1.6} />
      <directionalLight position={[-6, 3, 4]} intensity={0.7} />
    </>
  )
}

function meshesOf(group: Group, cache: WeakMap<Group, MeshStandardMaterial[]>) {
  let list = cache.get(group)
  if (!list) {
    list = []
    group.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) list!.push(o.material)
    })
    cache.set(group, list)
  }
  return list
}

function Scene({ procedure, stepIndex, playNonce, viewNonce, onProgress }: StageProps) {
  const registry = useMemo<PartRegistry>(() => new Map(), [])
  const state = useMemo<SceneState>(() => ({ parts: new Map(), tool: null }), [])
  const materials = useMemo(() => new WeakMap<Group, MeshStandardMaterial[]>(), [])
  const tools = useRef<Partial<Record<ToolKind, Group | null>>>({})
  const clock = useRef(0)
  const flying = useRef(true)
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const goal = useMemo(() => ({ pos: new Vector3(), target: new Vector3() }), [])
  const quat = useMemo(() => new Quaternion(), [])
  const twist = useMemo(() => new Quaternion(), [])

  const step = procedure.steps[stepIndex]

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
    onProgress(t)

    computeState(procedure, stepIndex, t, state)

    const pulse = 0.4 + 0.25 * Math.sin(sceneClock.elapsedTime * 4)
    for (const [id, group] of registry) {
      const s = state.parts.get(id)
      const opacity = s ? s.opacity : 1
      if (s) group.matrix.copy(s.matrix)
      else group.matrix.identity()
      group.matrixWorldNeedsUpdate = true
      group.visible = opacity > 0.01
      const lit = step.highlight?.includes(id) ?? false
      for (const mat of meshesOf(group, materials)) {
        mat.transparent = opacity < 0.999
        mat.opacity = opacity
        mat.emissive.copy(GLOW)
        mat.emissiveIntensity = lit ? pulse : 0
      }
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

    if (flying.current && controls.current) {
      // Pull back on narrow (phone) screens so the part stays in frame.
      const aspect = size.width / size.height
      const pullBack = aspect < 1.25 ? Math.min(2, 1.25 / aspect) : 1
      goal.target.set(...step.camera.target)
      goal.pos
        .set(...step.camera.pos)
        .sub(goal.target)
        .multiplyScalar(pullBack)
        .add(goal.target)
      const k = 1 - Math.exp(-4 * delta)
      camera.position.lerp(goal.pos, k)
      controls.current.target.lerp(goal.target, k)
      controls.current.update()
      if (camera.position.distanceTo(goal.pos) < 0.01) flying.current = false
    }
  })

  return (
    <RegistryContext.Provider value={registry}>
      <Lighting />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.17, 0]}>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#1b1e23" roughness={1} metalness={0} />
      </mesh>
      <ContactShadows position={[0, -3.16, 0]} scale={16} far={7} blur={2.6} opacity={0.55} />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        minDistance={2.2}
        maxDistance={20}
        maxPolarAngle={Math.PI * 0.62}
        onStart={() => {
          flying.current = false
        }}
      />
    </RegistryContext.Provider>
  )
}

export function Stage(props: StageProps) {
  const start = props.procedure.steps[0].camera.pos
  return (
    <Canvas camera={{ position: start, fov: 38, near: 0.1, far: 100 }} dpr={[1, 2]}>
      <color attach="background" args={['#15171b']} />
      <fog attach="fog" args={['#15171b', 16, 34]} />
      <Scene {...props} />
    </Canvas>
  )
}

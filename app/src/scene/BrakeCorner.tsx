import { memo, useMemo } from 'react'
import {
  CatmullRomCurve3,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Path,
  Quaternion,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import type { Vec3 } from '../types'
import { G, LUG_COUNT, lugCenter } from './geometry'
import { Part } from './Part'

interface Look {
  color: string
}

/** Paper tones: the scene is drawn as line art, so parts differ in tone only where it helps. */
const WHITE: Look = { color: '#ffffff' }
const LOOK = {
  rotor: WHITE,
  rotorCast: WHITE,
  iron: WHITE,
  caliper: WHITE,
  bracket: WHITE,
  backing: { color: '#f1f0ec' },
  wornFriction: { color: '#b9b6ae' },
  newFriction: { color: '#d8d5cd' },
  shim: WHITE,
  clip: WHITE,
  chrome: WHITE,
  bolt: WHITE,
  piston: WHITE,
  rubber: { color: '#e7e5de' },
  wheel: WHITE,
  wheelDark: { color: '#f1f0ec' },
  chassis: WHITE,
  shield: WHITE,
} satisfies Record<string, Look>

function Mat({ look, double }: { look: Look; double?: boolean }) {
  return <meshBasicMaterial color={look.color} side={double ? DoubleSide : undefined} />
}

/* ---------- primitives ---------- */

/** Cylinder whose axis runs along X. */
function CylX({
  x,
  at,
  r,
  look,
  segments = 32,
}: {
  x: [number, number]
  at: [number, number]
  r: number
  look: Look
  segments?: number
}) {
  return (
    <mesh position={[(x[0] + x[1]) / 2, at[0], at[1]]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[r, r, Math.abs(x[1] - x[0]), segments]} />
      <Mat look={look} />
    </mesh>
  )
}

/** Cylinder between two points. */
function Rod({ from, to, r, look }: { from: Vec3; to: Vec3; r: number; look: Look }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const dir = b.clone().sub(a)
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[r, r, length, 24]} />
      <Mat look={look} />
    </mesh>
  )
}

/**
 * Surface of revolution around an X-parallel axis through (y, z) = `at`, from
 * (radius, x) profile points. `arc` limits it to part of the circle, measured
 * from the +Z direction.
 */
function Lathe({
  profile,
  look,
  double,
  at = [0, 0],
  arc,
}: {
  profile: [number, number][]
  look: Look
  double?: boolean
  at?: [number, number]
  arc?: [number, number]
}) {
  const geometry = useMemo(
    () =>
      new LatheGeometry(
        profile.map(([r, x]) => new Vector2(r, x)),
        96,
        arc ? arc[0] : 0,
        arc ? arc[1] : Math.PI * 2,
      ),
    [profile, arc],
  )
  return (
    <mesh geometry={geometry} position={[0, at[0], at[1]]} rotation={[0, 0, -Math.PI / 2]}>
      <Mat look={look} double={double} />
    </mesh>
  )
}

type Plane = 'yz' | 'zx' | 'xy'

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
/** Each maps an outline's (u, v) onto the named plane and its thickness onto the third axis. */
const BASIS: Record<Plane, Matrix4> = {
  yz: new Matrix4().makeBasis(Y, Z, X),
  zx: new Matrix4().makeBasis(Z, X, Y),
  xy: new Matrix4(),
}

/** A 2D outline given thickness from `a` to `b` along the axis the plane leaves out, with rounded edges. */
function slab(shape: Shape, plane: Plane, a: number, b: number, bevel = 0) {
  const lo = Math.min(a, b)
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.abs(b - a) - 2 * bevel,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 24,
  })
  geometry.translate(0, 0, bevel)
  geometry.applyMatrix4(BASIS[plane])
  if (plane === 'yz') geometry.translate(lo, 0, 0)
  else if (plane === 'zx') geometry.translate(0, lo, 0)
  else geometry.translate(0, 0, lo)
  return geometry
}

function Slab({
  shape,
  plane,
  from,
  to,
  bevel,
  look,
}: {
  shape: Shape
  plane: Plane
  from: number
  to: number
  bevel?: number
  look: Look
}) {
  const geometry = useMemo(() => slab(shape, plane, from, to, bevel), [shape, plane, from, to, bevel])
  return (
    <mesh geometry={geometry}>
      <Mat look={look} />
    </mesh>
  )
}

function polygon(points: [number, number][]) {
  const shape = new Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (const [u, v] of points.slice(1)) shape.lineTo(u, v)
  shape.closePath()
  return shape
}

function roundedRect<T extends Path>(path: T, u0: number, u1: number, v0: number, v1: number, r: number): T {
  path.moveTo(u0 + r, v0)
  path.lineTo(u1 - r, v0)
  path.quadraticCurveTo(u1, v0, u1, v0 + r)
  path.lineTo(u1, v1 - r)
  path.quadraticCurveTo(u1, v1, u1 - r, v1)
  path.lineTo(u0 + r, v1)
  path.quadraticCurveTo(u0, v1, u0, v1 - r)
  path.lineTo(u0, v0 + r)
  path.quadraticCurveTo(u0, v0, u0 + r, v0)
  return path
}

/** Points along a rotor-concentric arc of radius `r`, from y0 to y1, as (y, z). */
function arc(r: number, y0: number, y1: number, n = 16): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const y = y0 + ((y1 - y0) * i) / n
    return [y, Math.sqrt(r * r - y * y)]
  })
}

/* ---------- wheel ---------- */

const TIRE: [number, number][] = [
  [2.16, -0.93],
  [2.3, -1.03],
  [2.6, -1.09],
  [2.88, -1.07],
  [3.06, -0.98],
  [3.13, -0.86],
  [3.15, -0.78],
  [3.15, -0.5],
  [3.12, -0.48],
  [3.12, -0.42],
  [3.15, -0.4],
  [3.15, -0.04],
  [3.12, -0.03],
  [3.12, 0.03],
  [3.15, 0.04],
  [3.15, 0.4],
  [3.12, 0.42],
  [3.12, 0.48],
  [3.15, 0.5],
  [3.15, 0.78],
  [3.13, 0.86],
  [3.06, 0.98],
  [2.88, 1.07],
  [2.6, 1.09],
  [2.3, 1.03],
  [2.16, 0.93],
]

const BARREL: [number, number][] = [
  [2.25, -0.99],
  [2.17, -0.94],
  [2.08, -0.7],
  [2.04, -0.3],
  [2.04, 0.5],
  [2.1, 0.86],
  [2.17, 0.94],
  [2.25, 0.99],
  [2.2, 1.0],
  [2.1, 0.96],
]

const WHEEL_CENTER: [number, number][] = [
  [0.36, G.hatFace],
  [0.9, G.hatFace],
  [0.92, 0.5],
  [0.86, 0.6],
  [0.74, 0.64],
  [0.36, 0.64],
]

/** One spoke, drawn root-to-rim along u, tapering toward the rim. */
const SPOKE = polygon([
  [0, -0.105],
  [1.5, -0.065],
  [1.5, 0.065],
  [0, 0.105],
])

function Wheel() {
  const spokes = useMemo(() => {
    const list: number[] = []
    for (let k = 0; k < LUG_COUNT; k++) {
      const mid = Math.PI / 2 + ((k + 0.5) * Math.PI * 2) / LUG_COUNT
      list.push(mid - 0.2, mid + 0.2)
    }
    return list
  }, [])
  return (
    <>
      <Lathe profile={TIRE} look={LOOK.rubber} />
      <Lathe profile={BARREL} look={LOOK.wheel} double />
      <Lathe profile={WHEEL_CENTER} look={LOOK.wheel} double />
      <CylX x={[0.62, 0.69]} at={[0, 0]} r={0.3} look={LOOK.wheelDark} segments={48} />
      {spokes.map((a) => (
        <group key={a} rotation={[a, 0, 0]}>
          <group position={[0.5, 0.66, 0]} rotation={[0, 0, -0.25]}>
            <Slab shape={SPOKE} plane="yz" from={0} to={0.16} bevel={0.035} look={LOOK.wheel} />
          </group>
        </group>
      ))}
    </>
  )
}

function LugNut({ center }: { center: Vec3 }) {
  return (
    <>
      <CylX x={[center[0], center[0] + 0.22]} at={[center[1], center[2]]} r={0.112} look={LOOK.chrome} segments={6} />
      <mesh position={[center[0] + 0.22, center[1], center[2]]} scale={[0.6, 1, 1]}>
        <sphereGeometry args={[0.095, 20, 14]} />
        <Mat look={LOOK.chrome} />
      </mesh>
    </>
  )
}

/* ---------- pads ---------- */

/** Curved band between two radii, the basic outline of a pad. */
function band(inner: number, outer: number, y0: number, y1: number) {
  return polygon([...arc(outer, y0, y1), ...arc(inner, y1, y0)])
}

/** Steel backing plate: a curved band with a notched ear at each end that rides in the retainers. */
const BACKING = (() => {
  const half = 0.58
  const ear: [number, number] = [1.02, 1.2]
  return polygon([
    ...arc(1.47, -half, half),
    [half, ear[1]],
    [0.65, ear[1]],
    [0.65, ear[0]],
    [half, ear[0]],
    ...arc(0.95, half, -half),
    [-half, ear[0]],
    [-0.65, ear[0]],
    [-0.65, ear[1]],
    [-half, ear[1]],
  ])
})()

const FRICTION_HALVES = [band(1.0, 1.44, -0.53, -0.02), band(1.0, 1.44, 0.02, 0.53)]
const SHIM = band(0.99, 1.44, -0.55, 0.55)

function Pad({ side, friction, look }: { side: 1 | -1; friction: number; look: Look }) {
  const f0 = side * G.rotorHalf
  const f1 = side * (G.rotorHalf + friction)
  const b1 = side * (G.rotorHalf + friction + G.backing)
  const bevel = Math.min(0.014, friction / 4)
  return (
    <>
      {FRICTION_HALVES.map((shape, i) => (
        <Slab key={i} shape={shape} plane="yz" from={f0} to={f1} bevel={bevel} look={look} />
      ))}
      <Slab shape={BACKING} plane="yz" from={f1} to={b1} bevel={0.006} look={LOOK.backing} />
    </>
  )
}

function Shim({ side, friction }: { side: 1 | -1; friction: number }) {
  const s0 = side * (G.rotorHalf + friction + G.backing)
  return <Slab shape={SHIM} plane="yz" from={s0} to={s0 + side * G.shim} look={LOOK.shim} />
}

/** Spring-steel clip lining one end of the bracket: a plate each side of the rotor joined over its edge. */
function Retainer({ side }: { side: 1 | -1 }) {
  const y0 = side * 0.655
  const y1 = side * 0.685
  const plate = useMemo(() => roundedRect(new Shape(), 0.97, 1.47, -0.3, -0.14, 0.02), [])
  const plateOut = useMemo(() => roundedRect(new Shape(), 0.97, 1.47, 0.14, 0.3, 0.02), [])
  const strap = useMemo(() => roundedRect(new Shape(), 1.45, 1.5, -0.3, 0.3, 0.01), [])
  return (
    <>
      <Slab shape={plate} plane="zx" from={y0} to={y1} look={LOOK.clip} />
      <Slab shape={plateOut} plane="zx" from={y0} to={y1} look={LOOK.clip} />
      <Slab shape={strap} plane="zx" from={y0} to={y1} look={LOOK.clip} />
    </>
  )
}

/** Bent wire that pushes the two pads apart when the brakes release. */
function ReturnSpring({ side }: { side: 1 | -1 }) {
  const geometry = useMemo(() => {
    const y = side * 0.42
    const tip = side * 0.5
    const curve = new CatmullRomCurve3(
      [
        new Vector3(-0.2, tip, 1.36),
        new Vector3(-0.2, y, 1.44),
        new Vector3(-0.15, y, 1.56),
        new Vector3(0, y, 1.6),
        new Vector3(0.15, y, 1.56),
        new Vector3(0.2, y, 1.44),
        new Vector3(0.2, tip, 1.36),
      ],
      false,
      'catmullrom',
      0.3,
    )
    return new TubeGeometry(curve, 48, 0.017, 8)
  }, [side])
  return (
    <mesh geometry={geometry}>
      <Mat look={LOOK.clip} />
    </mesh>
  )
}

/* ---------- caliper ---------- */

/** Top of the caliper spanning the rotor, with the window you can see the pads through. */
const BRIDGE = (() => {
  const shape = roundedRect(new Shape(), -0.64, 0.44, -0.62, 0.62, 0.1)
  shape.holes.push(roundedRect(new Path(), -0.2, 0.2, -0.3, 0.3, 0.06))
  return shape
})()

/** Outboard face: one wide plate with a notch up the middle, leaving two fingers that press the outer pad. */
const FINGERS = (() => {
  const s = new Shape()
  s.moveTo(-0.6, 1.62)
  s.lineTo(0.6, 1.62)
  s.lineTo(0.6, 1.12)
  s.quadraticCurveTo(0.6, 1.02, 0.5, 1.02)
  s.lineTo(0.24, 1.02)
  s.quadraticCurveTo(0.16, 1.02, 0.16, 1.1)
  s.lineTo(0.16, 1.26)
  s.quadraticCurveTo(0.16, 1.38, 0, 1.38)
  s.quadraticCurveTo(-0.16, 1.38, -0.16, 1.26)
  s.lineTo(-0.16, 1.1)
  s.quadraticCurveTo(-0.16, 1.02, -0.24, 1.02)
  s.lineTo(-0.5, 1.02)
  s.quadraticCurveTo(-0.6, 1.02, -0.6, 1.12)
  s.closePath()
  return s
})()

/** Web of metal joining the piston cylinder to the bridge. */
const HOUSING_WEB = polygon([
  [-0.4, 1.15],
  [0.4, 1.15],
  [0.62, 1.55],
  [0.62, 1.8],
  [-0.62, 1.8],
  [-0.62, 1.55],
])

const CYLINDER: [number, number][] = [
  [0, -1.0],
  [0.3, -1.0],
  [0.4, -0.96],
  [0.44, -0.88],
  [0.44, -0.46],
  [0.41, -0.42],
  [0.335, -0.42],
  [0.335, -0.5],
]

/** Arm reaching from the caliper body to a slide pin, ending in a round eye for the flange bolt. */
function ear(side: 1 | -1) {
  const s = new Shape()
  const a = side * 0.42
  const c = side * G.pinY
  s.moveTo(a, 1.3)
  s.lineTo(c, G.pinZ - 0.15)
  s.absarc(c, G.pinZ, 0.15, -Math.PI / 2, Math.PI / 2, side === -1)
  s.lineTo(a, 1.62)
  s.closePath()
  return s
}

const EARS = { 1: ear(1), [-1]: ear(-1) }

function FlangeBolt({ y }: { y: number }) {
  return (
    <>
      <CylX x={[-0.645, G.boltHeadX]} at={[y, G.pinZ]} r={0.115} look={LOOK.bolt} />
      <CylX x={[-0.73, -0.645]} at={[y, G.pinZ]} r={0.078} look={LOOK.bolt} segments={6} />
    </>
  )
}

function Caliper() {
  return (
    <>
      <Slab shape={BRIDGE} plane="xy" from={1.52} to={1.8} bevel={0.035} look={LOOK.caliper} />
      <Slab shape={FINGERS} plane="yz" from={0.3} to={0.44} bevel={0.025} look={LOOK.caliper} />
      <Slab shape={HOUSING_WEB} plane="yz" from={-0.96} to={-0.44} bevel={0.04} look={LOOK.caliper} />
      <Lathe profile={CYLINDER} look={LOOK.caliper} at={[G.pistonY, G.pistonZ]} double />
      <mesh position={[-0.43, G.pistonY, G.pistonZ]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.325, 0.03, 12, 48]} />
        <Mat look={LOOK.rubber} />
      </mesh>
      <Slab shape={EARS[1]} plane="yz" from={-0.62} to={-0.5} bevel={0.02} look={LOOK.caliper} />
      <Slab shape={EARS[-1]} plane="yz" from={-0.62} to={-0.5} bevel={0.02} look={LOOK.caliper} />
      <FlangeBolt y={G.pinY} />
      {/* Brake hose banjo fitting and bleeder screw on the back of the cylinder. */}
      <CylX x={[-1.1, -1.0]} at={[G.pistonY, G.pistonZ]} r={0.085} look={LOOK.bolt} segments={6} />
      <CylX x={[-1.03, -1.0]} at={[G.pistonY, G.pistonZ]} r={0.13} look={LOOK.iron} />
      <Rod from={[-0.8, 0.3, 1.5]} to={[-0.92, 0.52, 1.66]} r={0.045} look={LOOK.bolt} />
      <Rod from={[-0.92, 0.52, 1.66]} to={[-0.96, 0.59, 1.71]} r={0.055} look={LOOK.rubber} />
    </>
  )
}

/** Hollow steel cup pushed out by brake fluid. */
function Piston() {
  const face = -(G.rotorHalf + G.newFriction + G.backing + G.shim)
  const profile = useMemo<[number, number][]>(
    () => [
      [0.3, -0.6],
      [0.3, face - 0.012],
      [0.288, face],
      [0.235, face],
      [0.225, face - 0.1],
      [0, face - 0.1],
    ],
    [face],
  )
  return <Lathe profile={profile} look={LOOK.piston} at={[G.pistonY, G.pistonZ]} double />
}

/* ---------- bracket ---------- */

/** End of the bracket that straddles the rotor edge, drawn in (z, x). */
const BRACKET_END = polygon([
  [0.8, -0.42],
  [1.68, -0.42],
  [1.68, 0.42],
  [0.84, 0.42],
  [0.84, 0.14],
  [1.5, 0.14],
  [1.5, -0.14],
  [0.8, -0.14],
])

/** Bar joining the two ends, bowed toward the hub in the middle. */
function tieBar(top: number, thickness: number) {
  const n = 14
  const edge = (offset: number, reverse: boolean): [number, number][] => {
    const pts = Array.from({ length: n + 1 }, (_, i): [number, number] => {
      const y = -0.9 + (1.8 * i) / n
      return [y, top + 0.11 * (y / 0.8) ** 2 - offset]
    })
    return reverse ? pts.reverse() : pts
  }
  return polygon([...edge(0, false), ...edge(thickness, true)])
}

const TIE_INBOARD = tieBar(0.86, 0.16)
const TIE_OUTBOARD = tieBar(0.955, 0.13)

function Bracket() {
  return (
    <>
      {([1, -1] as const).map((s) => (
        <group key={s}>
          <Slab shape={BRACKET_END} plane="zx" from={s * 0.69} to={s * 0.93} bevel={0.025} look={LOOK.bracket} />
          <CylX x={[-0.42, 0.3]} at={[s * G.pinY, G.pinZ]} r={0.135} look={LOOK.bracket} />
          {/* Ribbed rubber boot sealing the slide pin. */}
          {[0, 1, 2, 3].map((i) => (
            <CylX
              key={i}
              x={[-0.5 + i * 0.02, -0.48 + i * 0.02]}
              at={[s * G.pinY, G.pinZ]}
              r={i % 2 ? 0.085 : 0.108}
              look={LOOK.rubber}
            />
          ))}
          {/* Bolt holding the bracket to the steering knuckle. */}
          <CylX x={[-0.63, -0.6]} at={[s * 0.6, 0.76]} r={0.14} look={LOOK.iron} />
          <CylX x={[-0.73, -0.63]} at={[s * 0.6, 0.76]} r={0.105} look={LOOK.iron} segments={6} />
        </group>
      ))}
      <Slab shape={TIE_INBOARD} plane="yz" from={-0.42} to={-0.32} bevel={0.02} look={LOOK.bracket} />
      <Slab shape={TIE_OUTBOARD} plane="yz" from={0.31} to={0.42} bevel={0.02} look={LOOK.bracket} />
    </>
  )
}

/* ---------- rotor, hub and suspension ---------- */

const ROTOR_RING: [number, number][] = [
  [0.82, -0.125],
  [1.485, -0.125],
  [1.5, -0.11],
  [1.5, -0.05],
  [1.43, -0.045],
  [1.43, 0.045],
  [1.5, 0.05],
  [1.5, 0.11],
  [1.485, 0.125],
  [0.82, 0.125],
]

const ROTOR_HAT: [number, number][] = [
  [0.82, -0.125],
  [0.78, -0.08],
  [0.36, -0.08],
  [0.36, G.hatFace],
  [0.77, G.hatFace],
  [0.8, 0.42],
  [0.82, 0.125],
]

const HUB_NOSE: [number, number][] = [
  [0.33, 0.3],
  [0.33, 0.6],
  [0.3, 0.63],
  [0.2, 0.63],
  [0.18, 0.56],
  [0, 0.56],
]

const VANES = 44

function Hub() {
  return (
    <>
      <Lathe profile={ROTOR_RING} look={LOOK.rotor} />
      <Lathe profile={ROTOR_HAT} look={LOOK.rotorCast} double />
      <Lathe profile={HUB_NOSE} look={LOOK.iron} />
      {/* Cooling vanes between the two friction faces. */}
      {Array.from({ length: VANES }, (_, i) => (
        <group key={i} rotation={[(i * Math.PI * 2) / VANES, 0, 0]}>
          <mesh position={[0, 1.455, 0]}>
            <boxGeometry args={[0.09, 0.07, 0.035]} />
            <Mat look={LOOK.rotorCast} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: LUG_COUNT }, (_, i) => {
        const c = lugCenter(i)
        return (
          <group key={i}>
            <CylX x={[G.hatFace, 0.82]} at={[c[1], c[2]]} r={0.058} look={LOOK.chrome} segments={16} />
            <CylX x={[0.82, 0.85]} at={[c[1], c[2]]} r={0.045} look={LOOK.chrome} segments={16} />
          </group>
        )
      })}
      {/* The two small screws that hold a Honda rotor to the hub. */}
      {[0.5, 3].map((k) => {
        const a = Math.PI / 2 + (k * Math.PI * 2) / LUG_COUNT
        return (
          <CylX
            key={k}
            x={[G.hatFace - 0.01, G.hatFace + 0.012]}
            at={[0.57 * Math.cos(a), 0.57 * Math.sin(a)]}
            r={0.05}
            look={LOOK.iron}
          />
        )
      })}
    </>
  )
}

const SHIELD: [number, number][] = [
  [0.7, -0.2],
  [1.5, -0.2],
  [1.56, -0.16],
]

const KNUCKLE = roundedRect(new Shape(), -0.52, 0.52, -0.5, 0.5, 0.18)
const KNUCKLE_LUG = {
  1: roundedRect(new Shape(), 0.42, 0.78, 0.35, 0.92, 0.08),
  [-1]: roundedRect(new Shape(), -0.78, -0.42, 0.35, 0.92, 0.08),
}

function Chassis() {
  return (
    <>
      <Slab shape={KNUCKLE} plane="yz" from={-0.82} to={-0.22} bevel={0.05} look={LOOK.chassis} />
      <Slab shape={KNUCKLE_LUG[1]} plane="yz" from={-0.6} to={-0.42} bevel={0.02} look={LOOK.chassis} />
      <Slab shape={KNUCKLE_LUG[-1]} plane="yz" from={-0.6} to={-0.42} bevel={0.02} look={LOOK.chassis} />
      {/* Splash shield behind the rotor, cut away where the caliper sits. */}
      <Lathe profile={SHIELD} look={LOOK.shield} double arc={[0.95, Math.PI * 2 - 1.9]} />
      <Rod from={[-0.95, 0.3, 0]} to={[-1.25, 2.4, 0]} r={0.3} look={LOOK.chassis} />
      <Rod from={[-1.25, 2.4, 0]} to={[-1.5, 4.3, 0]} r={0.52} look={LOOK.chassis} />
      <Rod from={[-0.6, -0.75, 0]} to={[-3.8, -0.95, 0.15]} r={0.2} look={LOOK.chassis} />
      <Rod from={[-0.7, 0, -0.75]} to={[-3.8, 0.15, -0.95]} r={0.07} look={LOOK.chassis} />
      <CylX x={[-3.8, -0.8]} at={[0, 0]} r={0.15} look={LOOK.iron} />
      <CylX x={[-1.55, -0.8]} at={[0, 0]} r={0.34} look={LOOK.rubber} />
    </>
  )
}

/** Every part of the corner, each registered under the id the procedure data refers to. */
export const BrakeCorner = memo(function BrakeCorner() {
  return (
    <>
      <Part id="chassis">
        <Chassis />
      </Part>
      <Part id="hub">
        <Hub />
      </Part>
      <Part id="bracket">
        <Bracket />
      </Part>
      <Part id="retainerUpper">
        <Retainer side={1} />
      </Part>
      <Part id="retainerLower">
        <Retainer side={-1} />
      </Part>
      <Part id="padOuterOld">
        <Pad side={1} friction={G.oldFriction} look={LOOK.wornFriction} />
      </Part>
      <Part id="shimOuterOld">
        <Shim side={1} friction={G.oldFriction} />
      </Part>
      <Part id="padInnerOld">
        <Pad side={-1} friction={G.oldFriction} look={LOOK.wornFriction} />
      </Part>
      <Part id="shimInnerOld">
        <Shim side={-1} friction={G.oldFriction} />
      </Part>
      <Part id="padOuterNew">
        <Pad side={1} friction={G.newFriction} look={LOOK.newFriction} />
      </Part>
      <Part id="shimOuterNew">
        <Shim side={1} friction={G.newFriction} />
      </Part>
      <Part id="padInnerNew">
        <Pad side={-1} friction={G.newFriction} look={LOOK.newFriction} />
        {/* Wear indicator: a steel tab that squeals on the rotor when the pad is nearly gone. */}
        <mesh position={[-0.17, 0.48, 0.83]}>
          <boxGeometry args={[0.075, 0.08, 0.14]} />
          <Mat look={LOOK.clip} />
        </mesh>
      </Part>
      <Part id="shimInnerNew">
        <Shim side={-1} friction={G.newFriction} />
      </Part>
      <Part id="springUpper">
        <ReturnSpring side={1} />
      </Part>
      <Part id="springLower">
        <ReturnSpring side={-1} />
      </Part>
      <Part id="piston">
        <Piston />
      </Part>
      <Part id="caliper">
        <Caliper />
      </Part>
      <Part id="flangeBolt">
        <FlangeBolt y={-G.pinY} />
        <CylX x={[G.boltHeadX, -0.2]} at={[-G.pinY, G.pinZ]} r={0.045} look={LOOK.bolt} segments={12} />
      </Part>
      <Part id="wheel">
        <Wheel />
      </Part>
      {Array.from({ length: LUG_COUNT }, (_, i) => (
        <Part key={i} id={`lug${i}`}>
          <LugNut center={lugCenter(i)} />
        </Part>
      ))}
    </>
  )
})

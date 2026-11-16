import { memo } from 'react'
import type { Vec3 } from '../types'
import { A, CLIPS, rodPivot } from './airBoxGeometry'
import { Part } from './Part'

const WHITE = '#ffffff'
const PLASTIC = '#f1f0ec'
const RUBBER = '#e7e5de'
const DUSTY = '#c9c6bd'

/** Axis-aligned block given by its two opposite corners. */
function Block({ a, b, color = WHITE }: { a: Vec3; b: Vec3; color?: string }) {
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]}>
      <boxGeometry args={[Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/** Cylinder between two x positions, axis along X. */
function CylX({ x, y, z, r, color = WHITE }: { x: [number, number]; y: number; z: number; r: number; color?: string }) {
  return (
    <mesh position={[(x[0] + x[1]) / 2, y, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, Math.abs(x[1] - x[0]), 28]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function CylY({ y, x, z, r, color = WHITE }: { y: [number, number]; x: number; z: number; r: number; color?: string }) {
  return (
    <mesh position={[x, (y[0] + y[1]) / 2, z]}>
      <cylinderGeometry args={[r, r, Math.abs(y[1] - y[0]), 28]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

const X = A.halfX
const Z = A.halfZ
const F = A.flange
const WALL = 0.06

/** Open-topped lower half of the air box, ribbed on the side facing you. */
function Lower() {
  const ribs = [-1.1, -0.66, -0.22, 0.22, 0.66, 1.1]
  return (
    <>
      <Block a={[-X, -A.depth, -Z]} b={[X, -A.depth + WALL, Z]} color={PLASTIC} />
      <Block a={[-X, -A.depth, Z - WALL]} b={[X, -0.06, Z]} color={PLASTIC} />
      <Block a={[-X, -A.depth, -Z]} b={[X, -0.06, -Z + WALL]} color={PLASTIC} />
      <Block a={[-X, -A.depth, -Z]} b={[-X + WALL, -0.06, Z]} color={PLASTIC} />
      <Block a={[X - WALL, -A.depth, -Z]} b={[X, -0.06, Z]} color={PLASTIC} />
      {/* Rim the filter seal sits on */}
      <Block a={[-X - F, -0.06, Z - WALL]} b={[X + F, 0, Z + F]} color={PLASTIC} />
      <Block a={[-X - F, -0.06, -Z - F]} b={[X + F, 0, -Z + WALL]} color={PLASTIC} />
      <Block a={[-X - F, -0.06, -Z + WALL]} b={[-X + WALL, 0, Z - WALL]} color={PLASTIC} />
      <Block a={[X - WALL, -0.06, -Z + WALL]} b={[X + F, 0, Z - WALL]} color={PLASTIC} />
      {ribs.map((x) => (
        <Block key={x} a={[x - 0.025, -0.9, Z]} b={[x + 0.025, -0.06, Z + 0.07]} color={PLASTIC} />
      ))}
      <Block a={[-1.3, -0.52, Z]} b={[1.3, -0.47, Z + 0.07]} color={PLASTIC} />
      {/* Fresh-air inlet running forward to the grille */}
      <Block a={[-0.5, -0.95, Z]} b={[0.35, -0.55, 2.55]} color={PLASTIC} />
    </>
  )
}

/** Upper half: a skirt that meets the lower box, a raised dome, and the outlet toward the engine. */
function Cover() {
  const fins = [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05]
  return (
    <>
      <Block a={[-X - F, 0, -Z - F]} b={[X + F, 0.07, Z + F]} color={PLASTIC} />
      <Block a={[-X, 0.07, -Z]} b={[X, 0.32, Z]} color={PLASTIC} />
      <Block a={[-X + 0.12, 0.32, -Z + 0.12]} b={[X - 0.12, 0.86, Z - 0.3]} color={PLASTIC} />
      {fins.map((x) => (
        <Block key={x} a={[x - 0.025, 0.32, Z - 0.3]} b={[x + 0.025, 0.6, Z - 0.02]} color={PLASTIC} />
      ))}
      <CylX x={[-X - 0.32, -X + 0.14]} y={0.52} z={-0.3} r={0.36} color={PLASTIC} />
      <CylX x={[-X - 0.36, -X - 0.3]} y={0.52} z={-0.3} r={0.4} />
    </>
  )
}

/** Flat panel filter: a rubber frame around two banks of paper pleats. */
function Filter({ paper }: { paper: string }) {
  const top = -0.02
  const bottom = -0.34
  const pleats = Array.from({ length: 14 }, (_, i) => -0.88 + i * 0.135)
  return (
    <>
      <Block a={[-1.33, -0.1, 0.94]} b={[1.33, top, 1.03]} color={RUBBER} />
      <Block a={[-1.33, -0.1, -1.03]} b={[1.33, top, -0.94]} color={RUBBER} />
      <Block a={[-1.33, -0.1, -0.94]} b={[-1.24, top, 0.94]} color={RUBBER} />
      <Block a={[1.24, -0.1, -0.94]} b={[1.33, top, 0.94]} color={RUBBER} />
      <Block a={[-0.03, -0.1, -0.94]} b={[0.03, top, 0.94]} color={RUBBER} />
      <Block a={[-1.24, bottom, -0.94]} b={[1.24, -0.1, 0.94]} color={paper} />
      {pleats.flatMap((z) => [
        <Block key={`l${z}`} a={[-1.22, -0.1, z - 0.035]} b={[-0.05, -0.035, z + 0.035]} color={paper} />,
        <Block key={`r${z}`} a={[0.05, -0.1, z - 0.035]} b={[1.22, -0.035, z + 0.035]} color={paper} />,
      ])}
    </>
  )
}

/** Spring clip, built facing +Z: hinged on the lower box, hooked over the cover's edge. */
function Clip({ at, turn }: { at: Vec3; turn: number }) {
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <Block a={[-0.13, A.hingeY, 0.015]} b={[0.13, 0.12, 0.045]} />
      <Block a={[-0.13, 0.08, -0.11]} b={[0.13, 0.12, 0.045]} />
      <Block a={[-0.09, 0.12, 0.015]} b={[0.09, 0.26, 0.045]} />
      <CylX x={[-0.16, 0.16]} y={A.hingeY} z={0.03} r={0.035} />
    </group>
  )
}

/** The neighbours in the engine bay, so you can find the box. */
function Bay() {
  const rings = [-2.3, -2.16, -2.02, -1.88]
  return (
    <>
      {/* Engine valve cover */}
      <Block a={[-5.4, -1.0, -1.6]} b={[-2.5, 0.25, 1.3]} />
      <Block a={[-5.0, 0.25, -1.2]} b={[-2.9, 0.4, 0.9]} />
      <CylY y={[0.4, 0.52]} x={-4.4} z={0.2} r={0.22} />
      {/* Hose from the air box to the engine */}
      <CylX x={[-2.5, -1.74]} y={0.52} z={-0.3} r={0.33} />
      {rings.map((x) => (
        <CylX key={x} x={[x - 0.04, x + 0.04]} y={0.52} z={-0.3} r={0.39} />
      ))}
      {/* Battery */}
      <Block a={[2.1, -1.2, -0.1]} b={[4.3, 0.3, 1.7]} />
      <CylY y={[0.3, 0.45]} x={2.5} z={1.3} r={0.1} />
      <CylY y={[0.3, 0.45]} x={3.9} z={1.3} r={0.1} />
      {/* Brake fluid reservoir */}
      <CylY y={[-0.3, 0.5]} x={2.2} z={-1.9} r={0.42} />
      <CylY y={[0.5, 0.62]} x={2.2} z={-1.9} r={0.3} />
      {/* Radiator support across the front */}
      <Block a={[-5.6, -0.45, 2.6]} b={[4.6, -0.12, 3.05]} />
    </>
  )
}

/** Engine air box for the 1.8 L Civic, with the parts that come apart during a filter change. */
export const AirBox = memo(function AirBox() {
  return (
    <>
      <Part id="bay">
        <Bay />
      </Part>
      <Part id="propRod">
        <CylX x={[rodPivot[0], rodPivot[0] + 3.8]} y={rodPivot[1]} z={rodPivot[2]} r={0.035} />
        <CylX x={[rodPivot[0] + 3.7, rodPivot[0] + 3.86]} y={rodPivot[1]} z={rodPivot[2]} r={0.06} />
      </Part>
      <Part id="lower">
        <Lower />
      </Part>
      <Part id="filterOld">
        <Filter paper={DUSTY} />
      </Part>
      <Part id="filterNew">
        <Filter paper={WHITE} />
      </Part>
      <Part id="cover">
        <Cover />
      </Part>
      {CLIPS.map((c, i) => (
        <Part key={i} id={`clip${i}`}>
          <Clip at={c.at} turn={c.turn} />
        </Part>
      ))}
    </>
  )
})

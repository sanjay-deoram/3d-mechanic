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
      <Block a={[-1.3, -0.95, Z]} b={[-0.5, -0.5, 3.3]} color={PLASTIC} />
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

/**
 * Flat panel hinged along X at `hinge` and tilted up by `angle` radians.
 * `toward` is 1 if it reaches toward the front of the car from its hinge, -1 if toward the back.
 */
function Panel({
  hinge,
  x,
  length,
  angle,
  toward,
}: {
  hinge: Vec3
  x: [number, number]
  length: number
  angle: number
  toward: 1 | -1
}) {
  return (
    <group position={hinge} rotation={[-angle * toward, 0, 0]}>
      <mesh position={[(x[0] + x[1]) / 2, 0, (toward * length) / 2]}>
        <boxGeometry args={[x[1] - x[0], 0.08, length]} />
        <meshBasicMaterial color={WHITE} />
      </mesh>
    </group>
  )
}

const LEFT = -9.9
const RIGHT = 4.1
const FIREWALL = -2.8
const NOSE = 5.0

function CylZ({ z, x, y, r, color = WHITE }: { z: [number, number]; x: number; y: number; r: number; color?: string }) {
  return (
    <mesh position={[x, y, (z[0] + z[1]) / 2]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[r, r, Math.abs(z[1] - z[0]), 28]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

/**
 * Front of the car around the engine bay, laid out from a photo of a 2012-2015 Civic:
 * fenders, cowl with wipers, raised hood, radiator support, front cover, grille and headlights.
 */
function Body() {
  const mid = (LEFT + RIGHT) / 2
  return (
    <>
      <Block a={[LEFT, -0.5, FIREWALL]} b={[LEFT + 0.5, 0.5, NOSE + 0.5]} />
      <Block a={[RIGHT - 0.5, -0.5, FIREWALL]} b={[RIGHT, 0.5, NOSE + 0.5]} />
      {/* Cowl under the windshield, with the two wipers parked on it */}
      <Block a={[LEFT, -0.8, FIREWALL - 0.9]} b={[RIGHT, 0.9, FIREWALL]} />
      <Block a={[mid - 5.2, 0.9, FIREWALL - 0.5]} b={[mid - 0.2, 0.97, FIREWALL - 0.38]} color={PLASTIC} />
      <Block a={[mid + 0.4, 0.9, FIREWALL - 0.5]} b={[mid + 5.0, 0.97, FIREWALL - 0.38]} color={PLASTIC} />
      {/* Strut tower in the rear left corner */}
      <CylY y={[-0.5, 0.35]} x={LEFT + 1.4} z={FIREWALL + 1.0} r={0.75} />
      {/* Radiator support with the hood latch, where the prop rod rests */}
      <Block a={[LEFT + 0.5, -0.45, NOSE]} b={[RIGHT - 0.5, -0.12, NOSE + 0.5]} />
      <Block a={[mid - 0.25, -0.12, NOSE + 0.1]} b={[mid + 0.25, 0.05, NOSE + 0.4]} color={PLASTIC} />
      {/* Plastic cover over the radiator, with the radiator cap */}
      <Block a={[LEFT + 1.6, -0.6, NOSE + 0.5]} b={[RIGHT - 1.6, -0.3, NOSE + 1.4]} color={PLASTIC} />
      <CylY y={[-0.3, -0.18]} x={mid + 2.0} z={NOSE + 0.85} r={0.2} />
      {/* Bumper, grille and headlights */}
      <Block a={[LEFT, -2.6, NOSE + 1.4]} b={[RIGHT, -0.6, NOSE + 2.1]} />
      <Block a={[mid - 3.4, -1.25, NOSE + 2.1]} b={[mid + 3.4, -0.85, NOSE + 2.16]} color={PLASTIC} />
      <CylZ z={[NOSE + 2.16, NOSE + 2.2]} x={mid} y={-1.05} r={0.3} />
      <Block a={[LEFT, -0.6, NOSE + 0.5]} b={[LEFT + 1.6, 0.25, NOSE + 2.0]} color={PLASTIC} />
      <Block a={[RIGHT - 1.6, -0.6, NOSE + 0.5]} b={[RIGHT, 0.25, NOSE + 2.0]} color={PLASTIC} />
      {/* Open hood and the windshield behind it */}
      <Panel hinge={[mid, 0.9, FIREWALL]} x={[LEFT - mid, RIGHT - mid]} length={8.6} angle={1.05} toward={1} />
      <Panel hinge={[mid, 0.9, FIREWALL - 0.9]} x={[LEFT - mid + 0.6, RIGHT - mid - 0.6]} length={4.5} angle={0.55} toward={-1} />
    </>
  )
}

/** Engine: the ribbed plastic cover with the oil cap on top, and the heat shield in front of it. */
function Engine() {
  const rings = [-2.3, -2.16, -2.02, -1.88]
  const ribs = [-6.1, -5.3, -4.5, -3.7, -2.95]
  return (
    <>
      <Block a={[-7.2, -1.6, -1.5]} b={[-2.5, -0.1, 3.4]} />
      <Block a={[-6.7, -0.1, -1.1]} b={[-2.5, 0.3, 1.2]} color={PLASTIC} />
      {ribs.map((x) => (
        <Block key={x} a={[x - 0.22, 0.3, -0.7]} b={[x + 0.22, 0.4, 0.2]} color={PLASTIC} />
      ))}
      <CylY y={[0.3, 0.5]} x={-4.1} z={0.75} r={0.2} />
      <Block a={[-5.3, -0.1, 1.5]} b={[-3.5, 0.05, 3.1]} />
      {/* Hose from the air box to the engine */}
      <CylX x={[-2.5, -1.74]} y={0.52} z={-0.3} r={0.33} />
      {rings.map((x) => (
        <CylX key={x} x={[x - 0.04, x + 0.04]} y={0.52} z={-0.3} r={0.39} />
      ))}
    </>
  )
}

function Battery() {
  return (
    <>
      <Block a={[-0.2, -1.7, 1.9]} b={[2.0, -0.15, 3.7]} />
      <Block a={[-0.05, -0.15, 2.3]} b={[0.45, 0.0, 3.3]} color={PLASTIC} />
      <CylY y={[-0.15, -0.02]} x={1.65} z={2.3} r={0.11} />
    </>
  )
}

function FuseBox() {
  return (
    <>
      <Block a={[2.15, -1.0, -1.6]} b={[3.55, 0.2, 1.3]} />
      <Block a={[2.2, 0.2, -1.55]} b={[3.5, 0.32, 1.25]} color={PLASTIC} />
    </>
  )
}

function Reservoir() {
  return (
    <>
      <CylY y={[-0.4, 0.45]} x={1.25} z={-2.1} r={0.42} />
      <CylY y={[0.45, 0.6]} x={1.25} z={-2.1} r={0.28} color="#f2c230" />
    </>
  )
}

function Washer() {
  return (
    <>
      <CylY y={[-0.6, 0.1]} x={LEFT + 1.0} z={1.3} r={0.32} />
      <CylY y={[0.1, 0.24]} x={LEFT + 1.0} z={1.3} r={0.36} color="#4a9be0" />
    </>
  )
}

/** Engine air box for the 1.8 L Civic, with the parts that come apart during a filter change. */
export const AirBox = memo(function AirBox() {
  return (
    <>
      <Part id="body">
        <Body />
      </Part>
      <Part id="engine">
        <Engine />
      </Part>
      <Part id="battery">
        <Battery />
      </Part>
      <Part id="fuseBox">
        <FuseBox />
      </Part>
      <Part id="reservoir">
        <Reservoir />
      </Part>
      <Part id="washer">
        <Washer />
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

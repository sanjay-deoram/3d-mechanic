import type { Vec3 } from '../types'

/**
 * Layout of the engine air box as you face the car with the hood open.
 * Units are decimetres. +X is to your right, +Y up, +Z toward you.
 * The joint between the lower box and the cover is at y = 0.
 */
export const A = {
  halfX: 1.4,
  halfZ: 1.1,
  depth: 1.0,
  flange: 0.1,
  hingeY: -0.3,
  clipAngle: 55,
  coverAngle: 38,
  filterTilt: 14,
} as const

/** Where each clip sits and which way it faces. `turn` is the rotation about +Y from facing +Z. */
export const CLIPS: { at: Vec3; turn: number; axis: Vec3; open: number }[] = [
  { at: [-0.7, 0, A.halfZ + A.flange], turn: 0, axis: [1, 0, 0], open: A.clipAngle },
  { at: [0.7, 0, A.halfZ + A.flange], turn: 0, axis: [1, 0, 0], open: A.clipAngle },
  { at: [A.halfX + A.flange, 0, 0.3], turn: Math.PI / 2, axis: [0, 0, 1], open: -A.clipAngle },
  { at: [0.8, 0, -A.halfZ - A.flange], turn: Math.PI, axis: [1, 0, 0], open: -A.clipAngle },
]

export function clipHinge(i: number): Vec3 {
  const [x, , z] = CLIPS[i].at
  return [x, A.hingeY, z]
}

/** The cover opens like a clamshell, hinged on the side where its hose leaves for the engine. */
export const coverHinge: Vec3 = [-A.halfX, 0, 0]
/** The filter tips up about its engine-side edge before it slides out. */
export const filterHinge: Vec3 = [-A.halfX + 0.1, -0.1, 0]
/** Hood prop rod pivots at this end, on the radiator support. */
export const rodPivot: Vec3 = [-8.8, -0.05, 5.25]

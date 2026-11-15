import type { Vec3 } from '../types'

/**
 * Layout of the front-left brake corner. Units are decimetres (1 = 100 mm).
 * +X points outboard (away from the car), +Y up, +Z toward the front of the car.
 * The caliper sits on the front edge of the rotor.
 */
export const G = {
  rotorRadius: 1.5,
  rotorHalf: 0.125,
  hatFace: 0.45,
  wheelFace: 0.6,
  studRadius: 0.57,
  padZ: 1.22,
  newFriction: 0.1,
  oldFriction: 0.03,
  backing: 0.06,
  shim: 0.015,
  pinY: 0.85,
  pinZ: 1.45,
  boltHeadX: -0.62,
  pistonY: 0,
  pistonZ: 1.2,
  pivotAngle: -115,
} as const

/** How far the caliper and piston sit from their new-pad position while the worn pads are in. */
export const WEAR = G.newFriction - G.oldFriction

export const LUG_COUNT = 5
/** Tightening order that pulls the wheel down evenly. */
export const STAR = [0, 2, 4, 1, 3]

export function lugCenter(i: number): Vec3 {
  const a = Math.PI / 2 + (i * Math.PI * 2) / LUG_COUNT
  return [G.wheelFace, G.studRadius * Math.cos(a), G.studRadius * Math.sin(a)]
}

export const lowerBoltCenter: Vec3 = [G.boltHeadX, -G.pinY, G.pinZ]
export const upperPin: Vec3 = [0, G.pinY, G.pinZ]

/** Centre of the piston face once the caliper has been swung up around the upper pin. */
export function pistonFaceWhenRaised(): Vec3 {
  const a = (G.pivotAngle * Math.PI) / 180
  const y = G.pistonY - G.pinY
  const z = G.pistonZ - G.pinZ
  const padStack = G.rotorHalf + G.oldFriction + G.backing + G.shim
  return [-padStack, G.pinY + y * Math.cos(a) - z * Math.sin(a), G.pinZ + y * Math.sin(a) + z * Math.cos(a)]
}

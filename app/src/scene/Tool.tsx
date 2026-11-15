import { forwardRef } from 'react'
import type { Group } from 'three'
import type { ToolKind } from '../types'

const steel = { color: '#e3e6ea', metalness: 0.95, roughness: 0.2 }
const dark = { color: '#1c1d21', metalness: 0.2, roughness: 0.8 }
const accent = { color: '#ff7a1a', metalness: 0.2, roughness: 0.6 }

const HANDLE: Record<Exclude<ToolKind, 'compressor'>, number> = { ratchet: 2, breaker: 2.9, torque: 3.1 }

/** Name of the child that turns while the rest of the tool stays still. */
export const SPINNER = 'spinner'

function CylX({ x, r, mat, segments = 24 }: { x: [number, number]; r: number; mat: typeof steel; segments?: number }) {
  return (
    <mesh position={[(x[0] + x[1]) / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[r, r, x[1] - x[0], segments]} />
      <meshStandardMaterial {...mat} />
    </mesh>
  )
}

function Wrench({ kind }: { kind: Exclude<ToolKind, 'compressor'> }) {
  const length = HANDLE[kind]
  const grip = kind === 'torque' ? accent : dark
  return (
    <>
      <CylX x={[0.02, 0.42]} r={0.165} mat={steel} />
      <CylX x={[0.42, 0.62]} r={0.07} mat={steel} />
      <CylX x={[0.58, 0.78]} r={0.19} mat={steel} />
      <mesh position={[0.68, length / 2, 0]}>
        <cylinderGeometry args={[0.055, 0.075, length, 16]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0.68, length - 0.45, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.9, 20]} />
        <meshStandardMaterial {...grip} />
      </mesh>
      {kind === 'torque' && (
        <mesh position={[0.68, 0.6, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.32, 20]} />
          <meshStandardMaterial {...dark} />
        </mesh>
      )}
    </>
  )
}

/** Two spreader plates on a screw: one against the piston, one against the caliper fingers. */
function Compressor() {
  return (
    <>
      <mesh position={[0.02, 0, 0]}>
        <boxGeometry args={[0.04, 0.5, 0.62]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <mesh position={[0.42, 0, 0]}>
        <boxGeometry args={[0.04, 0.5, 0.62]} />
        <meshStandardMaterial {...steel} />
      </mesh>
      <CylX x={[0.44, 0.62]} r={0.1} mat={steel} />
      <group name={SPINNER}>
        <CylX x={[0.04, 1.15]} r={0.045} mat={dark} />
        <mesh position={[1.1, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.1, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        {[0.55, -0.55].map((y) => (
          <mesh key={y} position={[1.1, y, 0]}>
            <sphereGeometry args={[0.09, 20, 14]} />
            <meshStandardMaterial {...accent} />
          </mesh>
        ))}
      </group>
    </>
  )
}

/** The hand tool shown on a fastener while it is being turned. Built pointing along +X. */
export const Tool = forwardRef<Group, { kind: ToolKind }>(function Tool({ kind }, ref) {
  return (
    <group ref={ref} visible={false}>
      {kind === 'compressor' ? <Compressor /> : <Wrench kind={kind} />}
    </group>
  )
})

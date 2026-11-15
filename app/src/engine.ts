import { Matrix4, Quaternion, Vector3 } from 'three'
import type { Action, Procedure, ToolKind } from './types'

export interface PartState {
  matrix: Matrix4
  opacity: number
}

export interface ToolPose {
  kind: ToolKind
  scale: number
  position: Vector3
  axis: Vector3
  angle: number
}

export interface SceneState {
  parts: Map<string, PartState>
  tool: ToolPose | null
}

const tmp = new Matrix4()
const rot = new Matrix4()
const axisV = new Vector3()
const quat = new Quaternion()

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const ease = (x: number) => x * x * (3 - 2 * x)

function partState(state: SceneState, id: string): PartState {
  let s = state.parts.get(id)
  if (!s) {
    s = { matrix: new Matrix4(), opacity: 1 }
    state.parts.set(id, s)
  }
  return s
}

/** Rotation by `angle` radians around the line through `point` along `axis`. */
function rotateAbout(point: readonly number[], axis: readonly number[], angle: number, out: Matrix4) {
  axisV.set(axis[0], axis[1], axis[2]).normalize()
  quat.setFromAxisAngle(axisV, angle)
  rot.makeRotationFromQuaternion(quat)
  out.makeTranslation(point[0], point[1], point[2]).multiply(rot)
  tmp.makeTranslation(-point[0], -point[1], -point[2])
  return out.multiply(tmp)
}

const m = new Matrix4()

function apply(state: SceneState, action: Action, raw: number, live: boolean) {
  const [t0, t1] = action.at ?? [0, 1]
  const linear = clamp01((raw - t0) / Math.max(1e-6, t1 - t0))
  const active = live && linear > 0 && linear < 1

  switch (action.type) {
    case 'move': {
      const p = ease(linear)
      m.makeTranslation(action.by[0] * p, action.by[1] * p, action.by[2] * p)
      for (const id of action.parts) partState(state, id).matrix.premultiply(m)
      if (active && action.tool && !state.tool) {
        state.tool = {
          kind: action.tool.kind,
          scale: action.tool.scale ?? 1,
          position: new Vector3(
            action.tool.at[0] + action.by[0] * p,
            action.tool.at[1] + action.by[1] * p,
            action.tool.at[2] + action.by[2] * p,
          ),
          axis: new Vector3(...action.tool.axis).normalize(),
          angle: p * Math.PI * 6,
        }
      }
      break
    }
    case 'spin': {
      const p = linear
      const angle = action.turns * Math.PI * 2 * p
      const travel = (action.to - action.from) * p
      rotateAbout(action.center, action.axis, angle, m)
      tmp.makeTranslation(action.axis[0] * travel, action.axis[1] * travel, action.axis[2] * travel)
      m.premultiply(tmp)
      for (const id of action.parts) partState(state, id).matrix.premultiply(m)
      if (active && action.tool && !state.tool) {
        const d = action.from + travel
        state.tool = {
          kind: action.tool.kind,
          scale: action.tool.scale ?? 1,
          position: new Vector3(
            action.center[0] + action.axis[0] * d,
            action.center[1] + action.axis[1] * d,
            action.center[2] + action.axis[2] * d,
          ),
          axis: new Vector3(...action.axis).normalize(),
          angle,
        }
      }
      break
    }
    case 'pivot': {
      rotateAbout(action.pivot, action.axis, (action.angle * Math.PI * ease(linear)) / 180, m)
      for (const id of action.parts) partState(state, id).matrix.premultiply(m)
      break
    }
    case 'fade': {
      for (const id of action.parts) {
        const s = partState(state, id)
        s.opacity += (action.to - s.opacity) * linear
      }
      break
    }
  }
}

/**
 * Where every part is at time `t` (0..1) of step `stepIndex`: all earlier steps
 * fully applied, the current one partially.
 */
export function computeState(proc: Procedure, stepIndex: number, t: number, state: SceneState) {
  for (const s of state.parts.values()) {
    s.matrix.identity()
    s.opacity = 1
  }
  state.tool = null
  for (const a of proc.setup) apply(state, a, 1, false)
  for (let i = 0; i < stepIndex; i++) {
    for (const a of proc.steps[i].actions) apply(state, a, 1, false)
  }
  for (const a of proc.steps[stepIndex].actions) apply(state, a, t, true)
  return state
}

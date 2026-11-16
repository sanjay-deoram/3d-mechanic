export type Vec3 = [number, number, number]

export type ToolKind = 'ratchet' | 'breaker' | 'torque' | 'compressor'

export interface ToolSpec {
  kind: ToolKind
  scale?: number
}

interface ActionBase {
  /** Part ids this action moves. */
  parts: string[]
  /** Window inside the step's 0..1 timeline. Defaults to the whole step. */
  at?: [number, number]
}

export type Action =
  | (ActionBase & {
      type: 'move'
      by: Vec3
      tool?: ToolSpec & { at: Vec3; axis: Vec3 }
    })
  | (ActionBase & {
      /** Screw a fastener in or out. `from`/`to` are distances from seated, along `axis`. */
      type: 'spin'
      center: Vec3
      axis: Vec3
      turns: number
      from: number
      to: number
      tool?: ToolSpec
    })
  | (ActionBase & { type: 'pivot'; pivot: Vec3; axis: Vec3; angle: number })
  | (ActionBase & { type: 'fade'; to: number })

export interface Spec {
  label: string
  value: string
  status: 'verified' | 'unverified'
  source?: string
}

export interface Note {
  kind: 'warning' | 'tip'
  text: string
}

export interface Step {
  id: string
  title: string
  body: string
  notes?: Note[]
  tools?: string[]
  specs?: Spec[]
  highlight?: string[]
  camera: { pos: Vec3; target: Vec3 }
  /** Close-up shown in the round inset: what to look at, how wide (scene units), and a caption. */
  detail?: { target: Vec3; span: number; label: string }
  /** Seconds the animation takes. */
  duration?: number
  actions: Action[]
}

export interface Procedure {
  vehicle: string
  title: string
  time: string
  difficulty: string
  tools: { name: string; detail?: string }[]
  supplies: { name: string; detail?: string }[]
  specs: Spec[]
  /** Display name for each part id, used for the on-model labels. */
  partNames: Record<string, string>
  /** Applied instantly before step one to put parts in their starting state. */
  setup: Action[]
  steps: Step[]
}

import { createContext } from 'react'
import type { Group } from 'three'

/** Part id → the scene group the animation engine moves. */
export type PartRegistry = Map<string, Group>
export const RegistryContext = createContext<PartRegistry>(new Map())

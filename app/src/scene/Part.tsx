import { useContext, type ReactNode } from 'react'
import { RegistryContext } from './registry'

/** A named, independently animated piece. Its meshes are placed in world coordinates. */
export function Part({ id, children }: { id: string; children: ReactNode }) {
  const registry = useContext(RegistryContext)
  return (
    <group
      matrixAutoUpdate={false}
      ref={(g) => {
        if (g) registry.set(id, g)
        else registry.delete(id)
      }}
    >
      {children}
    </group>
  )
}

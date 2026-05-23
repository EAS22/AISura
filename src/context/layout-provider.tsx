import { createContext, useContext, useState } from 'react'

export type Collapsible = 'offcanvas' | 'icon' | 'none'
type Variant = 'inset' | 'sidebar' | 'floating'

type LayoutContextType = {
  resetLayout: () => void
  defaultCollapsible: Collapsible
  collapsible: Collapsible
  setCollapsible: (collapsible: Collapsible) => void
  defaultVariant: Variant
  variant: Variant
  setVariant: (variant: Variant) => void
}

const LayoutContext = createContext<LayoutContextType | null>(null)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsible, setCollapsible] = useState<Collapsible>('icon')
  const [variant, setVariant] = useState<Variant>('sidebar')

  const resetLayout = () => {
    setCollapsible('icon')
    setVariant('sidebar')
  }

  return (
    <LayoutContext value={{
      resetLayout,
      defaultCollapsible: 'icon',
      collapsible,
      setCollapsible,
      defaultVariant: 'sidebar',
      variant,
      setVariant,
    }}>
      {children}
    </LayoutContext>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) throw new Error('useLayout must be used within a LayoutProvider')
  return context
}

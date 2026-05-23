/**
 * Shim module to replace @tanstack/react-router imports.
 * Provides minimal Link component and useLocation hook for SPA navigation.
 */
import { createContext, useContext, forwardRef, type ReactNode } from 'react'

// Navigation context
interface NavigationContextValue {
  currentPath: string
  navigate: (to: string) => void
}

export const NavigationContext = createContext<NavigationContextValue>({
  currentPath: '/',
  navigate: () => {},
})

export function useNavigationContext() {
  return useContext(NavigationContext)
}

// useLocation shim
export function useLocation<T = string>(opts?: { select?: (location: { href: string; pathname: string }) => T }): T {
  const { currentPath } = useNavigationContext()
  const location = { href: currentPath, pathname: currentPath }
  if (opts?.select) return opts.select(location)
  return currentPath as unknown as T
}

// Link component shim
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  children?: ReactNode
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, children, onClick, ...props }, ref) => {
    const { navigate } = useNavigationContext()

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      navigate(to)
      onClick?.(e)
    }

    return (
      <a ref={ref} href={to} onClick={handleClick} {...props}>
        {children}
      </a>
    )
  }
)
Link.displayName = 'Link'

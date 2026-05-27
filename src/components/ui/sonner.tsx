import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from '@/context/theme-provider'

export function Toaster() {
  const { theme } = useTheme()
  // Resolve 'system' to actual scheme so Sonner picks the right palette.
  const resolvedTheme: 'light' | 'dark' = (() => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })()

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}

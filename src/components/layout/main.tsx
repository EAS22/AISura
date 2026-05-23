import { cn } from '@/lib/utils'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  fluid?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Main({ fixed, className, fluid, children, ...props }: MainProps) {
  return (
    <main
      data-layout='fixed'
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4',

        // If layout is not fluid, set the max-width
        !fluid &&
          '@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl',
        className
      )}
      {...props}
    >
      {children}
    </main>
  )
}

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        'z-50 shrink-0 mx-4 mt-4 rounded-2xl border border-white/70 bg-white/82 shadow-sm shadow-blue-100/60 backdrop-blur-xl supports-[backdrop-filter]:bg-white/72 dark:border-zinc-800/90 dark:bg-zinc-950/72 dark:shadow-none',
        className
      )}
      {...props}
    >
      <div className='relative flex h-14 items-center gap-3 px-4 sm:gap-4'>
        <SidebarTrigger variant='outline' className='h-8 w-8 rounded-xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 max-md:scale-125 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300' />
        <Separator orientation='vertical' className='h-6' />
        {children}
      </div>
    </header>
  )
}

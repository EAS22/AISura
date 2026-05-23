import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import { id } from 'react-day-picker/locale'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={id}
      className={cn('bg-background p-3', className)}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn('absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1', defaultClassNames.nav),
        button_previous: cn(buttonVariants({ variant: 'ghost' }), 'size-8 p-0 select-none aria-disabled:opacity-50', defaultClassNames.button_previous),
        button_next: cn(buttonVariants({ variant: 'ghost' }), 'size-8 p-0 select-none aria-disabled:opacity-50', defaultClassNames.button_next),
        month_caption: cn('flex h-8 w-full items-center justify-center px-8', defaultClassNames.month_caption),
        caption_label: cn('text-sm font-medium select-none', defaultClassNames.caption_label),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn('flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none', defaultClassNames.weekday),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        day: cn('group/day relative aspect-square h-full w-full p-0 text-center select-none', defaultClassNames.day),
        today: cn('rounded-md bg-accent text-accent-foreground', defaultClassNames.today),
        outside: cn('text-muted-foreground opacity-50', defaultClassNames.outside),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          if (orientation === 'left') return <ChevronLeftIcon className="size-4" {...props} />
          return <ChevronRightIcon className="size-4" {...props} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }

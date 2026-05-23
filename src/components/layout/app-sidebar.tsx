import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import type { SidebarData } from './types'

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarData: SidebarData
}

export function AppSidebar({ sidebarData, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible='icon' variant='sidebar' {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-xl font-bold" style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-primary">AI</span>
            <span className="text-foreground">Sura</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-[10px] text-muted-foreground">
          <span style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-primary">AI</span>Sura
          </span>
          {' '}v1.0.0 • EAS Creative Studio
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

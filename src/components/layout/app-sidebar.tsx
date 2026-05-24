import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
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
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarFooterContent />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function SidebarLogo() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <span className="text-xl font-bold" style={{ fontFamily: "'Unica One', cursive" }}>
        {isCollapsed ? (
          <>
            <span className="text-blue-600">AI</span>
            <span className="text-black dark:text-white">S</span>
          </>
        ) : (
          <>
            <span className="text-blue-600">AI</span>
            <span className="text-black dark:text-white">Sura</span>
          </>
        )}
      </span>
      {!isCollapsed && (
        <span className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded">v1.0.0</span>
      )}
    </div>
  )
}

function SidebarFooterContent() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  if (isCollapsed) return null

  return (
    <div className="px-2 py-1 text-[10px] text-muted-foreground">
      EAS Creative Studio
    </div>
  )
}

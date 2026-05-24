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
import { useUpdate } from '@/contexts/UpdateContext'
import { getUpdateBadgeLabel } from '@/services/updateService'

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
  const { status, availableVersion, currentVersion } = useUpdate()
  const isCollapsed = state === 'collapsed'
  const hasUpdate = status === 'available'

  return (
    <div className="relative flex items-center gap-2 px-2 py-1">
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
      {isCollapsed && hasUpdate && <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-sidebar" />}
      {!isCollapsed && (
        <span className={`rounded px-1 py-0.5 text-[9px] ${hasUpdate ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'}`}>
          {getUpdateBadgeLabel(status, availableVersion, currentVersion)}
        </span>
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

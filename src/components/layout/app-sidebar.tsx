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
    <Sidebar collapsible='icon' variant='floating' {...props}>
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
    <div className="relative flex min-h-12 items-center gap-2 px-2 py-2">
      <span className="text-2xl font-bold leading-none" style={{ fontFamily: "'Unica One', cursive" }}>
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
        <span className={`rounded-full px-2 py-0.5 text-[9px] ${hasUpdate ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'}`}>
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
    <p className="px-2 py-1 text-center text-[10px] font-medium tracking-wide text-blue-700/80 dark:text-blue-300/70">
      EAS Creative Studio
    </p>
  )
}

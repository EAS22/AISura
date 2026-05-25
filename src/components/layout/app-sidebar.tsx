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
      <span className="rounded-2xl bg-blue-600 px-2 py-1 text-xl font-bold text-white shadow-sm shadow-blue-200 dark:shadow-none" style={{ fontFamily: "'Unica One', cursive" }}>
        {isCollapsed ? (
          <>
            <span>AI</span><span>S</span>
          </>
        ) : (
          <>
            <span>AI</span><span>Sura</span>
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
    <div className="mx-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-3 py-2 text-[10px] text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-300">
      <p className="font-semibold">EAS Creative Studio</p>
      <p className="mt-0.5 text-blue-600/70 dark:text-blue-300/70">AISura workspace</p>
    </div>
  )
}

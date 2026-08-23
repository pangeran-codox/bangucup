import { NavLink, useLocation, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Router,
  Activity,
  Settings,
  ChevronDown,
  Wifi,
  TicketCheck,
  BoxIcon,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pelanggan', href: '/customers', icon: Users },
  { label: 'Paket', href: '/packages', icon: Package },
  {
    label: 'Billing',
    href: '/billing',
    icon: FileText,
    children: [
      { label: 'Invoice', href: '/billing/invoices', icon: FileText },
      { label: 'Pembayaran', href: '/billing/payments', icon: FileText },
    ],
  },
  { label: 'Router', href: '/routers', icon: Router },
  { label: 'Monitoring', href: '/monitoring', icon: Activity },
  { label: 'Tiket', href: '/tickets', icon: TicketCheck },
  { label: 'Aset', href: '/assets', icon: BoxIcon },
  { label: 'Perangkat', href: '/devices', icon: Wifi },
  { label: 'Pengaturan', href: '/settings', icon: Settings },
]

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.href)
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-default',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
          style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          <ChevronDown className="h-3 w-3" />
        </div>
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <NavItemComponent key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )
      }
      style={{ paddingLeft: depth > 0 ? `${12 + depth * 16}px` : undefined }}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
          <Wifi className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground">Bangucup</p>
          <p className="text-xs text-sidebar-foreground/50">ISP Management</p>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User */}
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-500 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name ?? 'Administrator'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user?.email ?? ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

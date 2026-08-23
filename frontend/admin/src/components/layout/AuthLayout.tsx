import { Outlet } from 'react-router'
import { Wifi } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
            <Wifi className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Bangucup</p>
            <p className="text-xs text-white/50">ISP Management System</p>
          </div>
        </div>

        <div>
          <blockquote className="space-y-2">
            <p className="text-lg text-white/80">
              "Platform manajemen ISP yang efisien untuk mengelola pelanggan,
              tagihan, dan jaringan dalam satu sistem terpadu."
            </p>
          </blockquote>
        </div>

        <div className="text-white/30 text-sm">
          © {new Date().getFullYear()} Bangucup. All rights reserved.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
              <Wifi className="h-4 w-4 text-white" />
            </div>
            <p className="font-bold">Bangucup</p>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  )
}

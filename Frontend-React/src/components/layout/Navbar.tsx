import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left side - Breadcrumb could go here */}
      <div className="flex-1" />

      {/* Right side - User menu */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-error rounded-full" />
        </button>

        {/* User info */}
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-secondary capitalize">{user?.role === 'admin' ? 'Administrador' : 'Estudiante'}</p>
            </div>
          </div>

          {/* Logout */}
          <Button variant="ghost" size="sm" onClick={logout} className="ml-2">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

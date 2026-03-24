import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Award,
  Settings,
  FileText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const studentLinks = [
  { to: '/panel', label: 'Panel principal', icon: LayoutDashboard },
  { to: '/events', label: 'Eventos', icon: Calendar },
  { to: '/my-enrollments', label: 'Mis inscripciones', icon: Ticket },
  { to: '/certificates', label: 'Certificados', icon: Award },
];

const adminLinks = [
  { to: '/dashboard', label: 'Panel de administración', icon: LayoutDashboard },
  { to: '/admin/events', label: 'Gestionar eventos', icon: Calendar },
];

export default function Sidebar({ setSidebarOpen }: SidebarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-primary-800">
        <div className="flex items-center">
          <FileText className="h-8 w-8 mr-3" />
          <div>
            <h1 className="font-bold text-lg">SGEH</h1>
            <p className="text-xs text-primary-300">Eventos</p>
          </div>
        </div>
        {/* Botón cerrar en mobile */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-primary-800 transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-4 py-3 rounded-xl transition-all duration-200',
                  'hover:bg-primary-800 hover:text-white',
                  isActive
                    ? 'bg-primary-800 text-white shadow-lg'
                    : 'text-primary-200'
                )
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-5 w-5 mr-3" />
              <span className="font-medium">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-primary-800">
        <button className="flex items-center w-full px-4 py-3 text-primary-200 hover:bg-primary-800 hover:text-white rounded-xl transition-all duration-200">
          <Settings className="h-5 w-5 mr-3" />
          <span className="font-medium">Configuración</span>
        </button>
      </div>
    </>
  );
}

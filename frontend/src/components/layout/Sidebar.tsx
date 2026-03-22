import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Award,
  Settings,
  Users,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isAdmin?: boolean;
}

const studentLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/events', label: 'Eventos', icon: Calendar },
  { to: '/my-enrollments', label: 'Mis Inscripciones', icon: Ticket },
  { to: '/certificates', label: 'Certificados', icon: Award },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/events', label: 'Eventos', icon: Calendar },
  { to: '/admin/attendances', label: 'Asistencias', icon: CheckSquare },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
];

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-primary text-white flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-primary-800">
        <FileText className="h-8 w-8 mr-3" />
        <div>
          <h1 className="font-bold text-lg">SGEH</h1>
          <p className="text-xs text-primary-300">Eventos</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
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
    </aside>
  );
}

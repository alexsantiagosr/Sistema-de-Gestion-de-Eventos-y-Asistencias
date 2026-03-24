import { useState, ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop - fijo a la izquierda */}
      <aside className="hidden lg:flex lg:flex-shrink-0 w-64 flex-col bg-primary">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </aside>

      {/* Sidebar mobile - overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          </aside>
        </>
      )}

      {/* Área derecha: Navbar + Contenido */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Navbar - arriba del contenido */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Contenido principal - scrolleable */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

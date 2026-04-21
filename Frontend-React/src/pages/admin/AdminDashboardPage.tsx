import { Link } from 'react-router-dom';
import { Calendar, Plus, Ticket, CheckCircle, TrendingUp } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import Spinner from '@/components/ui/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function AdminDashboardPage() {
  const { data: eventsData, isLoading: eventsLoading } = useEvents();

  // Calcular métricas
  const totalEvents = eventsData?.count || 0;
  const activeEvents = eventsData?.events.filter(e => e.status === 'active').length || 0;
  const totalCapacity = eventsData?.events.reduce((acc, e) => acc + e.capacity, 0) || 0;
  const totalEnrollments = totalCapacity - (eventsData?.events.reduce((acc, e) => acc + e.available_slots, 0) || 0);

  const stats = [
    {
      title: 'Total Eventos',
      value: totalEvents,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Eventos Activos',
      value: activeEvents,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Inscripciones Totales',
      value: totalEnrollments,
      icon: Ticket,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Cupos Totales',
      value: totalCapacity,
      icon: CheckCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-secondary mt-1 text-sm sm:text-base">Gestiona eventos y visualiza métricas</p>
        </div>
        <Link to="/admin/events/new">
          <Button>
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Evento
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent padding="none">
                <div className="flex items-center justify-between p-4 lg:p-6">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-secondary">{stat.title}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Eventos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsData && eventsData.events.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {eventsData.events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{event.title}</p>
                      <p className="text-xs sm:text-sm text-secondary">
                        {new Date(event.date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${event.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : event.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {event.status === 'active' ? 'Activo' : event.status === 'completed' ? 'Completado' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-secondary py-8">No hay eventos registrados</p>
            )}
            <div className="mt-4">
              <Link to="/admin/events">
                <Button variant="secondary" className="w-full">
                  Ver todos los eventos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Accesos Rápidos */}
        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Link to="/admin/events/new">
                <div className="p-3 sm:p-4 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors cursor-pointer">
                  <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-2" />
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Crear Evento</p>
                  <p className="text-xs sm:text-sm text-secondary mt-1">Nuevo evento</p>
                </div>
              </Link>
              <Link to="/admin/events">
                <div className="p-3 sm:p-4 bg-green-100 rounded-xl hover:bg-green-200 transition-colors cursor-pointer">
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2" />
                  <p className="font-medium text-gray-900 text-sm sm:text-base">Gestionar</p>
                  <p className="text-xs sm:text-sm text-secondary mt-1">Todos los eventos</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Calendar, Ticket, Award, ArrowRight } from 'lucide-react';
import { useAvailableEvents } from '@/hooks/useEvents';
import { useMyEnrollments } from '@/hooks/useEnrollments';
import { useMyCertificates } from '@/hooks/useCertificates';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PanelPage() {
  const { user } = useAuth();
  const { data: eventsData } = useAvailableEvents();
  const { data: enrollmentsData } = useMyEnrollments();
  const { data: certificatesData } = useMyCertificates();

  const upcomingEvents = enrollmentsData?.enrollments
    .filter((e) => e.status === 'active' && e.events)
    .slice(0, 3) || [];

  if (!eventsData || !enrollmentsData || !certificatesData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Eventos Disponibles',
      value: eventsData.count,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/events',
    },
    {
      title: 'Mis Inscripciones',
      value: enrollmentsData.count,
      icon: Ticket,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/my-enrollments',
    },
    {
      title: 'Certificados',
      value: certificatesData.certificates.filter((c) => c.canDownload).length,
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/certificates',
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          ¡Hola, {user?.name}! 👋
        </h1>
        <p className="text-secondary mt-1 text-sm sm:text-base">
          Bienvenido a tu panel de control
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-secondary">
                        {stat.title}
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Upcoming Events */}
      <Card className="mb-4 lg:mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Próximos Eventos</CardTitle>
            <Link to="/events">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-secondary mb-4 text-sm sm:text-base">
                No tienes eventos próximos inscritos
              </p>
              <Link to="/events">
                <Button>Explorar eventos</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {upcomingEvents.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-xl gap-3 sm:gap-0"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                      {enrollment.events?.title}
                    </h4>
                    <div className="flex items-center text-xs sm:text-sm text-secondary mt-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(
                        new Date(enrollment.events?.date || ''),
                        "dd 'de' MMMM, yyyy",
                        { locale: es }
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Badge variant="success" className="flex-shrink-0">Inscrito</Badge>
                    <Link to={`/events/${enrollment.event_id}`}>
                      <Button variant="secondary" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Link to="/events">
              <div className="p-3 sm:p-4 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors cursor-pointer">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-2" />
                <p className="font-medium text-gray-900 text-sm sm:text-base">Explorar Eventos</p>
                <p className="text-xs sm:text-sm text-secondary mt-1">
                  Inscríbete en nuevos eventos
                </p>
              </div>
            </Link>
            <Link to="/my-enrollments">
              <div className="p-3 sm:p-4 bg-green-100 rounded-xl hover:bg-green-200 transition-colors cursor-pointer">
                <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2" />
                <p className="font-medium text-gray-900 text-sm sm:text-base">Mis Inscripciones</p>
                <p className="text-xs sm:text-sm text-secondary mt-1">
                  Gestiona tus eventos
                </p>
              </div>
            </Link>
            <Link to="/certificates">
              <div className="p-3 sm:p-4 bg-purple-100 rounded-xl hover:bg-purple-200 transition-colors cursor-pointer">
                <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2" />
                <p className="font-medium text-gray-900 text-sm sm:text-base">Certificados</p>
                <p className="text-xs sm:text-sm text-secondary mt-1">
                  Descarga tus certificados
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

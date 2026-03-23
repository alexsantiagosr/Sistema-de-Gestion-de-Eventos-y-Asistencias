import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useEvent, useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// Schema de validación con Zod
const eventSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  date: z.string().refine(
    (val) => new Date(val) > new Date(),
    'La fecha debe ser futura'
  ),
  modality: z.enum(['presencial', 'virtual', 'híbrido']),
  capacity: z.coerce.number().min(1, 'La capacidad debe ser mayor a 0'),
  duration: z.coerce.number().min(1, 'La duración debe ser mayor a 0'),
  min_attendance_percentage: z.coerce.number().min(1).max(100, 'Debe estar entre 1 y 100'),
  location: z.string().optional(),
}).refine(
  (data) => {
    if (data.modality === 'presencial' && !data.location) {
      return false;
    }
    return true;
  },
  {
    message: 'La ubicación es requerida para eventos presenciales',
    path: ['location'],
  }
);

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEditEventPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: eventData, isLoading: isLoadingEvent } = useEvent(id!);
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      description: '',
      location: '',
    },
  });

  // Cargar datos del evento si es edición
  useEffect(() => {
    if (eventData?.event && isEdit) {
      const event = eventData.event;
      reset({
        title: event.title,
        description: event.description || '',
        date: event.date.slice(0, 16), // Formato para datetime-local
        modality: event.modality,
        capacity: event.capacity,
        duration: event.duration,
        min_attendance_percentage: event.min_attendance_percentage,
        location: event.location || '',
      });
    }
  }, [eventData, isEdit, reset]);

  const onSubmit = async (data: EventFormData) => {
    try {
      const payload = {
        ...data,
        description: data.description || '',
        location: data.location || '',
      };

      if (isEdit) {
        await updateMutation.mutateAsync({
          id,
          data: payload,
        });
        toast.success('Evento actualizado correctamente');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Evento creado correctamente');
      }
      navigate('/admin/events');
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'Error al guardar el evento');
      } else {
        toast.error('Error al guardar el evento');
      }
    }
  };

  if (isEdit && isLoadingEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/events')}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Editar Evento' : 'Crear Nuevo Evento'}
          </h1>
          <p className="text-secondary mt-1">
            {isEdit ? 'Modifica la información del evento' : 'Completa el formulario para crear un evento'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <Input
                label="Título del evento"
                placeholder="Ej: Taller de Node.js Avanzado"
                error={errors.title?.message}
                {...register('title')}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  rows={4}
                  className="input-base resize-none"
                  placeholder="Describe el evento..."
                  {...register('description')}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-error">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Fecha y hora"
                  type="datetime-local"
                  error={errors.date?.message}
                  {...register('date')}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Modalidad
                  </label>
                  <select
                    className="input-base"
                    {...register('modality')}
                  >
                    <option value="">Seleccionar modalidad</option>
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                    <option value="híbrido">Híbrido</option>
                  </select>
                  {errors.modality && (
                    <p className="mt-1 text-sm text-error">{errors.modality.message as string}</p>
                  )}
                </div>
              </div>

              <Input
                label="Ubicación"
                placeholder="Ej: Auditorio Principal, Calle 123 #45-67"
                error={errors.location?.message}
                {...register('location')}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuración del Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input
                label="Capacidad máxima"
                type="number"
                placeholder="Ej: 100"
                error={errors.capacity?.message}
                {...register('capacity')}
              />

              <Input
                label="Duración (minutos)"
                type="number"
                placeholder="Ej: 180"
                error={errors.duration?.message}
                {...register('duration')}
              />

              <Input
                label="% Mínimo de asistencia"
                type="number"
                placeholder="Ej: 80"
                min="1"
                max="100"
                error={errors.min_attendance_percentage?.message}
                {...register('min_attendance_percentage')}
              />
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-700">
                <strong>Nota:</strong> El porcentaje mínimo de asistencia se usa para determinar
                si los participantes son elegibles para recibir certificado.
                Ej: Si estableces 80%, los asistentes deben permanecer al menos el 80% del evento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/events')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit ? 'Actualizar Evento' : 'Crear Evento'}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';

// Esquemas de validación
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe tener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe tener al menos un carácter especial'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

// Logo animado del auditorio
function AuditoriumLogo() {
  return (
    <div className="relative w-20 h-20 mx-auto mb-4">
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {/* Definiciones de animaciones */}
        <defs>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.8; }
            }
            @keyframes breathe {
              0%, 100% { transform: scale(0.95); }
              50% { transform: scale(1); }
            }
            .seat { animation: fadeIn 0.3s ease-in-out forwards; opacity: 0; }
            .seat-row-1 { animation-delay: 0.1s; }
            .seat-row-2 { animation-delay: 0.2s; }
            .seat-row-3 { animation-delay: 0.3s; }
            .light-ray { animation: pulse 2s ease-in-out infinite; }
            .podium { animation: breathe 3s ease-in-out infinite; transform-origin: center; }
          `}</style>
        </defs>

        {/* Fondo - Auditorio arco */}
        <path
          d="M10 60 A30 30 0 0 1 70 60"
          fill="rgba(255,255,255,0.1)"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />

        {/* Escenario */}
        <rect
          x="20"
          y="65"
          width="40"
          height="8"
          fill="rgba(255,255,255,0.15)"
          rx="1"
        />

        {/* Butacas - Fila 1 (3 butacas) */}
        <circle className="seat seat-row-1" cx="30" cy="52" r="3" fill="rgba(255,255,255,0.7)" />
        <circle className="seat seat-row-1" cx="40" cy="50" r="3" fill="rgba(255,255,255,0.7)" />
        <circle className="seat seat-row-1" cx="50" cy="52" r="3" fill="rgba(255,255,255,0.7)" />

        {/* Butacas - Fila 2 (4 butacas) */}
        <circle className="seat seat-row-2" cx="26" cy="42" r="3" fill="rgba(255,255,255,0.2)" />
        <circle className="seat seat-row-2" cx="34" cy="40" r="3" fill="rgba(255,255,255,0.7)" />
        <circle className="seat seat-row-2" cx="46" cy="40" r="3" fill="rgba(255,255,255,0.7)" />
        <circle className="seat seat-row-2" cx="54" cy="42" r="3" fill="rgba(255,255,255,0.2)" />

        {/* Butacas - Fila 3 (5 butacas) */}
        <circle className="seat seat-row-3" cx="22" cy="32" r="3" fill="rgba(255,255,255,0.2)" />
        <circle className="seat seat-row-3" cx="30" cy="30" r="3" fill="rgba(255,255,255,0.2)" />
        <circle className="seat seat-row-3" cx="40" cy="29" r="3" fill="rgba(255,255,255,0.7)" />
        <circle className="seat seat-row-3" cx="50" cy="30" r="3" fill="rgba(255,255,255,0.2)" />
        <circle className="seat seat-row-3" cx="58" cy="32" r="3" fill="rgba(255,255,255,0.2)" />

        {/* Podio */}
        <g className="podium">
          <rect x="37" y="58" width="6" height="7" fill="rgba(255,255,255,0.5)" rx="1" />
        </g>

        {/* Rayos de luz */}
        <line className="light-ray" x1="25" y1="20" x2="40" y2="55" stroke="#fbbf24" strokeWidth="1.5" opacity="0.5" />
        <line className="light-ray" x1="40" y1="15" x2="40" y2="55" stroke="#fbbf24" strokeWidth="1.5" opacity="0.5" />
        <line className="light-ray" x1="55" y1="20" x2="40" y2="55" stroke="#fbbf24" strokeWidth="1.5" opacity="0.5" />
      </svg>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [visible, setVisible] = useState(true);

  // Login form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Register form
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleSwitch = () => {
    setVisible(false);
    setTimeout(() => {
      setIsLogin(prev => !prev);
      setVisible(true);
    }, 200);
  };

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password, navigate);
    } catch {
      // Error ya manejado en el contexto
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await register(data.name, data.email, data.password);
      handleSwitch();
      toast.success('¡Registro exitoso! Ahora inicia sesión');
    } catch {
      // Error ya manejado en el contexto
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Panel izquierdo - Cambia según el estado */}
      <div
        className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1e3a5f] to-[#102a43] flex-col justify-center items-center p-12 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'
          } ${isLogin ? 'order-1' : 'order-2'}`}
      >
        {isLogin ? (
          <div className="text-center">
            <AuditoriumLogo />
            <h1 className="text-white font-bold text-2xl mb-2">SGEA</h1>
            <p className="text-blue-200 text-xs text-center mb-6">
              Sistema de Gestión de Eventos y Asistencias
            </p>
            <h2 className="text-white text-lg font-semibold mb-4">
              ¿Primera vez aquí?
            </h2>
            <Button
              variant="secondary"
              onClick={handleSwitch}
              className="bg-white text-blue-900 hover:bg-blue-50"
            >
              Regístrate gratis
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <AuditoriumLogo />
            <h1 className="text-white font-bold text-2xl mb-2">SGEA</h1>
            <p className="text-blue-200 text-xs text-center mb-6">
              Sistema de Gestión de Eventos y Asistencias
            </p>
            <h2 className="text-white text-lg font-semibold mb-4">
              ¿Ya tienes cuenta?
            </h2>
            <Button
              variant="secondary"
              onClick={handleSwitch}
              className="bg-white text-blue-900 hover:bg-blue-50"
            >
              Inicia sesión
            </Button>
          </div>
        )}
      </div>

      {/* Panel derecho - Formularios */}
      <div
        className={`w-full lg:w-1/2 flex items-center justify-center p-8 bg-background transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'
          } ${isLogin ? 'order-2' : 'order-1'}`}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <AuditoriumLogo />
            <div>
              <h1 className="text-xl font-bold text-primary">SGEH</h1>
              <p className="text-xs text-secondary">Sistema de Gestión de Eventos</p>
            </div>
          </div>

          {/* Login Form */}
          {isLogin && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  ¡Bienvenido!
                </h2>
                <p className="text-secondary">
                  Ingresa tus credenciales para continuar
                </p>
              </div>

              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  error={loginErrors.email?.message}
                  icon={<Mail className="h-5 w-5 text-gray-400" />}
                  {...registerLogin('email')}
                />

                <div className="relative">
                  <Input
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={loginErrors.password?.message}
                    icon={<Lock className="h-5 w-5 text-gray-400" />}
                    {...registerLogin('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-secondary">
                      Recordarme
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm font-medium text-primary hover:text-primary-700"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Iniciar Sesión
                </Button>
              </form>

              <div className="mt-8 text-center lg:hidden">
                <p className="text-sm text-secondary">
                  ¿No tienes una cuenta?{' '}
                  <button
                    onClick={handleSwitch}
                    className="font-medium text-primary hover:text-primary-700"
                  >
                    Regístrate gratis
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Register Form */}
          {!isLogin && (
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Crear cuenta
                </h2>
                <p className="text-secondary">
                  Completa el formulario para registrarte
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-5">
                <Input
                  label="Nombre completo"
                  placeholder="Juan Pérez"
                  error={registerErrors.name?.message}
                  icon={<User className="h-5 w-5 text-gray-400" />}
                  {...registerRegister('name')}
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  error={registerErrors.email?.message}
                  icon={<Mail className="h-5 w-5 text-gray-400" />}
                  {...registerRegister('email')}
                />

                <div className="relative">
                  <Input
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={registerErrors.password?.message}
                    icon={<Lock className="h-5 w-5 text-gray-400" />}
                    {...registerRegister('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirmar contraseña"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    error={registerErrors.confirmPassword?.message}
                    icon={<Lock className="h-5 w-5 text-gray-400" />}
                    {...registerRegister('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div className="text-sm">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary-500 border-gray-300 rounded mt-0.5"
                      required
                    />
                    <span className="ml-2 text-sm text-secondary">
                      Acepto los{' '}
                      <a href="#" className="text-primary hover:underline">
                        Términos y Condiciones
                      </a>{' '}
                      y la{' '}
                      <a href="#" className="text-primary hover:underline">
                        Política de Privacidad
                      </a>
                    </span>
                  </label>
                </div>

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Crear cuenta
                </Button>
              </form>

              <div className="mt-8 text-center lg:hidden">
                <p className="text-sm text-secondary">
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    onClick={handleSwitch}
                    className="font-medium text-primary hover:text-primary-700"
                  >
                    Inicia sesión
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

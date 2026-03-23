import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@/types';
import { authApi } from '@/api/auth.api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, navigate?: ReturnType<typeof useNavigate>) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar auth desde localStorage
  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, navigate?: ReturnType<typeof useNavigate>) => {
    try {
      const response = await authApi.login({ email, password });
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success(`¡Bienvenido/a, ${response.user.name}!`);

      // Redirigir según el rol
      if (navigate) {
        if (response.user.role === 'admin') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/panel', { replace: true });
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'Error al iniciar sesión');
      } else {
        toast.error('Error al iniciar sesión');
      }
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await authApi.register({ name, email, password });
      toast.success('Registro exitoso. Ahora puedes iniciar sesión.');
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        toast.error(apiError.response?.data?.message || 'Error al registrarse');
      } else {
        toast.error('Error al registrarse');
      }
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.info('Sesión cerrada');
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

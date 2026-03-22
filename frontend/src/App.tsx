import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import PrivateRoute from '@/guards/PrivateRoute';
import AdminRoute from '@/guards/AdminRoute';
import Layout from '@/components/layout/Layout';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Student pages
import DashboardPage from '@/pages/student/DashboardPage';
import EventsPage from '@/pages/student/EventsPage';
import EventDetailPage from '@/pages/student/EventDetailPage';
import MyEnrollmentsPage from '@/pages/student/MyEnrollmentsPage';
import CertificatesPage from '@/pages/student/CertificatesPage';

// Admin pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import ManageEventsPage from '@/pages/admin/ManageEventsPage';
import CreateEditEventPage from '@/pages/admin/CreateEditEventPage';
import EventAttendancePage from '@/pages/admin/EventAttendancePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected student routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
              <Route path="/events" element={<Layout><EventsPage /></Layout>} />
              <Route path="/events/:id" element={<Layout><EventDetailPage /></Layout>} />
              <Route path="/my-enrollments" element={<Layout><MyEnrollmentsPage /></Layout>} />
              <Route path="/certificates" element={<Layout><CertificatesPage /></Layout>} />
            </Route>

            {/* Protected admin routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Layout><AdminDashboardPage /></Layout>} />
              <Route path="/admin/events" element={<Layout><ManageEventsPage /></Layout>} />
              <Route path="/admin/events/new" element={<Layout><CreateEditEventPage /></Layout>} />
              <Route path="/admin/events/:id/edit" element={<Layout><CreateEditEventPage /></Layout>} />
              <Route path="/admin/events/:id/attendance" element={<Layout><EventAttendancePage /></Layout>} />
            </Route>

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

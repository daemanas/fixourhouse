import { Navigate, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';
import env from './config/env';

// Public pages
const AboutPage = lazy(() => import('./pages/public/About'));
const ContactPage = lazy(() => import('./pages/public/Contact'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPolicy'));
const TermsPage = lazy(() => import('./pages/public/Terms'));
const RefundPage = lazy(() => import('./pages/public/RefundPolicy'));
const CancellationPage = lazy(() => import('./pages/public/CancellationPolicy'));
const CookiePage = lazy(() => import('./pages/public/CookiePolicy'));
const ReportAbusePage = lazy(() => import('./pages/public/ReportAbuse'));

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const OtpPage = lazy(() => import('./pages/auth/OtpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Customer pages
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerServicesPage = lazy(() => import('./pages/customer/CustomerServicesPage'));
const SearchPage = lazy(() => import('./pages/customer/SearchPage'));
const ServiceDetailPage = lazy(() => import('./pages/customer/ServiceDetailPage'));
const ProviderProfilePage = lazy(() => import('./pages/customer/ProviderProfilePage'));
const BookingsPage = lazy(() => import('./pages/customer/BookingsPage'));
const CustomerComplaintsPage = lazy(() => import('./pages/customer/CustomerComplaintsPage'));
const WishlistPage = lazy(() => import('./pages/customer/WishlistPage'));
const NotificationsPage = lazy(() => import('./pages/customer/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/customer/SettingsPage'));

// Provider pages
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const BookingRequestsPage = lazy(() => import('./pages/provider/BookingRequestsPage'));
const ProviderJobsPage = lazy(() => import('./pages/provider/JobsPage'));
const ProviderAvailabilityPage = lazy(() => import('./pages/provider/AvailabilityPage'));
const ProviderProfileSettingsPage = lazy(() => import('./pages/provider/ProviderProfilePage'));
const ProviderGalleryPage = lazy(() => import('./pages/provider/GalleryPage'));
const ProviderServicesPage = lazy(() => import('./pages/provider/ServicesPage'));
const ProviderEarningsPage = lazy(() => import('./pages/provider/EarningsPage'));
const ProviderWithdrawalsPage = lazy(() => import('./pages/provider/WithdrawalsPage'));
const ProviderReviewsPage = lazy(() => import('./pages/provider/ReviewsPage'));
const ProviderSettingsPage = lazy(() => import('./pages/provider/ProviderSettingsPage'));

// Admin pages
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminServiceCatalogPage = lazy(() => import('./pages/admin/AdminServiceCatalogPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminProvidersPage = lazy(() => import('./pages/admin/AdminProvidersPage'));
const AdminProviderDetailPage = lazy(() => import('./pages/admin/AdminProviderDetailPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminComplaintsPage = lazy(() => import('./pages/admin/AdminComplaintsPage'));
const AdminComplaintDetailPage = lazy(() => import('./pages/admin/AdminComplaintDetailPage'));
const AdminRevenuePage = lazy(() => import('./pages/admin/AdminRevenuePage'));
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'));
const AdminCustomerDetailPage = lazy(() => import('./pages/admin/AdminCustomerDetailPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminWebsiteSettingsPage = lazy(() => import('./pages/admin/AdminWebsiteSettingsPage'));
const AdminProviderCommissionPage = lazy(() => import('./pages/admin/AdminProviderCommissionPage'));

// Layouts
const PublicLayout = lazy(() => import('./layouts/PublicLayout'));
const AuthLayout = lazy(() => import('./layouts/AuthLayout'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));
const ProviderLayout = lazy(() => import('./layouts/ProviderLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// 404
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}

function LegacyBookingRedirect() {
  const { providerId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');

  if (!serviceId) return <Navigate to="/customer/services" replace />;
  return (
    <Navigate
      to={`/customer/service/${encodeURIComponent(serviceId)}`}
      replace
      state={{ providerId }}
    />
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public customer marketplace */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/services" element={<CustomerServicesPage />} />
          <Route path="/customer/services/:id" element={<ServiceDetailPage />} />
          <Route path="/customer/categories" element={<CustomerServicesPage />} />
          <Route path="/customer/search" element={<SearchPage />} />
          <Route path="/customer/service/:id" element={<ServiceDetailPage />} />
          <Route path="/customer/book/:providerId" element={<LegacyBookingRedirect />} />
          <Route path="/customer/provider/:id" element={<ProviderProfilePage />} />
          <Route path="/customer/provider/:id/services" element={<ProviderProfilePage />} />
          <Route path="/customer/provider/:id/gallery" element={<ProviderProfilePage />} />
        </Route>

        {/* Public informational routes */}
        <Route element={<PublicLayout />}>
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refund" element={<RefundPage />} />
          <Route path="/cancellation" element={<CancellationPage />} />
          <Route path="/cookie" element={<CookiePage />} />
          <Route path="/report-abuse" element={<ReportAbusePage />} />
        </Route>

        {/* Auth routes */}
        <Route element={<PublicOnlyRoute><AuthLayout /></PublicOnlyRoute>}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/otp" element={<OtpPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected customer routes */}
        <Route element={<ProtectedRoute roles={[env.ROLES.CUSTOMER]} />}>
          <Route path="/customer/bookings" element={<BookingsPage />} />
          <Route path="/customer/complaints" element={<CustomerComplaintsPage />} />
          <Route path="/customer/wishlist" element={<WishlistPage />} />
          <Route path="/customer/notifications" element={<NotificationsPage />} />
          <Route path="/customer/profile" element={<ProfilePage />} />
          <Route path="/customer/settings" element={<SettingsPage />} />
          <Route path="/customer/reviews" element={<NotFoundPage />} />
          <Route path="/customer/messages" element={<NotFoundPage />} />
          <Route path="/customer/addresses" element={<NotFoundPage />} />
          <Route path="/customer/messages/*" element={<NotFoundPage />} />
          <Route path="/customer/booking/*" element={<NotFoundPage />} />
          <Route path="/customer/payment/*" element={<NotFoundPage />} />
        </Route>

        {/* Provider routes */}
        <Route element={<ProtectedRoute roles={[env.ROLES.PROVIDER]}><ProviderLayout /></ProtectedRoute>}>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/requests" element={<BookingRequestsPage />} />
          <Route path="/provider/jobs" element={<ProviderJobsPage />} />
          <Route path="/provider/availability" element={<ProviderAvailabilityPage />} />
          <Route path="/provider/profile" element={<ProviderProfileSettingsPage />} />
          <Route path="/provider/gallery" element={<ProviderGalleryPage />} />
          <Route path="/provider/services" element={<ProviderServicesPage />} />
          <Route path="/provider/earnings" element={<ProviderEarningsPage />} />
          <Route path="/provider/withdrawals" element={<ProviderWithdrawalsPage />} />
          <Route path="/provider/reviews" element={<ProviderReviewsPage />} />
          <Route path="/provider/settings" element={<ProviderSettingsPage />} />
          <Route path="/provider/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute roles={[env.ROLES.ADMIN]}><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/dashboard" element={<AdminAnalyticsPage />} />
          <Route path="/admin/service-catalog" element={<AdminServiceCatalogPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/customers/:id" element={<AdminCustomerDetailPage />} />
          <Route path="/admin/providers" element={<AdminProvidersPage />} />
          <Route path="/admin/providers/:id" element={<AdminProviderDetailPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
          <Route path="/admin/complaints/:id" element={<AdminComplaintDetailPage />} />
          <Route path="/admin/revenue" element={<AdminRevenuePage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/website-settings" element={<AdminWebsiteSettingsPage />} />
          <Route path="/admin/provider-commission" element={<AdminProviderCommissionPage />} />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
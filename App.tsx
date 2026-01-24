import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider } from './src/context/AuthContext';
import { ProtectedRoute } from './src/components/ProtectedRoute';
import { ErrorBoundary, PageErrorBoundary } from './src/components/ErrorBoundary';
import { queryClient } from './src/lib/queryClient';
import { initErrorTracking } from './src/lib/errorTracking';

// Initialize error tracking
initErrorTracking();

// Public Pages (loaded eagerly for fast initial load)
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';

// Lazy-loaded public pages
const Product = lazy(() => import('./pages/Product').then(m => ({ default: m.Product })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const Integrations = lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const Enterprise = lazy(() => import('./pages/Enterprise').then(m => ({ default: m.Enterprise })));
const Changelog = lazy(() => import('./pages/Changelog').then(m => ({ default: m.Changelog })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Blog = lazy(() => import('./pages/Blog').then(m => ({ default: m.Blog })));
const Careers = lazy(() => import('./pages/Careers').then(m => ({ default: m.Careers })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Pricing = lazy(() => import('./components/Pricing').then(m => ({ default: m.Pricing })));

// Lazy-loaded Dashboard Pages (code splitting for performance)
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));
const Agents = lazy(() => import('./pages/dashboard/Agents').then(m => ({ default: m.Agents })));
const Knowledge = lazy(() => import('./pages/dashboard/Knowledge').then(m => ({ default: m.Knowledge })));
const Leads = lazy(() => import('./pages/dashboard/Leads').then(m => ({ default: m.Leads })));
const Deals = lazy(() => import('./pages/dashboard/Deals').then(m => ({ default: m.Deals })));
const DealDetail = lazy(() => import('./pages/dashboard/DealDetail').then(m => ({ default: m.DealDetail })));
const LeadDetail = lazy(() => import('./pages/dashboard/LeadDetail').then(m => ({ default: m.LeadDetail })));
const ContactDetail = lazy(() => import('./pages/dashboard/ContactDetail').then(m => ({ default: m.ContactDetail })));
const Revenue = lazy(() => import('./pages/dashboard/Revenue').then(m => ({ default: m.Revenue })));
const Calendar = lazy(() => import('./pages/dashboard/Calendar').then(m => ({ default: m.Calendar })));
const Analytics = lazy(() => import('./pages/dashboard/Analytics').then(m => ({ default: m.Analytics })));
const Messages = lazy(() => import('./pages/dashboard/Messages').then(m => ({ default: m.Messages })));
const Settings = lazy(() => import('./pages/dashboard/Settings').then(m => ({ default: m.Settings })));
const Products = lazy(() => import('./pages/dashboard/Products').then(m => ({ default: m.Products })));
const Documents = lazy(() => import('./pages/dashboard/Documents').then(m => ({ default: m.Documents })));
const AIAgents = lazy(() => import('./pages/dashboard/AIAgents').then(m => ({ default: m.AIAgents })));
const Companies = lazy(() => import('./pages/dashboard/Companies').then(m => ({ default: m.Companies })));
const Contacts = lazy(() => import('./pages/dashboard/Contacts').then(m => ({ default: m.Contacts })));
const Automations = lazy(() => import('./pages/dashboard/Automations').then(m => ({ default: m.Automations })));
const IntegrationsPage = lazy(() => import('./pages/dashboard/Integrations').then(m => ({ default: m.IntegrationsPage })));
const Team = lazy(() => import('./pages/dashboard/Team').then(m => ({ default: m.Team })));
const AIChat = lazy(() => import('./pages/dashboard/AIChat').then(m => ({ default: m.AIChat })));
const Admin = lazy(() => import('./pages/dashboard/Admin').then(m => ({ default: m.Admin })));

// Loading fallback component
function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-[#EAD07D] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Dashboard loading fallback (smaller, inline)
function DashboardLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#EAD07D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const PricingPage = () => (
  <div className="pt-20">
    <Suspense fallback={<PageLoadingFallback />}>
      <Pricing />
    </Suspense>
  </div>
);

function AppContent() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isDashboard = pathname.startsWith('/dashboard');

  // Scroll to top on route change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-secondary font-sans antialiased overflow-x-hidden">
      {!isAuthPage && !isDashboard && <Navbar />}
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/product" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Product />
            </Suspense>
          } />
          <Route path="/features" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <FeaturesPage />
            </Suspense>
          } />
          <Route path="/integrations" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Integrations />
            </Suspense>
          } />
          <Route path="/enterprise" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Enterprise />
            </Suspense>
          } />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/changelog" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Changelog />
            </Suspense>
          } />
          <Route path="/about" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <About />
            </Suspense>
          } />
          <Route path="/blog" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Blog />
            </Suspense>
          } />
          <Route path="/careers" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Careers />
            </Suspense>
          } />
          <Route path="/contact" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Contact />
            </Suspense>
          } />
          <Route path="/privacy" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Privacy />
            </Suspense>
          } />
          <Route path="/terms" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <Terms />
            </Suspense>
          } />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Dashboard Routes - Protected and Lazy Loaded */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <DashboardLayout />
              </Suspense>
            </ProtectedRoute>
          }>
            <Route index element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <DashboardHome />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="agents" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Agents />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="ai-agents" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <AIAgents />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="ai" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <AIChat />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="knowledge" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Knowledge />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="leads" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Leads />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="leads/:id" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <LeadDetail />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="contacts" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Contacts />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="contacts/:id" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <ContactDetail />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="companies" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Companies />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="deals" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Deals />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="deals/:id" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <DealDetail />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="products" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Products />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="documents" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Documents />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="revenue" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Revenue />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="calendar" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Calendar />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="analytics" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Analytics />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="automations" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Automations />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="integrations" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <IntegrationsPage />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="team" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Team />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="messages" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Messages />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Settings />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="admin" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {!isAuthPage && !isDashboard && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

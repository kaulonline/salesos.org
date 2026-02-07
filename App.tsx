import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider } from './src/context/AuthContext';
import { ProtectedRoute } from './src/components/ProtectedRoute';
import { ErrorBoundary, PageErrorBoundary } from './src/components/ErrorBoundary';
import { FeatureProvider } from './src/components/FeatureGate';
import { MenuPreferencesProvider } from './src/context/MenuPreferencesContext';
import { queryClient } from './src/lib/queryClient';
import { initErrorTracking } from './src/lib/errorTracking';
import { NoiseOverlay } from './components/ui/NoiseOverlay';
import { ToastProvider } from './src/components/ui/Toast';
import { CookieConsent } from './src/components/CookieConsent';
import DesignSystem from './src/pages/DesignSystem';

// Initialize error tracking
initErrorTracking();

// Public Pages (loaded eagerly for fast initial load)
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { AcceptInvite } from './pages/AcceptInvite';

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
const PricingLanding = lazy(() => import('./components/Pricing').then(m => ({ default: m.Pricing })));
const DynamicPricingPage = lazy(() => import('./pages/Pricing').then(m => ({ default: m.PricingPage })));
const PublicForm = lazy(() => import('./pages/PublicForm'));

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
const AccountDetail = lazy(() => import('./pages/dashboard/AccountDetail').then(m => ({ default: m.AccountDetail })));
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
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then(m => ({ default: m.AdminLayout })));
const Reports = lazy(() => import('./pages/dashboard/Reports').then(m => ({ default: m.Reports })));
const Tasks = lazy(() => import('./pages/dashboard/Tasks').then(m => ({ default: m.Tasks })));
const Campaigns = lazy(() => import('./pages/dashboard/Campaigns').then(m => ({ default: m.Campaigns })));
const Subscription = lazy(() => import('./pages/dashboard/Subscription').then(m => ({ default: m.Subscription })));
const PipelineSettings = lazy(() => import('./pages/dashboard/PipelineSettings').then(m => ({ default: m.PipelineSettings })));

// Phase 1 Feature Pages
const Quotes = lazy(() => import('./pages/dashboard/Quotes'));
const QuoteDetail = lazy(() => import('./pages/dashboard/QuoteDetail'));
const EmailTemplates = lazy(() => import('./pages/dashboard/EmailTemplates'));
const CustomFields = lazy(() => import('./pages/dashboard/settings/CustomFields'));
const Profiles = lazy(() => import('./pages/dashboard/settings/Profiles'));
const Security = lazy(() => import('./pages/dashboard/settings/Security'));
const AssignmentRules = lazy(() => import('./pages/dashboard/settings/AssignmentRules'));
const WebForms = lazy(() => import('./pages/dashboard/settings/WebForms'));
const ApiSettings = lazy(() => import('./pages/dashboard/settings/ApiSettings'));
const DataPrivacy = lazy(() => import('./pages/dashboard/settings/DataPrivacy'));
const NotificationPreferences = lazy(() => import('./pages/dashboard/settings/NotificationPreferences'));

// Phase 2 CPQ Feature Pages
const PriceBooks = lazy(() => import('./pages/dashboard/PriceBooks'));
const DiscountRules = lazy(() => import('./pages/dashboard/DiscountRules'));
const TaxRates = lazy(() => import('./pages/dashboard/TaxRates'));

// Phase 3 Workflow & Automation
const ApprovalWorkflows = lazy(() => import('./pages/dashboard/ApprovalWorkflows'));

// Phase 4 Integrations & Advanced
const Orders = lazy(() => import('./pages/dashboard/Orders'));
const OrderDetail = lazy(() => import('./pages/dashboard/OrderDetail'));
const CPQAnalytics = lazy(() => import('./pages/dashboard/CPQAnalytics'));

// Phase 5 Advanced CRM Features
const Alerts = lazy(() => import('./pages/dashboard/Alerts').then(m => ({ default: m.Alerts })));
const Forecast = lazy(() => import('./pages/dashboard/Forecast').then(m => ({ default: m.Forecast })));
const AccountHealth = lazy(() => import('./pages/dashboard/AccountHealth').then(m => ({ default: m.AccountHealth })));
const Territories = lazy(() => import('./pages/dashboard/Territories').then(m => ({ default: m.Territories })));
const WinLoss = lazy(() => import('./pages/dashboard/WinLoss').then(m => ({ default: m.WinLoss })));
const Playbooks = lazy(() => import('./pages/dashboard/Playbooks').then(m => ({ default: m.Playbooks })));
const ConversationIntelligence = lazy(() => import('./pages/dashboard/ConversationIntelligence').then(m => ({ default: m.ConversationIntelligence })));

// Admin Outcome Billing
const OutcomePricing = lazy(() => import('./pages/dashboard/OutcomePricing').then(m => ({ default: m.OutcomePricing })));

// Billing Pages
const CheckoutSuccess = lazy(() => import('./pages/billing/Success').then(m => ({ default: m.CheckoutSuccess })));
const CheckoutCancel = lazy(() => import('./pages/billing/Cancel').then(m => ({ default: m.CheckoutCancel })));
const BillingPortalPage = lazy(() => import('./pages/billing/Portal').then(m => ({ default: m.BillingPortalPage })));
const PricingTablePage = lazy(() => import('./components/billing/PricingTable').then(m => ({ default: m.PricingTable })));

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

const PricingPageWrapper = () => (
  <Suspense fallback={<PageLoadingFallback />}>
    <DynamicPricingPage />
  </Suspense>
);

function AppContent() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/reset-password' || pathname === '/verify-email' || pathname === '/invite';
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdmin = pathname.startsWith('/admin');
  const isBilling = pathname.startsWith('/billing');
  const isPublicForm = pathname.startsWith('/forms/');

  // Scroll to top on route change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-secondary font-sans antialiased overflow-x-hidden">
      {/* Global subtle noise overlay for premium feel */}
      <NoiseOverlay opacity={0.02} blend="soft-light" />
      {!isAuthPage && !isDashboard && !isAdmin && !isBilling && !isPublicForm && <Navbar />}
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/design-system" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <DesignSystem />
            </Suspense>
          } />
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
          <Route path="/pricing" element={<PricingPageWrapper />} />
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

          {/* Public Web Forms */}
          <Route path="/forms/:slug" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <PublicForm />
            </Suspense>
          } />

          {/* Billing Routes */}
          <Route path="/billing" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <BillingPortalPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/billing/success" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <CheckoutSuccess />
            </Suspense>
          } />
          <Route path="/billing/cancel" element={
            <Suspense fallback={<PageLoadingFallback />}>
              <CheckoutCancel />
            </Suspense>
          } />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/invite" element={<AcceptInvite />} />

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
            <Route path="companies/:id" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <AccountDetail />
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
            <Route path="reports" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Reports />
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
            <Route path="admin/outcome-pricing" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <OutcomePricing />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="tasks" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Tasks />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="campaigns" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Campaigns />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="subscription" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Subscription />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="pipelines" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <PipelineSettings />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="quotes" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Quotes />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="quotes/:id" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <QuoteDetail />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="email-templates" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <EmailTemplates />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="price-books" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <PriceBooks />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="discount-rules" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <DiscountRules />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="tax-rates" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <TaxRates />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="approval-workflows" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <ApprovalWorkflows />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="orders" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Orders />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="orders/:id" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <OrderDetail />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="cpq-analytics" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <CPQAnalytics />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="alerts" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Alerts />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="forecast" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Forecast />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="account-health" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <AccountHealth />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="territories" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Territories />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="win-loss" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <WinLoss />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="playbooks" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Playbooks />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="conversations" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <ConversationIntelligence />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/custom-fields" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <CustomFields />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/profiles" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Profiles />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/security" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Security />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/assignment-rules" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <AssignmentRules />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/web-forms" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <WebForms />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/api" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <ApiSettings />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/privacy" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <DataPrivacy />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings/notifications" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <NotificationPreferences />
                </Suspense>
              </PageErrorBoundary>
            } />
          </Route>

          {/* Admin Routes - Protected with AdminLayout */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }>
            <Route index element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="users" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="billing" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="features" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="audit" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="settings" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="system" element={
              <PageErrorBoundary>
                <Suspense fallback={<DashboardLoadingFallback />}>
                  <Admin />
                </Suspense>
              </PageErrorBoundary>
            } />
            <Route path="api-keys" element={
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
      {!isAuthPage && !isDashboard && !isAdmin && !isBilling && !isPublicForm && <Footer />}
      <CookieConsent />
    </div>
  );
}


function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FeatureProvider>
            <MenuPreferencesProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </MenuPreferencesProvider>
          </FeatureProvider>
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

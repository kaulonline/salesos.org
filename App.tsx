import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthProvider } from './src/context/AuthContext';
import { ProtectedRoute } from './src/components/ProtectedRoute';

// Public Pages
import { Home } from './pages/Home';
import { Product } from './pages/Product';
import { FeaturesPage } from './pages/FeaturesPage';
import { Integrations } from './pages/Integrations';
import { Enterprise } from './pages/Enterprise';
import { Changelog } from './pages/Changelog';
import { About } from './pages/About';
import { Blog } from './pages/Blog';
import { Careers } from './pages/Careers';
import { Contact } from './pages/Contact';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Pricing } from './components/Pricing';

// Dashboard Pages
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { Agents } from './pages/dashboard/Agents';
import { Knowledge } from './pages/dashboard/Knowledge';
import { Leads } from './pages/dashboard/Leads';
import { Deals } from './pages/dashboard/Deals';
import { DealDetail } from './pages/dashboard/DealDetail';
import { Revenue } from './pages/dashboard/Revenue';
import { Calendar } from './pages/dashboard/Calendar';
import { Analytics } from './pages/dashboard/Analytics';
import { Messages } from './pages/dashboard/Messages';
import { Settings } from './pages/dashboard/Settings';
import { Products } from './pages/dashboard/Products';
import { Documents } from './pages/dashboard/Documents';
// New Enterprise CRM Pages
import { AIAgents } from './pages/dashboard/AIAgents';
import { Companies } from './pages/dashboard/Companies';
import { Contacts } from './pages/dashboard/Contacts';
import { Automations } from './pages/dashboard/Automations';
import { IntegrationsPage } from './pages/dashboard/Integrations';
import { Team } from './pages/dashboard/Team';
import { AIChat } from './pages/dashboard/AIChat';
import { Admin } from './pages/dashboard/Admin';

const PricingPage = () => (
    <div className="pt-20">
        <Pricing />
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
          <Route path="/product" element={<Product />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/enterprise" element={<Enterprise />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Dashboard Routes - Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="agents" element={<Agents />} />
            <Route path="ai-agents" element={<AIAgents />} />
            <Route path="ai" element={<AIChat />} />
            <Route path="knowledge" element={<Knowledge />} />
            <Route path="leads" element={<Leads />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="companies" element={<Companies />} />
            <Route path="deals" element={<Deals />} />
            <Route path="deals/:id" element={<DealDetail />} />
            <Route path="products" element={<Products />} />
            <Route path="documents" element={<Documents />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="automations" element={<Automations />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="team" element={<Team />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<Admin />} />
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

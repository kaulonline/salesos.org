import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

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
import { PageLayout } from './components/PageLayout';

// Dashboard Pages
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardHome } from './pages/dashboard/DashboardHome';
import { Leads } from './pages/dashboard/Leads';
import { Deals } from './pages/dashboard/Deals';
import { DealDetail } from './pages/dashboard/DealDetail';
import { Revenue } from './pages/dashboard/Revenue';
import { Calendar } from './pages/dashboard/Calendar';
import { Analytics } from './pages/dashboard/Analytics';
import { Messages } from './pages/dashboard/Messages';
import { Settings } from './pages/dashboard/Settings';

const PricingPage = () => (
    <div className="pt-20">
        <Pricing />
    </div>
);

function App() {
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

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="leads" element={<Leads />} />
            <Route path="deals" element={<Deals />} />
            <Route path="deals/:id" element={<DealDetail />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {!isAuthPage && !isDashboard && <Footer />}
    </div>
  );
}

export default App;
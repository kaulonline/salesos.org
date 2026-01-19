import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
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
import { Pricing } from './components/Pricing'; // Reuse Pricing component as a page wrapper or import from pages if refactored. 
// Note: We can wrap existing Pricing component in a PageLayout for the /pricing route, 
// but for simplicity, let's just render the Pricing section or create a wrapper.
import { PageLayout } from './components/PageLayout';

const PricingPage = () => (
    <div className="pt-20">
        <Pricing />
    </div>
);

function App() {
  const { pathname } = useLocation();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  // Scroll to top on route change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-secondary font-sans antialiased overflow-x-hidden">
      {!isAuthPage && <Navbar />}
      <main>
        <Routes>
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
          <Route path="/signup" element={<Login />} />

          {/* Catch-all route to prevent empty content on unknown paths */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;
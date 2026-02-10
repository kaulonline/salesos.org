import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F1EA] p-6">
      <div className="text-center">
        <p className="text-4xl sm:text-5xl md:text-6xl font-light text-[#1A1A1A] mb-2">404</p>
        <h1 className="text-xl font-medium text-[#1A1A1A] mb-2">Page not found</h1>
        <p className="text-sm text-[#666] mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
        >
          <Home size={16} />
          Back to home
        </Link>
      </div>
    </div>
  );
}

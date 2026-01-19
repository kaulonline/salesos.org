import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Command, Mail, Lock, Eye, EyeOff, ArrowRight, User, Building2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Signup: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup logic here
    console.log('Signup:', formData);
  };

  const features = [
    '14-day free trial, no credit card required',
    'Access to all premium features',
    'Unlimited team members',
    'Priority support',
  ];

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex flex-col lg:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#EAD07D] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#EAD07D] rounded-full blur-3xl"></div>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer w-fit">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#1A1A1A]">
              <Command size={22} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              SalesOS<span className="text-[#EAD07D]">.</span>
            </span>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
              Start closing more deals today
            </h2>
            <p className="text-lg text-white/70">
              Join 2,000+ high-growth revenue teams using SalesOS to automate outreach and accelerate pipeline.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#EAD07D] flex-shrink-0" />
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <p className="text-white/90 italic mb-4">
              "SalesOS transformed how we approach outbound. We've seen a 3x increase in qualified meetings since switching."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-bold">
                SK
              </div>
              <div>
                <p className="text-white font-semibold">Sarah Kim</p>
                <p className="text-white/60 text-sm">VP Sales, TechCorp</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/40 text-sm">
          <p>&copy; {new Date().getFullYear()} SalesOS. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="p-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer w-fit">
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
              <Command size={18} />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
              SalesOS<span className="text-[#EAD07D]">.</span>
            </span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight mb-2">
                Create your account
              </h1>
              <p className="text-[#666]">
                Start your 14-day free trial. No credit card required.
              </p>
            </div>

            {/* Signup Card */}
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-card border border-black/5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name Field */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1A1A1A]">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F2F1EA] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors outline-none"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1A1A1A]">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F2F1EA] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors outline-none"
                      placeholder="jane@company.com"
                      required
                    />
                  </div>
                </div>

                {/* Company Field */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1A1A1A]">Company</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" />
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F2F1EA] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors outline-none"
                      placeholder="Acme Inc."
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1A1A1A]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-12 pr-12 py-3 rounded-xl bg-[#F2F1EA] border-2 border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-0 transition-colors outline-none"
                      placeholder="Create a strong password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#1A1A1A] transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-[#999]">Must be at least 8 characters</p>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="w-4 h-4 mt-0.5 rounded border-[#ccc] text-[#1A1A1A] focus:ring-[#EAD07D] focus:ring-offset-0"
                  />
                  <label htmlFor="terms" className="text-sm text-[#666]">
                    I agree to the{' '}
                    <Link to="/terms" className="text-[#1A1A1A] hover:text-[#EAD07D] underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-[#1A1A1A] hover:text-[#EAD07D] underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                {/* Submit Button */}
                <Button type="submit" variant="secondary" className="w-full group">
                  Create Account
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-black/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-[#999]">or sign up with</span>
                  </div>
                </div>

                {/* Social Signup */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-black/10 hover:bg-[#F2F1EA] transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-medium text-[#1A1A1A]">Google</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-black/10 hover:bg-[#F2F1EA] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="#1A1A1A" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    <span className="text-sm font-medium text-[#1A1A1A]">GitHub</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Login Link */}
            <p className="text-center mt-8 text-[#666]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#1A1A1A] hover:text-[#EAD07D] transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="p-6 text-center text-sm text-[#999] lg:hidden">
          <p>&copy; {new Date().getFullYear()} SalesOS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

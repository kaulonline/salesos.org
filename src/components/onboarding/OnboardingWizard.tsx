import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Users,
  Building2,
  Target,
  Zap,
  Sparkles,
  ArrowRight,
  Package,
  Mail,
  Calendar,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateSampleData, storeSampleData, isSampleDataLoaded } from '../../utils/sampleDataGenerator';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ONBOARDING_COMPLETED_KEY = 'salesos_onboarding_completed';
const ONBOARDING_STEP_KEY = 'salesos_onboarding_step';

// Step 1: Welcome
const WelcomeStep: React.FC<{ userName?: string }> = ({ userName }) => (
  <div className="text-center py-8">
    <div className="w-20 h-20 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-6">
      <Sparkles className="w-10 h-10 text-[#EAD07D]" />
    </div>
    <h2 className="text-3xl font-light text-[#1A1A1A] mb-3">
      Welcome to SalesOS{userName ? `, ${userName.split(' ')[0]}` : ''}!
    </h2>
    <p className="text-[#666] max-w-md mx-auto mb-8">
      Let's get you set up in just a few minutes. We'll help you configure your workspace
      and show you the key features.
    </p>
    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
      <div className="p-4 bg-[#F8F8F6] rounded-xl text-center">
        <div className="w-10 h-10 rounded-lg bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-2">
          <Users className="w-5 h-5 text-[#93C01F]" />
        </div>
        <p className="text-xs text-[#666]">Manage Contacts</p>
      </div>
      <div className="p-4 bg-[#F8F8F6] rounded-xl text-center">
        <div className="w-10 h-10 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-2">
          <Target className="w-5 h-5 text-[#EAD07D]" />
        </div>
        <p className="text-xs text-[#666]">Track Deals</p>
      </div>
      <div className="p-4 bg-[#F8F8F6] rounded-xl text-center">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
          <Zap className="w-5 h-5 text-blue-600" />
        </div>
        <p className="text-xs text-[#666]">AI Powered</p>
      </div>
    </div>
  </div>
);

// Step 2: Company Profile
interface CompanyProfileStepProps {
  data: { industry: string; teamSize: string; goals: string[] };
  onChange: (data: { industry: string; teamSize: string; goals: string[] }) => void;
}

const CompanyProfileStep: React.FC<CompanyProfileStepProps> = ({ data, onChange }) => {
  const industries = [
    'Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing',
    'Professional Services', 'Real Estate', 'Education', 'Other'
  ];

  const teamSizes = [
    { label: 'Just me', value: '1' },
    { label: '2-10', value: '2-10' },
    { label: '11-50', value: '11-50' },
    { label: '51-200', value: '51-200' },
    { label: '200+', value: '200+' }
  ];

  const goalOptions = [
    { id: 'leads', label: 'Generate more leads', icon: Users },
    { id: 'deals', label: 'Close more deals', icon: Target },
    { id: 'automation', label: 'Automate workflows', icon: Zap },
    { id: 'quotes', label: 'Create quotes faster', icon: Package }
  ];

  const toggleGoal = (goalId: string) => {
    const newGoals = data.goals.includes(goalId)
      ? data.goals.filter(g => g !== goalId)
      : [...data.goals, goalId];
    onChange({ ...data, goals: newGoals });
  };

  return (
    <div className="py-6">
      <h2 className="text-2xl font-light text-[#1A1A1A] mb-2">Tell us about your business</h2>
      <p className="text-[#666] mb-6">This helps us customize your experience</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Industry</label>
          <select
            value={data.industry}
            onChange={(e) => onChange({ ...data, industry: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
          >
            <option value="">Select your industry</option>
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Team Size</label>
          <div className="grid grid-cols-5 gap-2">
            {teamSizes.map(size => (
              <button
                key={size.value}
                onClick={() => onChange({ ...data, teamSize: size.value })}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  data.teamSize === size.value
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F8F8F6] text-[#666] hover:bg-[#F0EBD8]'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-2">What are your main goals?</label>
          <div className="grid grid-cols-2 gap-3">
            {goalOptions.map(goal => (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${
                  data.goals.includes(goal.id)
                    ? 'border-[#EAD07D] bg-[#EAD07D]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <goal.icon className={`w-5 h-5 ${data.goals.includes(goal.id) ? 'text-[#1A1A1A]' : 'text-[#999]'}`} />
                <span className={`text-sm font-medium ${data.goals.includes(goal.id) ? 'text-[#1A1A1A]' : 'text-[#666]'}`}>
                  {goal.label}
                </span>
                {data.goals.includes(goal.id) && (
                  <Check className="w-4 h-4 text-[#93C01F] ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 3: Feature Tour
const FeatureTourStep: React.FC = () => {
  const features = [
    {
      icon: Users,
      title: 'Contacts & Leads',
      description: 'Manage your contacts, track lead sources, and convert leads to opportunities.',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Target,
      title: 'Deals Pipeline',
      description: 'Visualize your sales pipeline with customizable stages and track deal progress.',
      color: 'bg-[#93C01F]/20 text-[#93C01F]'
    },
    {
      icon: Package,
      title: 'Quotes & Orders',
      description: 'Create professional quotes, manage pricing, and convert to orders seamlessly.',
      color: 'bg-[#EAD07D]/20 text-[#1A1A1A]'
    },
    {
      icon: Zap,
      title: 'AI Assistant',
      description: 'Get intelligent insights, automate tasks, and receive deal recommendations.',
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  return (
    <div className="py-6">
      <h2 className="text-2xl font-light text-[#1A1A1A] mb-2">Key Features</h2>
      <p className="text-[#666] mb-6">Here's what you can do with SalesOS</p>

      <div className="space-y-4">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="flex items-start gap-4 p-4 bg-[#F8F8F6] rounded-xl"
          >
            <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center flex-shrink-0`}>
              <feature.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-[#1A1A1A] mb-1">{feature.title}</h3>
              <p className="text-sm text-[#666]">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Step 4: Quick Actions
interface QuickActionsStepProps {
  onAction: (action: string) => void;
}

const QuickActionsStep: React.FC<QuickActionsStepProps> = ({ onAction }) => {
  const [loadingDemo, setLoadingDemo] = React.useState(false);
  const [demoLoaded, setDemoLoaded] = React.useState(isSampleDataLoaded());

  const handleLoadDemoData = async () => {
    setLoadingDemo(true);
    try {
      const data = generateSampleData({
        companies: 8,
        contactsPerCompany: 3,
        leads: 15,
        dealsPerContact: 1,
        activitiesPerContact: 4,
        tasks: 12,
      });
      storeSampleData(data);
      setDemoLoaded(true);
    } catch {
      console.error('Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  const actions = [
    {
      id: 'demo',
      icon: Database,
      title: 'Load Demo Data',
      description: 'Explore with sample contacts, deals, and activities',
      color: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
      special: true
    },
    {
      id: 'import',
      icon: Users,
      title: 'Import Contacts',
      description: 'Upload your existing contacts from CSV or connect your email',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'team',
      icon: Building2,
      title: 'Invite Team Members',
      description: 'Add your colleagues to collaborate on deals',
      color: 'bg-[#93C01F]/20 text-[#93C01F]'
    },
    {
      id: 'email',
      icon: Mail,
      title: 'Connect Email',
      description: 'Sync your email for automatic activity tracking',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'calendar',
      icon: Calendar,
      title: 'Connect Calendar',
      description: 'Sync meetings and schedule activities',
      color: 'bg-[#EAD07D]/20 text-[#1A1A1A]'
    }
  ];

  return (
    <div className="py-6">
      <h2 className="text-2xl font-light text-[#1A1A1A] mb-2">Get started quickly</h2>
      <p className="text-[#666] mb-6">Choose what you'd like to do first (you can skip for now)</p>

      <div className="grid grid-cols-2 gap-4">
        {actions.map(action => {
          // Special handling for demo data action
          if (action.id === 'demo') {
            return (
              <button
                key={action.id}
                onClick={handleLoadDemoData}
                disabled={loadingDemo || demoLoaded}
                className={`p-4 rounded-xl transition-colors text-left group ${
                  demoLoaded
                    ? 'bg-[#93C01F]/10 border border-[#93C01F]/30'
                    : 'bg-[#F8F8F6] hover:bg-[#F0EBD8]'
                } ${loadingDemo ? 'opacity-70 cursor-wait' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl ${demoLoaded ? 'bg-[#93C01F]/20' : action.color} flex items-center justify-center mb-3`}>
                  {demoLoaded ? (
                    <Check className="w-5 h-5 text-[#93C01F]" />
                  ) : (
                    <action.icon className="w-5 h-5" />
                  )}
                </div>
                <h3 className="font-medium text-[#1A1A1A] mb-1">{action.title}</h3>
                <p className="text-xs text-[#666]">{action.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm text-[#999] group-hover:text-[#1A1A1A]">
                  {loadingDemo ? (
                    <span>Loading...</span>
                  ) : demoLoaded ? (
                    <span className="text-[#93C01F]">Demo data loaded!</span>
                  ) : (
                    <>
                      <span>Load data</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>
            );
          }

          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors text-left group"
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5" />
              </div>
              <h3 className="font-medium text-[#1A1A1A] mb-1">{action.title}</h3>
              <p className="text-xs text-[#666]">{action.description}</p>
              <div className="mt-3 flex items-center gap-1 text-sm text-[#999] group-hover:text-[#1A1A1A]">
                <span>Set up</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Step 5: All Done
const AllDoneStep: React.FC = () => (
  <div className="text-center py-8">
    <div className="w-20 h-20 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-6">
      <Check className="w-10 h-10 text-[#93C01F]" />
    </div>
    <h2 className="text-3xl font-light text-[#1A1A1A] mb-3">
      You're all set!
    </h2>
    <p className="text-[#666] max-w-md mx-auto mb-8">
      Your workspace is ready. Start by adding your first contact or exploring the dashboard.
    </p>
    <div className="flex items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-sm text-[#666]">
        <div className="w-6 h-6 rounded-full bg-[#EAD07D]/20 flex items-center justify-center">
          <span className="text-xs font-bold">?</span>
        </div>
        <span>Need help? Press <kbd className="px-1.5 py-0.5 bg-[#F8F8F6] rounded text-xs font-mono">?</kbd> anytime</span>
      </div>
    </div>
  </div>
);

interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [companyData, setCompanyData] = useState({
    industry: '',
    teamSize: '',
    goals: [] as string[]
  });

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with SalesOS',
      icon: <Sparkles className="w-5 h-5" />,
      component: <WelcomeStep userName={user?.name} />
    },
    {
      id: 'profile',
      title: 'Your Business',
      description: 'Tell us about your company',
      icon: <Building2 className="w-5 h-5" />,
      component: <CompanyProfileStep data={companyData} onChange={setCompanyData} />
    },
    {
      id: 'features',
      title: 'Features',
      description: 'See what you can do',
      icon: <Target className="w-5 h-5" />,
      component: <FeatureTourStep />
    },
    {
      id: 'actions',
      title: 'Quick Start',
      description: 'Get started quickly',
      icon: <Zap className="w-5 h-5" />,
      component: <QuickActionsStep onAction={handleQuickAction} />
    },
    {
      id: 'done',
      title: 'Done',
      description: 'You are all set',
      icon: <Check className="w-5 h-5" />,
      component: <AllDoneStep />
    }
  ];

  useEffect(() => {
    const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY);
    if (savedStep) {
      const stepIndex = parseInt(savedStep, 10);
      if (stepIndex >= 0 && stepIndex < steps.length) {
        setCurrentStep(stepIndex);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_STEP_KEY, currentStep.toString());
  }, [currentStep]);

  function handleQuickAction(action: string) {
    // Navigate to relevant page after completing onboarding
    const routes: Record<string, string> = {
      import: '/dashboard/contacts',
      team: '/dashboard/team',
      email: '/dashboard/integrations',
      calendar: '/dashboard/integrations'
    };

    handleComplete();
    if (routes[action]) {
      navigate(routes[action]);
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    onSkip?.();
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              {steps[currentStep].icon}
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">{steps[currentStep].title}</h3>
              <p className="text-xs text-[#666]">Step {currentStep + 1} of {steps.length}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-[#666] hover:text-[#1A1A1A] transition-colors"
            title="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#F0EBD8]">
          <div
            className="h-full bg-[#EAD07D] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {steps[currentStep].component}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              currentStep === 0
                ? 'text-[#999] cursor-not-allowed'
                : 'text-[#666] hover:bg-[#F8F8F6]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-[#1A1A1A]'
                    : index < currentStep
                    ? 'bg-[#93C01F]'
                    : 'bg-[#F0EBD8]'
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#93C01F] text-white rounded-full text-sm font-medium hover:bg-[#7BA019] transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook to check and manage onboarding state
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    const shouldShow = !completed;
    setIsCompleted(!!completed);
    setShowOnboarding(shouldShow);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    setIsCompleted(true);
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    setIsCompleted(false);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isCompleted,
    completeOnboarding,
    resetOnboarding,
    setShowOnboarding
  };
}

export default OnboardingWizard;

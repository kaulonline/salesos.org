import React, { useState } from 'react';
import { Wifi, WifiOff, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { enrichmentApi, EnrichmentProvider } from '../../api/enrichment';

type IntegrationType = 'openai' | 'anthropic' | 'zoominfo' | 'apollo' | 'clearbit';

interface TestResult {
  success: boolean;
  provider: string;
  latencyMs: number;
  message: string;
  error?: string;
}

interface TestConnectionButtonProps {
  integrationType: IntegrationType;
  onResult?: (result: TestResult) => void;
  className?: string;
  variant?: 'button' | 'icon';
}

export const TestConnectionButton: React.FC<TestConnectionButtonProps> = ({
  integrationType,
  onResult,
  className = '',
  variant = 'button',
}) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      let testResult: TestResult;

      // AI providers
      if (integrationType === 'openai' || integrationType === 'anthropic') {
        const response = await aiApi.testProvider(integrationType);
        testResult = {
          success: response.success,
          provider: response.provider,
          latencyMs: response.latencyMs,
          message: response.message,
          error: response.error,
        };
      }
      // Enrichment providers
      else {
        const provider = integrationType as EnrichmentProvider;
        const response = await enrichmentApi.testProvider(provider);
        testResult = {
          success: response.success,
          provider: response.provider,
          latencyMs: response.latencyMs,
          message: response.message,
          error: response.error,
        };
      }

      setResult(testResult);
      if (onResult) {
        onResult(testResult);
      }
    } catch (error: any) {
      const errorResult: TestResult = {
        success: false,
        provider: integrationType,
        latencyMs: 0,
        message: 'Connection test failed',
        error: error.response?.data?.message || error.message || 'Unknown error',
      };
      setResult(errorResult);
      if (onResult) {
        onResult(errorResult);
      }
    } finally {
      setTesting(false);
    }
  };

  const getProviderLabel = (type: IntegrationType): string => {
    switch (type) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Claude';
      case 'zoominfo':
        return 'ZoomInfo';
      case 'apollo':
        return 'Apollo';
      case 'clearbit':
        return 'Clearbit';
      default:
        return type;
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleTest}
        disabled={testing}
        className={`p-2 rounded-lg transition-colors ${
          result?.success
            ? 'text-[#93C01F] bg-[#93C01F]/10 hover:bg-[#93C01F]/20'
            : result?.success === false
            ? 'text-red-500 bg-red-50 hover:bg-red-100'
            : 'text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
        } ${className}`}
        title={result ? result.message : `Test ${getProviderLabel(integrationType)} connection`}
      >
        {testing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : result?.success ? (
          <CheckCircle size={18} />
        ) : result?.success === false ? (
          <XCircle size={18} />
        ) : (
          <Wifi size={18} />
        )}
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={handleTest}
        disabled={testing}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          result?.success
            ? 'bg-[#93C01F]/20 text-[#93C01F] border border-[#93C01F]/30'
            : result?.success === false
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-[#F8F8F6] text-[#666] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] border border-black/5'
        }`}
      >
        {testing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Testing...
          </>
        ) : result?.success ? (
          <>
            <CheckCircle size={16} />
            Connected
          </>
        ) : result?.success === false ? (
          <>
            <XCircle size={16} />
            Failed
          </>
        ) : (
          <>
            <Wifi size={16} />
            Test Connection
          </>
        )}
      </button>

      {/* Result details */}
      {result && (
        <div
          className={`mt-2 p-3 rounded-lg text-sm ${
            result.success ? 'bg-[#93C01F]/10 text-[#666]' : 'bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{result.message}</span>
            {result.latencyMs > 0 && (
              <span className="flex items-center gap-1 text-xs opacity-70">
                <Clock size={12} />
                {result.latencyMs}ms
              </span>
            )}
          </div>
          {result.error && <p className="text-xs opacity-80 mt-1">{result.error}</p>}
        </div>
      )}
    </div>
  );
};

// Bulk test component for testing all providers at once
interface TestAllConnectionsButtonProps {
  category: 'ai' | 'enrichment';
  onComplete?: (results: TestResult[]) => void;
  className?: string;
}

export const TestAllConnectionsButton: React.FC<TestAllConnectionsButtonProps> = ({
  category,
  onComplete,
  className = '',
}) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const handleTestAll = async () => {
    setTesting(true);
    setResults([]);

    try {
      if (category === 'ai') {
        const response = await aiApi.testConnection();
        const testResults: TestResult[] = [
          {
            success: response.success,
            provider: response.provider,
            latencyMs: response.latencyMs,
            message: response.message,
            error: response.error,
          },
        ];
        setResults(testResults);
        if (onComplete) onComplete(testResults);
      } else {
        const response = await enrichmentApi.testConnection();
        setResults(response.results);
        if (onComplete) onComplete(response.results);
      }
    } catch (error: any) {
      const errorResult: TestResult = {
        success: false,
        provider: category,
        latencyMs: 0,
        message: 'Connection test failed',
        error: error.response?.data?.message || error.message,
      };
      setResults([errorResult]);
      if (onComplete) onComplete([errorResult]);
    } finally {
      setTesting(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className={className}>
      <button
        onClick={handleTestAll}
        disabled={testing}
        className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
      >
        {testing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Testing All...
          </>
        ) : (
          <>
            <Wifi size={16} />
            Test All {category === 'ai' ? 'AI' : 'Enrichment'} Connections
          </>
        )}
      </button>

      {/* Results summary */}
      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-4 text-sm">
            {successCount > 0 && (
              <span className="flex items-center gap-1 text-[#93C01F]">
                <CheckCircle size={14} />
                {successCount} connected
              </span>
            )}
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <XCircle size={14} />
                {failCount} failed
              </span>
            )}
          </div>

          {/* Individual results */}
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm flex items-center justify-between ${
                  result.success ? 'bg-[#93C01F]/10' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle size={16} className="text-[#93C01F]" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <span className={result.success ? 'text-[#666]' : 'text-red-700'}>
                    {result.provider}: {result.message}
                  </span>
                </div>
                {result.latencyMs > 0 && (
                  <span className="text-xs text-[#999]">{result.latencyMs}ms</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestConnectionButton;

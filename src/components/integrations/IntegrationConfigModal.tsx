import React, { useState, useEffect } from 'react';
import { X, Key, Link, Settings, Loader2, ExternalLink, Eye, EyeOff, CheckCircle2, Wifi, CheckCircle, XCircle, Clock } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { enrichmentApi, EnrichmentProvider } from '../../api/enrichment';
import { thirdPartyIntegrationsApi, IntegrationType } from '../../api/integrations';

export type ConfigType = 'api_key' | 'webhook' | 'oauth' | 'multi_field';

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder: string;
  required: boolean;
  helpText?: string;
}

export interface IntegrationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  integration: {
    id: string;
    name: string;
    logo: string;
    configType: ConfigType;
    fields?: ConfigField[];
    oauthMessage?: string;
    docsUrl?: string;
  };
  /** If provided, shows existing config for editing */
  existingConfig?: Record<string, string>;
  /** True if editing an existing integration */
  isEditing?: boolean;
  /** Audit: Who configured this integration */
  configuredBy?: { id: string; name: string; email: string } | null;
  /** Audit: When was this integration configured */
  configuredAt?: string | null;
}

// Default field configurations for different integration types
const getDefaultFields = (integrationId: string): ConfigField[] => {
  switch (integrationId) {
    // API Key integrations
    case 'openai':
      return [{
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-...',
        required: true,
        helpText: 'Get your API key from platform.openai.com/api-keys'
      }];
    case 'anthropic':
      return [{
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-ant-...',
        required: true,
        helpText: 'Get your API key from console.anthropic.com'
      }];
    case 'apollo':
      return [{
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Apollo API key',
        required: true,
        helpText: 'Find your API key in Apollo Settings > Integrations > API'
      }];
    case 'clearbit':
      return [{
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk_...',
        required: true,
        helpText: 'Get your API key from clearbit.com/docs'
      }];
    case 'zoominfo':
      return [{
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your ZoomInfo API key',
        required: true,
        helpText: 'Contact ZoomInfo support to get API access'
      }];
    case 'snowflake':
      return [
        { name: 'account', label: 'Account Identifier', type: 'text', placeholder: 'your-account.snowflakecomputing.com', required: true },
        { name: 'username', label: 'Username', type: 'text', placeholder: 'Enter username', required: true },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Enter password', required: true },
        { name: 'warehouse', label: 'Warehouse', type: 'text', placeholder: 'COMPUTE_WH', required: true },
        { name: 'database', label: 'Database', type: 'text', placeholder: 'Enter database name', required: true },
      ];
    case 'segment':
      return [{
        name: 'writeKey',
        label: 'Write Key',
        type: 'password',
        placeholder: 'Enter your Segment write key',
        required: true,
        helpText: 'Find your write key in Segment Sources > Settings > API Keys'
      }];

    // OAuth integrations - require Client ID and Secret
    case 'slack':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Slack Client ID', required: true, helpText: 'From api.slack.com/apps > Your App > Basic Information' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Slack Client Secret', required: true },
      ];
    case 'hubspot':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter HubSpot Client ID', required: true, helpText: 'From developers.hubspot.com > Your App > Auth' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter HubSpot Client Secret', required: true },
      ];
    case 'salesforce':
      return [
        { name: 'clientId', label: 'Consumer Key', type: 'text', placeholder: 'Enter Salesforce Consumer Key', required: true, helpText: 'From Setup > App Manager > Your Connected App' },
        { name: 'clientSecret', label: 'Consumer Secret', type: 'password', placeholder: 'Enter Salesforce Consumer Secret', required: true },
      ];
    case 'zoom':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Zoom Client ID', required: true, helpText: 'From marketplace.zoom.us > Your App > App Credentials' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Zoom Client Secret', required: true },
      ];
    case 'teams':
      return [
        { name: 'clientId', label: 'Application ID', type: 'text', placeholder: 'Enter Microsoft App ID', required: true, helpText: 'From Azure Portal > App Registrations' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret', required: true },
      ];
    case 'intercom':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Intercom Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Intercom Client Secret', required: true },
      ];
    case 'linkedin':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter LinkedIn Client ID', required: true, helpText: 'From LinkedIn Developer Portal' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter LinkedIn Client Secret', required: true },
      ];
    case 'gong':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Gong Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Gong Client Secret', required: true },
      ];
    case 'stripe':
      return [
        { name: 'apiKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...', required: true, helpText: 'From Stripe Dashboard > Developers > API keys' },
      ];
    case 'quickbooks':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter QuickBooks Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter QuickBooks Client Secret', required: true },
      ];
    case 'xero':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Xero Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Xero Client Secret', required: true },
      ];
    case 'docusign':
      return [
        { name: 'clientId', label: 'Integration Key', type: 'text', placeholder: 'Enter DocuSign Integration Key', required: true },
        { name: 'clientSecret', label: 'Secret Key', type: 'password', placeholder: 'Enter DocuSign Secret Key', required: true },
      ];
    case 'pandadoc':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter PandaDoc Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter PandaDoc Client Secret', required: true },
      ];
    case 'dropbox':
      return [
        { name: 'clientId', label: 'App Key', type: 'text', placeholder: 'Enter Dropbox App Key', required: true },
        { name: 'clientSecret', label: 'App Secret', type: 'password', placeholder: 'Enter Dropbox App Secret', required: true },
      ];
    case 'gdrive':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Google Client ID', required: true, helpText: 'From Google Cloud Console > Credentials' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Google Client Secret', required: true },
      ];
    case 'calendly':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Calendly Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Calendly Client Secret', required: true },
      ];
    case 'okta':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Okta Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Okta Client Secret', required: true },
        { name: 'baseUrl', label: 'Okta Domain', type: 'url', placeholder: 'https://your-domain.okta.com', required: true },
      ];
    case 'auth0':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Auth0 Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Auth0 Client Secret', required: true },
        { name: 'baseUrl', label: 'Auth0 Domain', type: 'url', placeholder: 'https://your-tenant.auth0.com', required: true },
      ];

    // Email integrations
    case 'gmail':
    case 'email-gmail':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Google Client ID', required: true, helpText: 'From Google Cloud Console > APIs & Services > Credentials' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Google Client Secret', required: true },
      ];
    case 'outlook':
    case 'email-outlook':
      return [
        { name: 'clientId', label: 'Application ID', type: 'text', placeholder: 'Enter Microsoft Application ID', required: true, helpText: 'From Azure Portal > App Registrations' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Microsoft Client Secret', required: true },
      ];

    // Calendar integrations
    case 'google-calendar':
    case 'calendar-google':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Google Client ID', required: true, helpText: 'From Google Cloud Console > APIs & Services > Credentials' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Google Client Secret', required: true },
      ];
    case 'outlook-calendar':
    case 'calendar-outlook':
      return [
        { name: 'clientId', label: 'Application ID', type: 'text', placeholder: 'Enter Microsoft Application ID', required: true, helpText: 'From Azure Portal > App Registrations' },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Microsoft Client Secret', required: true },
      ];

    // Webhook integrations
    case 'zapier':
      return [{
        name: 'webhookUrl',
        label: 'Webhook URL',
        type: 'url',
        placeholder: 'https://hooks.zapier.com/hooks/catch/...',
        required: true,
        helpText: 'Create a Zap with "Webhooks by Zapier" trigger to get your URL'
      }];
    case 'make':
      return [{
        name: 'webhookUrl',
        label: 'Webhook URL',
        type: 'url',
        placeholder: 'https://hook.make.com/...',
        required: true,
        helpText: 'Create a scenario with Webhook trigger to get your URL'
      }];

    // Multi-field integrations
    case 'marketo':
      return [
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret', required: true },
        { name: 'munchkinId', label: 'Munchkin ID', type: 'text', placeholder: 'xxx-xxx-xxx', required: true, helpText: 'Found in Admin > Munchkin' },
      ];
    case 'looker':
      return [
        { name: 'baseUrl', label: 'Looker URL', type: 'url', placeholder: 'https://your-instance.looker.com', required: true },
        { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter Client ID', required: true },
        { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter Client Secret', required: true },
      ];

    default:
      return [{
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your API key',
        required: true
      }];
  }
};

const getDocsUrl = (integrationId: string): string | undefined => {
  const docsUrls: Record<string, string> = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    apollo: 'https://knowledge.apollo.io/hc/en-us/articles/4415741072141-How-Do-I-Find-My-API-Key',
    clearbit: 'https://dashboard.clearbit.com/api',
    zoominfo: 'https://api-docs.zoominfo.com/',
    snowflake: 'https://docs.snowflake.com/en/user-guide/admin-account-identifier',
    segment: 'https://segment.com/docs/connections/sources/',
    zapier: 'https://zapier.com/apps/webhook/integrations',
    make: 'https://www.make.com/en/help/tools/webhooks',
    marketo: 'https://developers.marketo.com/rest-api/',
    looker: 'https://cloud.google.com/looker/docs/api-auth',
    // OAuth integrations
    slack: 'https://api.slack.com/apps',
    hubspot: 'https://developers.hubspot.com/docs/api/private-apps',
    salesforce: 'https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm',
    zoom: 'https://marketplace.zoom.us/docs/guides/build/oauth-app',
    teams: 'https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app',
    intercom: 'https://developers.intercom.com/docs/build-an-integration/learn-more/authentication',
    linkedin: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow',
    gong: 'https://help.gong.io/hc/en-us/articles/360042391012-API-Authentication',
    stripe: 'https://stripe.com/docs/keys',
    quickbooks: 'https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization',
    xero: 'https://developer.xero.com/documentation/guides/oauth2/overview',
    docusign: 'https://developers.docusign.com/platform/auth/authcode/',
    pandadoc: 'https://developers.pandadoc.com/docs/authentication',
    dropbox: 'https://www.dropbox.com/developers/apps',
    gdrive: 'https://console.cloud.google.com/apis/credentials',
    calendly: 'https://developer.calendly.com/api-docs/YXBpOjM0NTk1-calendly-api',
    okta: 'https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/',
    auth0: 'https://auth0.com/docs/get-started/applications',
    // Email/Calendar integrations
    gmail: 'https://console.cloud.google.com/apis/credentials',
    'email-gmail': 'https://console.cloud.google.com/apis/credentials',
    outlook: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    'email-outlook': 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    'google-calendar': 'https://console.cloud.google.com/apis/credentials',
    'calendar-google': 'https://console.cloud.google.com/apis/credentials',
    'outlook-calendar': 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    'calendar-outlook': 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
  };
  return docsUrls[integrationId];
};

export const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  integration,
  existingConfig,
  isEditing = false,
  configuredBy,
  configuredAt,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const fields = integration.fields || getDefaultFields(integration.id);
  const docsUrl = integration.docsUrl || getDocsUrl(integration.id);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens, optionally pre-fill with existing config
      if (existingConfig && isEditing) {
        // Pre-fill with existing values (these are masked for display, user can type new values)
        setValues(existingConfig);
      } else {
        setValues({});
      }
      setErrors({});
      setShowPasswords({});
      setTestResult(null);
      setSavedSuccessfully(false);
    }
  }, [isOpen, existingConfig, isEditing]);

  // All integrations support testing via the generic test endpoint
  const canTest = true;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // AI providers - use specialized endpoint for richer results
      if (integration.id === 'openai' || integration.id === 'anthropic') {
        const response = await aiApi.testProvider(integration.id as 'openai' | 'anthropic');
        setTestResult({
          success: response.success,
          message: response.message,
          latencyMs: response.latencyMs,
        });
      }
      // Enrichment providers - use specialized endpoint for richer results
      else if (['zoominfo', 'apollo', 'clearbit'].includes(integration.id)) {
        const provider = integration.id as EnrichmentProvider;
        const response = await enrichmentApi.testProvider(provider);
        setTestResult({
          success: response.success,
          message: response.message,
          latencyMs: response.latencyMs,
        });
      }
      // All other integrations - use generic test endpoint
      else {
        const response = await thirdPartyIntegrationsApi.testConnection(integration.id as IntegrationType);
        setTestResult({
          success: response.success,
          message: response.message,
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  const handleChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = (name: string) => {
    setShowPasswords(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = values[field.name]?.trim();
      // In edit mode, if value contains "..." it means it's a masked existing value - skip required validation
      const isMaskedValue = isEditing && value?.includes('...');

      if (field.required && !value && !isMaskedValue) {
        newErrors[field.name] = `${field.label} is required`;
      } else if (field.type === 'url' && value && !isMaskedValue) {
        try {
          new URL(value);
        } catch {
          newErrors[field.name] = 'Please enter a valid URL';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      setSavedSuccessfully(true);
      setTestResult(null);
      // Don't close modal immediately if we can test - let user test first
      if (!canTest) {
        onClose();
      }
    } catch (error: any) {
      setErrors({ _form: error.message || 'Failed to save configuration' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = () => {
    switch (integration.configType) {
      case 'api_key': return <Key size={20} />;
      case 'webhook': return <Link size={20} />;
      default: return <Settings size={20} />;
    }
  };

  const getTitle = () => {
    if (isEditing) {
      return 'Update Configuration';
    }
    switch (integration.configType) {
      case 'api_key': return 'Enter API Key';
      case 'webhook': return 'Configure Webhook';
      default: return 'Configure Integration';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center overflow-hidden">
              <img
                src={integration.logo}
                alt={integration.name}
                className="w-8 h-8 object-contain"
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(integration.name)}&background=EAD07D&color=1A1A1A&size=64`; }}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A1A1A]">{integration.name}</h2>
              <p className="text-sm text-[#666]">{getTitle()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {errors._form && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {errors._form}
            </div>
          )}

          {isEditing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
              <strong>Editing mode:</strong> Existing values are masked for security. Enter the full new value to update a field, or leave unchanged to keep the current value.
            </div>
          )}

          {/* Audit Information - shows who configured this integration */}
          {isEditing && (configuredBy || configuredAt) && (
            <div className="mb-4 p-3 bg-[#F8F8F6] border border-gray-200 rounded-xl text-sm">
              <div className="flex items-center gap-2 text-[#666]">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>
                  {configuredBy ? (
                    <>Configured by <strong className="text-[#1A1A1A]">{configuredBy.name}</strong> ({configuredBy.email})</>
                  ) : (
                    <>Configured by <strong className="text-[#1A1A1A]">Unknown</strong></>
                  )}
                </span>
              </div>
              {configuredAt && (
                <div className="flex items-center gap-2 text-[#999] mt-1 ml-5">
                  <span>on {new Date(configuredAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={field.type === 'password' && !showPasswords[field.name] ? 'password' : 'text'}
                    value={values[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors[field.name]
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-[#EAD07D] focus:ring-[#EAD07D]/20'
                    } focus:ring-2 outline-none transition-all text-sm ${
                      field.type === 'password' ? 'pr-12 font-mono' : ''
                    }`}
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(field.name)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#999] hover:text-[#666]"
                    >
                      {showPasswords[field.name] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
                {errors[field.name] && (
                  <p className="mt-1 text-xs text-red-500">{errors[field.name]}</p>
                )}
                {field.helpText && !errors[field.name] && (
                  <p className="mt-1 text-xs text-[#999]">{field.helpText}</p>
                )}
              </div>
            ))}
          </div>

          {/* Docs Link */}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-4 text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
            >
              <ExternalLink size={14} />
              View {integration.name} documentation
            </a>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={`mt-4 p-3 rounded-xl text-sm ${
                testResult.success
                  ? 'bg-[#93C01F]/10 border border-[#93C01F]/30'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle size={16} className="text-[#93C01F]" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <span className={testResult.success ? 'text-[#666]' : 'text-red-700'}>
                    {testResult.message}
                  </span>
                </div>
                {testResult.latencyMs && (
                  <span className="flex items-center gap-1 text-xs text-[#999]">
                    <Clock size={12} />
                    {testResult.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {savedSuccessfully && canTest && !testResult && (
            <div className="mt-4 p-3 bg-[#93C01F]/10 border border-[#93C01F]/30 rounded-xl text-sm">
              <div className="flex items-center gap-2 text-[#666]">
                <CheckCircle size={16} className="text-[#93C01F]" />
                Configuration saved! Click "Test Connection" to verify it works.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-[#666] rounded-xl font-medium hover:bg-[#F8F8F6] transition-colors"
            >
              {savedSuccessfully ? 'Done' : 'Cancel'}
            </button>

            {/* Test Connection Button - show after save or always for testable integrations */}
            {canTest && savedSuccessfully && (
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  testResult?.success
                    ? 'bg-[#93C01F] text-white hover:bg-[#84ab1c]'
                    : testResult?.success === false
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-50`}
              >
                {isTesting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Testing...
                  </>
                ) : testResult?.success ? (
                  <>
                    <CheckCircle size={16} />
                    Connected!
                  </>
                ) : testResult?.success === false ? (
                  <>
                    <XCircle size={16} />
                    Retry Test
                  </>
                ) : (
                  <>
                    <Wifi size={16} />
                    Test Connection
                  </>
                )}
              </button>
            )}

            {/* Save/Connect Button - hide after successful save for testable integrations */}
            {(!savedSuccessfully || !canTest) && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {isEditing ? 'Update' : (canTest ? 'Save & Test' : 'Connect')}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default IntegrationConfigModal;

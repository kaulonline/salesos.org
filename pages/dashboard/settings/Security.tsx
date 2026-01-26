import React, { useState } from 'react';
import {
  Shield,
  Smartphone,
  Key,
  Lock,
  Unlock,
  X,
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  Trash2,
  Monitor,
  Globe,
  Clock,
  QrCode,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmationModal } from '../../../src/components/ui/ConfirmationModal';
import { useTwoFactorStatus, useTwoFactorSetup, useTrustedDevices, useBackupCodes } from '../../../src/hooks/useTwoFactor';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  setupData: { qrCode: string; secret: string; backupCodes: string[] } | null;
  onVerify: (code: string) => Promise<void>;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, setupData, onVerify }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onVerify(code);
      setStep('backup');
    } catch (err) {
      setError((err as Error).message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    setStep('qr');
    setCopiedCodes(false);
    onClose();
  };

  if (!isOpen || !setupData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">
            {step === 'qr' && 'Scan QR Code'}
            {step === 'verify' && 'Verify Code'}
            {step === 'backup' && 'Save Backup Codes'}
          </h2>
          <button onClick={handleClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 pt-6">
          {step === 'qr' && (
            <>
              <div className="text-center mb-6">
                <p className="text-[#666] text-sm">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6">
                <p className="text-xs text-[#666] mb-2">Can't scan? Enter this code manually:</p>
                <code className="text-sm font-mono text-[#1A1A1A] break-all">{setupData.secret}</code>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
              >
                Continue
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="text-center mb-6">
                <p className="text-[#666] text-sm">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-4 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-center text-2xl font-mono tracking-widest"
                maxLength={6}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('qr')}
                  className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleVerify}
                  disabled={loading || code.length !== 6}
                  className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </>
          )}

          {step === 'backup' && (
            <>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-yellow-800 font-medium text-sm">Save these backup codes</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Each code can only be used once. Store them somewhere safe.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#F8F8F6] rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono text-[#1A1A1A] py-1">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <button
                onClick={copyBackupCodes}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors mb-6"
              >
                {copiedCodes ? <Check size={18} /> : <Copy size={18} />}
                {copiedCodes ? 'Copied!' : 'Copy Codes'}
              </button>

              <button
                onClick={handleClose}
                className="w-full px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface BackupCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  codes: { code: string; usedAt: string | null }[];
  onRegenerate: (password: string) => Promise<void>;
}

const BackupCodesModal: React.FC<BackupCodesModalProps> = ({ isOpen, onClose, codes, onRegenerate }) => {
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);

  const availableCodes = codes.filter(c => !c.usedAt);
  const usedCodes = codes.filter(c => c.usedAt);

  const handleCopy = () => {
    navigator.clipboard.writeText(availableCodes.map(c => c.code).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    const password = prompt('Enter your password to regenerate backup codes:');
    if (!password) return;
    setPendingPassword(password);
    setShowRegenerateConfirm(true);
  };

  const confirmRegenerate = async () => {
    if (!pendingPassword) return;
    setShowRegenerateConfirm(false);
    setRegenerating(true);
    try {
      await onRegenerate(pendingPassword);
    } finally {
      setRegenerating(false);
      setPendingPassword(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">Backup Codes</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 pt-6">
          <p className="text-[#666] text-sm mb-4">
            {availableCodes.length} of {codes.length} codes remaining
          </p>

          <div className="bg-[#F8F8F6] rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-2">
              {codes.map((item, i) => (
                <code
                  key={i}
                  className={`text-sm font-mono py-1 ${
                    item.usedAt ? 'text-[#999] line-through' : 'text-[#1A1A1A]'
                  }`}
                >
                  {item.code}
                </code>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy Available'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={regenerating ? 'animate-spin' : ''} />
              Regenerate
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showRegenerateConfirm}
        onClose={() => {
          setShowRegenerateConfirm(false);
          setPendingPassword(null);
        }}
        onConfirm={confirmRegenerate}
        title="Regenerate Backup Codes"
        message="This will invalidate all existing backup codes. Make sure to save the new codes in a secure location."
        confirmLabel="Regenerate"
        variant="warning"
        loading={regenerating}
      />
    </div>
  );
};

export default function SecurityPage() {
  const { status, loading } = useTwoFactorStatus();
  const { setup, verifySetup, disable } = useTwoFactorSetup();
  const { devices, remove: removeDevice } = useTrustedDevices();
  const { codes, regenerate } = useBackupCodes();

  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string; backupCodes: string[] } | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'disable2fa' | 'removeDevice' | null;
    deviceId?: string;
    password?: string;
  }>({ isOpen: false, type: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleSetup = async () => {
    try {
      const data = await setup();
      setSetupData(data);
      setShowSetupModal(true);
    } catch (err) {
      console.error('Failed to initiate 2FA setup:', err);
    }
  };

  const handleVerify = async (code: string) => {
    await verifySetup({ code });
    setSetupData(null);
  };

  const handleDisable = () => {
    const password = prompt('Enter your password to disable 2FA:');
    if (!password) return;
    setConfirmModal({ isOpen: true, type: 'disable2fa', password });
  };

  const handleRemoveDevice = (deviceId: string) => {
    setConfirmModal({ isOpen: true, type: 'removeDevice', deviceId });
  };

  const handleConfirmAction = async () => {
    setConfirmLoading(true);
    try {
      if (confirmModal.type === 'disable2fa' && confirmModal.password) {
        setDisabling(true);
        await disable({ password: confirmModal.password });
        setDisabling(false);
      } else if (confirmModal.type === 'removeDevice' && confirmModal.deviceId) {
        await removeDevice(confirmModal.deviceId);
      }
    } catch (err) {
      console.error('Failed to complete action:', err);
    } finally {
      setConfirmLoading(false);
      setConfirmModal({ isOpen: false, type: null });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Security Settings</h1>
        <p className="text-[#666] mt-1">Manage your account security and authentication</p>
      </div>

      {/* 2FA Status Card */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              status?.enabled ? 'bg-green-100' : 'bg-[#F8F8F6]'
            }`}>
              {status?.enabled ? (
                <Lock size={24} className="text-green-600" />
              ) : (
                <Unlock size={24} className="text-[#666]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-[#1A1A1A]">Two-Factor Authentication</h3>
                <Badge variant={status?.enabled ? 'green' : 'neutral'} size="sm">
                  {status?.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-[#666] text-sm mt-1">
                {status?.enabled
                  ? 'Your account is protected with two-factor authentication.'
                  : 'Add an extra layer of security by requiring a verification code when signing in.'}
              </p>
              {status?.enabled && status.enabledAt && (
                <p className="text-xs text-[#888] mt-2">
                  Enabled on {new Date(status.enabledAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {status?.enabled ? (
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {disabling ? 'Disabling...' : 'Disable'}
              </button>
            ) : (
              <button
                onClick={handleSetup}
                className="px-4 py-2 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors text-sm font-medium"
              >
                Enable 2FA
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Backup Codes */}
      {status?.enabled && (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <Key size={24} className="text-[#1A1A1A]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#1A1A1A]">Backup Codes</h3>
                <p className="text-[#666] text-sm mt-1">
                  Use backup codes to access your account if you lose your authenticator device.
                </p>
                {codes && (
                  <p className="text-xs text-[#888] mt-2">
                    {codes.filter(c => !c.usedAt).length} of {codes.length} codes available
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowBackupModal(true)}
              className="px-4 py-2 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              View Codes
            </button>
          </div>
        </Card>
      )}

      {/* Trusted Devices */}
      {status?.enabled && (
        <Card className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Smartphone size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#1A1A1A]">Trusted Devices</h3>
                <p className="text-[#666] text-sm">Devices that don't require 2FA verification</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : devices && devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map(device => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                      {device.deviceType === 'mobile' ? (
                        <Smartphone size={20} className="text-[#666]" />
                      ) : (
                        <Monitor size={20} className="text-[#666]" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#1A1A1A] text-sm">{device.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[#888] mt-0.5">
                        <Globe size={12} />
                        <span>{device.location || 'Unknown location'}</span>
                        <span>·</span>
                        <Clock size={12} />
                        <span>Last used {new Date(device.lastUsed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDevice(device.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 text-[#888] mx-auto mb-3" />
              <p className="text-[#666] text-sm">No trusted devices</p>
            </div>
          )}
        </Card>
      )}

      {/* Security Tips */}
      <Card className="p-6 bg-[#F8F8F6]">
        <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Security Tips</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-sm text-[#666]">
            <Check size={18} className="text-green-500 shrink-0 mt-0.5" />
            <span>Use a strong, unique password that you don't use elsewhere</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-[#666]">
            <Check size={18} className="text-green-500 shrink-0 mt-0.5" />
            <span>Enable two-factor authentication for additional security</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-[#666]">
            <Check size={18} className="text-green-500 shrink-0 mt-0.5" />
            <span>Keep your backup codes in a safe place</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-[#666]">
            <Check size={18} className="text-green-500 shrink-0 mt-0.5" />
            <span>Regularly review your trusted devices and remove any you don't recognize</span>
          </li>
        </ul>
      </Card>

      <SetupModal
        isOpen={showSetupModal}
        onClose={() => {
          setShowSetupModal(false);
          setSetupData(null);
        }}
        setupData={setupData}
        onVerify={handleVerify}
      />

      {codes && (
        <BackupCodesModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          codes={codes}
          onRegenerate={regenerate}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null })}
        onConfirm={handleConfirmAction}
        title={confirmModal.type === 'disable2fa' ? 'Disable Two-Factor Authentication' : 'Remove Trusted Device'}
        message={confirmModal.type === 'disable2fa'
          ? 'Are you sure you want to disable two-factor authentication? This will make your account less secure.'
          : 'Are you sure you want to remove this device from trusted devices?'}
        confirmLabel={confirmModal.type === 'disable2fa' ? 'Disable' : 'Remove'}
        variant="warning"
        loading={confirmLoading}
      />
    </div>
  );
}

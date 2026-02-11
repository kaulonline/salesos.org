import React, { useState, useRef } from 'react';
import { User, Bell, Shield, Key, Camera, Save, Loader2, Check, AlertCircle, LayoutGrid } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import {
  useUserProfile,
  useEmailPreferences,
  usePasswordChange,
} from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import { MenuCustomization } from '../../src/components/settings/MenuCustomization';
import { useToast } from '../../src/components/ui/Toast';

type TabType = 'profile' | 'notifications' | 'security' | 'menu';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile hooks
  const {
    profile,
    loading: profileLoading,
    saving: profileSaving,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  } = useUserProfile();

  // Email preferences hooks
  const {
    preferences: emailPrefs,
    loading: emailLoading,
    saving: emailSaving,
    updatePreferences: updateEmailPrefs,
  } = useEmailPreferences();

  // Password change hook
  const {
    changePassword,
    loading: passwordLoading,
    error: passwordError,
    success: passwordSuccess,
    clearError: clearPasswordError,
  } = usePasswordChange();

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    phone: '',
    location: '',
    timezone: '',
  });
  const [formDirty, setFormDirty] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Initialize form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        jobTitle: profile.jobTitle || '',
        phone: profile.phone || '',
        location: profile.location || '',
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormDirty(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        jobTitle: formData.jobTitle,
        phone: formData.phone,
        location: formData.location,
        timezone: formData.timezone,
      });
      setFormDirty(false);
      showToast({ type: 'success', title: 'Profile Saved' });
    } catch (err) {
      console.error('Failed to save profile:', err);
      showToast({ type: 'error', title: 'Failed to Save Profile', message: (err as Error).message || 'Please try again' });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadAvatar(file);
        showToast({ type: 'success', title: 'Avatar Updated' });
      } catch (err) {
        console.error('Failed to upload avatar:', err);
        showToast({ type: 'error', title: 'Failed to Upload Avatar', message: (err as Error).message || 'Please try again' });
      }
    }
  };

  const handleEmailPrefToggle = async (key: string) => {
    if (!emailPrefs) return;
    try {
      await updateEmailPrefs({ [key]: !emailPrefs[key as keyof typeof emailPrefs] });
      showToast({ type: 'success', title: 'Notification Preference Updated' });
    } catch (err) {
      console.error('Failed to update email preference:', err);
      showToast({ type: 'error', title: 'Failed to Update Preference', message: (err as Error).message || 'Please try again' });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return;
    }
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast({ type: 'success', title: 'Password Changed' });
    } catch (err) {
      console.error('Failed to change password:', err);
      showToast({ type: 'error', title: 'Failed to Change Password', message: (err as Error).message || 'Please try again' });
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'menu', label: 'Customize Menu', icon: LayoutGrid },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const isLoading = profileLoading;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <Skeleton className="h-[240px] rounded-[2rem] bg-white" />
          </div>
          <div className="md:col-span-8 space-y-6">
            <Skeleton className="h-[400px] rounded-[2rem] bg-white" />
            <Skeleton className="h-[200px] rounded-[2rem] bg-white" />
          </div>
        </div>
      </div>
    );
  }

  // Get user initials for avatar
  const userInitials = formData.firstName && formData.lastName
    ? `${formData.firstName[0]}${formData.lastName[0]}`
    : profile?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Settings</h1>
        <p className="text-[#666] mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Settings Sidebar */}
        <div className="md:col-span-4">
          <Card className="p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1A1A1A] text-white'
                    : 'hover:bg-[#F8F8F6] text-[#666]'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </Card>

          {/* User Info Card */}
          <Card className="p-4 mt-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={profile?.avatarUrl}
                name={`${formData.firstName} ${formData.lastName}`}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#1A1A1A] truncate">
                  {formData.firstName} {formData.lastName}
                </p>
                <p className="text-xs text-[#666] truncate">{profile?.email}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">System Role</span>
                <Badge variant={user?.role === 'ADMIN' ? 'dark' : 'outline'} size="sm">
                  {user?.role || 'USER'}
                </Badge>
              </div>
              {user?.organizationName && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#666]">Organization</span>
                    <span className="text-xs font-medium text-[#1A1A1A] truncate max-w-[120px]" title={user.organizationName}>
                      {user.organizationName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#666]">Org Role</span>
                    <Badge
                      variant={user.organizationRole === 'OWNER' || user.organizationRole === 'ADMIN' ? 'dark' : user.organizationRole === 'MANAGER' ? 'yellow' : 'outline'}
                      size="sm"
                    >
                      {user.organizationRole || 'MEMBER'}
                    </Badge>
                  </div>
                </>
              )}
              {user?.licenseTier && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666]">License</span>
                  <Badge variant="green" size="sm">
                    {user.licenseTier}
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-8 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="p-8">
              <h3 className="text-xl font-medium mb-6">Profile Information</h3>

              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#EAD07D] flex items-center justify-center text-3xl font-bold text-[#1A1A1A]">
                      {userInitials}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-lg">
                    {formData.firstName} {formData.lastName}
                  </h4>
                  <p className="text-[#666] text-sm mb-2">{formData.jobTitle || 'No title set'}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAvatarClick}
                      className="text-xs font-bold text-[#1A1A1A] underline"
                    >
                      Change Avatar
                    </button>
                    {profile?.avatarUrl && (
                      <button
                        onClick={deleteAvatar}
                        className="text-xs font-bold text-red-600 underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="e.g. Sales Manager"
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="City, Country"
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Shanghai (CST)</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Email Address</label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent text-sm font-medium text-[#666] cursor-not-allowed"
                  />
                  <p className="text-xs text-[#999] ml-1">Contact support to change your email</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={!formDirty || profileSaving}
                  className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {profileSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </Card>
          )}

          {/* Menu Customization Tab */}
          {activeTab === 'menu' && (
            <Card className="p-8">
              <MenuCustomization />
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="p-8">
              <h3 className="text-xl font-medium mb-2">Email Notifications</h3>
              <p className="text-sm text-[#666] mb-6">Choose what emails you want to receive</p>

              {emailLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { key: 'newLeadAssigned', label: 'New lead assigned to me' },
                    { key: 'leadStatusChange', label: 'Lead status changes' },
                    { key: 'dealStageChange', label: 'Opportunity stage changes' },
                    { key: 'dealWonLost', label: 'Opportunity won or lost' },
                    { key: 'taskAssigned', label: 'Task assigned to me' },
                    { key: 'taskDueReminder', label: 'Task due reminders' },
                    { key: 'meetingReminder', label: 'Meeting reminders' },
                    { key: 'dailyDigest', label: 'Daily activity digest' },
                    { key: 'weeklyReport', label: 'Weekly performance report' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-[#1A1A1A]">{item.label}</span>
                      <button
                        onClick={() => handleEmailPrefToggle(item.key)}
                        disabled={emailSaving}
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                          emailPrefs?.[item.key as keyof typeof emailPrefs]
                            ? 'bg-[#EAD07D]'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            emailPrefs?.[item.key as keyof typeof emailPrefs]
                              ? 'translate-x-6'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="p-8">
              <h3 className="text-xl font-medium mb-2">Change Password</h3>
              <p className="text-sm text-[#666] mb-6">Update your password to keep your account secure</p>

              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle size={16} />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm">
                  <Check size={16} />
                  Password changed successfully
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                      clearPasswordError();
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#666] ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
                  />
                  {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-xs text-red-600 ml-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handlePasswordChange}
                  disabled={
                    passwordLoading ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    passwordData.newPassword !== passwordData.confirmPassword
                  }
                  className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key size={16} />
                      Update Password
                    </>
                  )}
                </button>
              </div>

              <hr className="my-8 border-gray-100" />

              <h3 className="text-xl font-medium mb-2 text-red-600">Danger Zone</h3>
              <p className="text-sm text-[#666] mb-4">Irreversible and destructive actions</p>

              <button
                onClick={logout}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors"
              >
                Sign Out of All Devices
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

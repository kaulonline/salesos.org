import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Shield,
  Users,
  Edit3,
  Trash2,
  Copy,
  X,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Lock,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmationModal } from '../../../src/components/ui/ConfirmationModal';
import { useProfiles } from '../../../src/hooks/useProfiles';
import type { Profile, CreateProfileDto, Permission, DataAccessLevel } from '../../../src/types';
import { PERMISSION_MODULES } from '../../../src/types/profile';
import { AIBuilderTrigger } from '../../../src/components/AIBuilder/AIBuilderTrigger';
import { AIBuilderModal } from '../../../src/components/AIBuilder/AIBuilderModal';
import { AIBuilderEntityType, ProfileConfig } from '../../../src/types/aiBuilder';

const DATA_ACCESS_LABELS: Record<DataAccessLevel, string> = {
  NONE: 'No Access',
  OWN: 'Own Records Only',
  TEAM: 'Team Records',
  ALL: 'All Records',
};

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateProfileDto) => Promise<void>;
  existingProfiles: Profile[];
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingProfiles
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cloneFrom, setCloneFrom] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Profile name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseProfile = cloneFrom
        ? existingProfiles.find(p => p.id === cloneFrom)
        : null;

      const permissions: Permission[] = baseProfile?.permissions || [];

      await onCreate({ name, description, permissions });
      onClose();
      setName('');
      setDescription('');
      setCloneFrom('');
    } catch (err) {
      setError((err as Error).message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Profile</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Profile Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sales Manager"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this profile's purpose..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Clone Permissions From</label>
              <select
                value={cloneFrom}
                onChange={(e) => setCloneFrom(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] outline-none"
              >
                <option value="">Start with no permissions</option>
                {existingProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PermissionMatrixProps {
  profile: Profile;
  onUpdate: (permissions: Permission[]) => Promise<void>;
  onClose: () => void;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ profile, onUpdate, onClose }) => {
  const [permissions, setPermissions] = useState<Permission[]>(profile.permissions);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleModule = (module: string) => {
    setExpandedModules(prev =>
      prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]
    );
  };

  const getPermission = (module: string): Permission | undefined => {
    return permissions.find(p => p.module === module);
  };

  const updatePermission = (module: string, field: keyof Permission, value: any) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.module === module);
      if (existing) {
        return prev.map(p => p.module === module ? { ...p, [field]: value } : p);
      } else {
        return [...prev, { module, read: false, create: false, edit: false, delete: false, dataAccess: 'OWN' as DataAccessLevel, [field]: value }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(permissions);
      onClose();
    } catch (err) {
      console.error('Failed to update permissions:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-medium text-[#1A1A1A]">Edit Permissions</h2>
            <p className="text-[#666] text-sm mt-1">{profile.name}</p>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-3">
            {PERMISSION_MODULES.map(module => {
              const perm = getPermission(module.key);
              const isExpanded = expandedModules.includes(module.key);

              return (
                <Card key={module.key} className="overflow-hidden">
                  <button
                    onClick={() => toggleModule(module.key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="font-medium text-[#1A1A1A]">{module.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {perm?.read && <Badge variant="blue" size="sm">Read</Badge>}
                      {perm?.create && <Badge variant="green" size="sm">Create</Badge>}
                      {perm?.edit && <Badge variant="yellow" size="sm">Edit</Badge>}
                      {perm?.delete && <Badge variant="red" size="sm">Delete</Badge>}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {(['read', 'create', 'edit', 'delete'] as const).map(action => (
                          <label key={action} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={perm?.[action] || false}
                              onChange={(e) => updatePermission(module.key, action, e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                            />
                            <span className="text-sm capitalize">{action}</span>
                          </label>
                        ))}
                        <div>
                          <label className="text-xs text-[#666] block mb-1">Data Access</label>
                          <select
                            value={perm?.dataAccess || 'OWN'}
                            onChange={(e) => updatePermission(module.key, 'dataAccess', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-[#F8F8F6] text-sm border-transparent focus:border-[#EAD07D] outline-none"
                          >
                            {Object.entries(DATA_ACCESS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 p-8 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProfilesPage() {
  const { profiles, stats, loading, error, create, update, remove } = useProfiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; profileId: string | null }>({
    isOpen: false,
    profileId: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile =>
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [profiles, searchQuery]);

  const handleDelete = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile?.isSystem) {
      alert('System profiles cannot be deleted');
      return;
    }
    setDeleteModal({ isOpen: true, profileId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.profileId) return;
    setDeleteLoading(true);
    try {
      await remove(deleteModal.profileId);
    } catch (err) {
      console.error('Failed to delete profile:', err);
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ isOpen: false, profileId: null });
    }
  };

  const handleClone = async (profile: Profile) => {
    try {
      await create({
        name: `${profile.name} (Copy)`,
        description: profile.description,
        permissions: profile.permissions,
      });
    } catch (err) {
      console.error('Failed to clone profile:', err);
    }
  };

  const handleUpdatePermissions = async (permissions: Permission[]) => {
    if (!editingProfile) return;
    await update(editingProfile.id, { permissions });
  };

  const handleAIProfileApply = async (config: Record<string, any>) => {
    try {
      const profileConfig = config as ProfileConfig;

      // Map AI permissions to our Permission format
      const permissions: Permission[] = profileConfig.permissions.map((perm) => {
        // Map action strings to our boolean format
        const actions = perm.actions || [];
        return {
          module: perm.module,
          read: actions.includes('VIEW'),
          create: actions.includes('CREATE'),
          edit: actions.includes('EDIT'),
          delete: actions.includes('DELETE'),
          dataAccess: (perm.dataAccess as DataAccessLevel) || 'OWN',
        };
      });

      await create({
        name: profileConfig.name,
        description: profileConfig.description,
        permissions,
      });
      setShowAIBuilder(false);
    } catch (error) {
      console.error('Failed to create profile from AI:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Profiles & Permissions</h1>
        <p className="text-[#666] mt-1">Manage user roles and access permissions</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{stats.total}</p>
            <p className="text-sm text-[#666]">Total Profiles</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-blue-600">{stats.system}</p>
            <p className="text-sm text-[#666]">System Profiles</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#EAD07D]">{stats.custom}</p>
            <p className="text-sm text-[#666]">Custom Profiles</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-green-600">{stats.totalUsers}</p>
            <p className="text-sm text-[#666]">Total Users</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
          <input
            type="text"
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <AIBuilderTrigger
            onClick={() => setShowAIBuilder(true)}
            label="Create with AI"
            variant="secondary"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
          >
            <Plus size={18} />
            New Profile
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Profiles List */}
      {!loading && (
        <div className="space-y-3">
          {filteredProfiles.map(profile => (
            <Card key={profile.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    profile.isSystem ? 'bg-blue-100' : 'bg-[#EAD07D]/20'
                  }`}>
                    {profile.isSystem ? (
                      <Lock size={24} className="text-blue-600" />
                    ) : (
                      <Shield size={24} className="text-[#1A1A1A]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#1A1A1A]">{profile.name}</p>
                      {profile.isSystem && (
                        <Badge variant="blue" size="sm">System</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#666] mt-0.5">
                      {profile.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#888]">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {profile.userCount} users
                      </span>
                      <span>·</span>
                      <span>{profile.permissions.filter(p => p.read).length} modules enabled</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingProfile(profile)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-[#666] hover:text-[#1A1A1A] transition-colors"
                    title="Edit permissions"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleClone(profile)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-[#666] hover:text-[#1A1A1A] transition-colors"
                    title="Clone profile"
                  >
                    <Copy size={18} />
                  </button>
                  {!profile.isSystem && (
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500 transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProfiles.length === 0 && (
        <Card className="p-12 text-center">
          <Shield className="w-12 h-12 text-[#888] mx-auto mb-4" />
          <p className="text-[#666]">No profiles found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-[#1A1A1A] hover:underline"
          >
            Create your first profile
          </button>
        </Card>
      )}

      <CreateProfileModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={create}
        existingProfiles={profiles}
      />

      {editingProfile && (
        <PermissionMatrix
          profile={editingProfile}
          onUpdate={handleUpdatePermissions}
          onClose={() => setEditingProfile(null)}
        />
      )}

      {/* AI Builder Modal */}
      <AIBuilderModal
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        entityType={AIBuilderEntityType.PROFILE}
        entityLabel="Profile"
        onApply={handleAIProfileApply}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, profileId: null })}
        onConfirm={confirmDelete}
        title="Delete Profile"
        message="Are you sure you want to delete this profile? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}

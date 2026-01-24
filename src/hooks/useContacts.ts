import { useState, useCallback, useEffect } from 'react';
import { contactsApi, ContactFilters } from '../api/contacts';
import type { Contact, CreateContactDto, UpdateContactDto, ContactStats } from '../types';

interface UseContactsReturn {
  contacts: Contact[];
  stats: ContactStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchStats: () => Promise<void>;
  create: (data: CreateContactDto) => Promise<Contact>;
  update: (id: string, data: UpdateContactDto) => Promise<Contact>;
  remove: (id: string) => Promise<void>;
}

export function useContacts(initialFilters?: ContactFilters): UseContactsReturn {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<ContactFilters | undefined>(initialFilters);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactsApi.getAll(filters);
      setContacts(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await contactsApi.getStats();
      setStats(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      console.error('Failed to fetch contact stats:', e.message);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const create = useCallback(async (data: CreateContactDto): Promise<Contact> => {
    const contact = await contactsApi.create(data);
    setContacts((prev) => [contact, ...prev]);
    return contact;
  }, []);

  const update = useCallback(async (id: string, data: UpdateContactDto): Promise<Contact> => {
    const updated = await contactsApi.update(id, data);
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await contactsApi.delete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    contacts,
    stats,
    loading,
    error,
    refetch: fetchContacts,
    fetchStats,
    create,
    update,
    remove,
  };
}

export function useContact(id: string | undefined) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    if (!id) {
      setContact(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await contactsApi.getById(id);
      setContact(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch contact');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  return { contact, loading, error, refetch: fetchContact };
}

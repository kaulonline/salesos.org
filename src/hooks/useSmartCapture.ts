import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { queryKeys } from '../lib/queryKeys';

export interface CapturedContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedIn?: string;
  notes?: string;
  confidence: number;
}

export interface CaptureResult {
  success: boolean;
  contact?: CapturedContact;
  rawText?: string;
  error?: string;
}

async function processImage(file: File | Blob): Promise<CaptureResult> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await client.post<CaptureResult>('/ai/smart-capture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

async function processText(text: string): Promise<CaptureResult> {
  const response = await client.post<CaptureResult>('/ai/smart-capture/text', { text });
  return response.data;
}

export function useSmartCapture() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [capturedData, setCapturedData] = useState<CapturedContact | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Process image mutation
  const imageMutation = useMutation({
    mutationFn: processImage,
    onSuccess: (result) => {
      if (result.success && result.contact) {
        setCapturedData(result.contact);
      }
    },
  });

  // Process text mutation
  const textMutation = useMutation({
    mutationFn: processText,
    onSuccess: (result) => {
      if (result.success && result.contact) {
        setCapturedData(result.contact);
      }
    },
  });

  // Create contact from captured data
  const createContactMutation = useMutation({
    mutationFn: async (contact: CapturedContact) => {
      const response = await client.post('/contacts', {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        title: contact.title,
        linkedInUrl: contact.linkedIn,
        notes: contact.notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      reset();
    },
  });

  // Create lead from captured data
  const createLeadMutation = useMutation({
    mutationFn: async (contact: CapturedContact) => {
      const response = await client.post('/leads', {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        title: contact.title,
        notes: contact.notes,
        source: 'SMART_CAPTURE',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      reset();
    },
  });

  const processFile = useCallback(async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewImage(e.target?.result as string);
    reader.readAsDataURL(file);

    // Process with AI
    await imageMutation.mutateAsync(file);
  }, [imageMutation]);

  const captureFromCamera = useCallback(async (blob: Blob) => {
    // Show preview
    const url = URL.createObjectURL(blob);
    setPreviewImage(url);

    // Process with AI
    await imageMutation.mutateAsync(blob);
  }, [imageMutation]);

  const processNotes = useCallback(async (text: string) => {
    await textMutation.mutateAsync(text);
  }, [textMutation]);

  const updateCapturedData = useCallback((updates: Partial<CapturedContact>) => {
    setCapturedData((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const saveAsContact = useCallback(async () => {
    if (capturedData) {
      await createContactMutation.mutateAsync(capturedData);
    }
  }, [capturedData, createContactMutation]);

  const saveAsLead = useCallback(async () => {
    if (capturedData) {
      await createLeadMutation.mutateAsync(capturedData);
    }
  }, [capturedData, createLeadMutation]);

  const reset = useCallback(() => {
    setCapturedData(null);
    setPreviewImage(null);
    setIsOpen(false);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
    processFile,
    captureFromCamera,
    processNotes,
    capturedData,
    updateCapturedData,
    previewImage,
    isProcessing: imageMutation.isPending || textMutation.isPending,
    isSaving: createContactMutation.isPending || createLeadMutation.isPending,
    error: imageMutation.error?.message || textMutation.error?.message || null,
    saveAsContact,
    saveAsLead,
    reset,
  };
}

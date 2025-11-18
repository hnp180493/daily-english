/**
 * Storage adapter module exports
 * Provides unified storage interface for guest (localStorage) and authenticated (Supabase) users
 */

export type { StorageAdapter, UserStats } from './storage-adapter.interface';
export { LocalStorageProvider } from './local-storage-provider.service';
export { SupabaseStorageProvider } from './supabase-storage-provider.service';
export { StorageAdapterFactory } from './storage-adapter-factory.service';

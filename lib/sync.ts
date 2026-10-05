/**
 * Paws — cloud backup for signed-in (Online) users.
 * The whole local database is saved as one snapshot row in Supabase `paws_backups` (RLS: own row only),
 * and can be restored on another phone. Local SQLite stays the source of truth while using the app.
 * ponytail: whole-snapshot, last-write-wins; move to per-row sync with updated_at if people use two
 * phones at the same time.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './auth';
import type { DbAdapter } from './db/DbAdapter';
import { countTransactions, exportData, importData, validateSnapshot, type Snapshot } from './db/queries';
import { validatePlanLists } from './planMath';
import { exportPlanLists, importPlanLists } from './planStore';

// the DB snapshot plus the Plan lists (goals, owed, planned payments, trips)
type Backup = Snapshot & { lists?: Record<string, unknown> };

const LAST_KEY = 'paws.lastBackup';

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function getCloudBackup(): Promise<{ data: Backup; updatedAt: string } | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase.from('paws_backups').select('data, updated_at').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data ? { data: data.data as Backup, updatedAt: data.updated_at as string } : null;
}

/**
 * Upload this phone's data. `auto` backups never upload an empty database, so a fresh install
 * (or someone who skipped the restore prompt) can't wipe the backup they still need.
 */
export async function backupNow(db: DbAdapter, { auto = false } = {}): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) throw new Error('Sign in to back up your data.');
  const snap: Backup = { ...(await exportData(db)), lists: await exportPlanLists() };
  if (auto && countTransactions(snap) === 0) return null;
  const at = new Date().toISOString();
  const { error } = await supabase.from('paws_backups').upsert({ user_id: uid, data: snap, updated_at: at });
  if (error) throw error;
  await AsyncStorage.setItem(LAST_KEY, at);
  return at;
}

/** Replace this phone's data with the cloud backup. Returns how many transactions were restored. */
export async function restoreFromCloud(db: DbAdapter): Promise<number> {
  const cloud = await getCloudBackup();
  if (!cloud) throw new Error('No backup found for this account yet.');
  validateSnapshot(cloud.data);
  if (cloud.data.lists) validatePlanLists(cloud.data.lists); // check everything before writing anything
  await importData(db, cloud.data);
  if (cloud.data.lists) await importPlanLists(cloud.data.lists);
  await AsyncStorage.setItem(LAST_KEY, cloud.updatedAt);
  return countTransactions(cloud.data);
}

export const getLastBackup = () => AsyncStorage.getItem(LAST_KEY).catch(() => null);
export const localTransactionCount = async (db: DbAdapter) => countTransactions(await exportData(db));

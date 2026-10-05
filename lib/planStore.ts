/**
 * Paws — storage for Plan lists (goals, owed, planned payments, trips) in AsyncStorage.
 * Included in the cloud backup (lib/sync.ts) and validated on restore (lib/planMath.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { PLAN_LISTS, validatePlanLists, type PlanItem, type PlanListKey } from './planMath';

const key = (k: PlanListKey) => `paws.list.${k}`;

export async function loadPlanList(k: PlanListKey): Promise<PlanItem[]> {
  try { return JSON.parse((await AsyncStorage.getItem(key(k))) ?? '[]'); } catch { return []; }
}

export function usePlanList(k: PlanListKey) {
  const [items, setItems] = useState<PlanItem[]>([]);
  useFocusEffect(useCallback(() => { loadPlanList(k).then(setItems); }, [k]));
  const persist = async (next: PlanItem[]) => { setItems(next); await AsyncStorage.setItem(key(k), JSON.stringify(next)); };
  return {
    items,
    save: (item: PlanItem) => persist(items.some(i => i.id === item.id) ? items.map(i => (i.id === item.id ? item : i)) : [...items, item]),
    remove: (id: string) => persist(items.filter(i => i.id !== id)),
  };
}

export async function exportPlanLists() {
  const out: Record<string, PlanItem[]> = {};
  for (const k of Object.keys(PLAN_LISTS) as PlanListKey[]) out[k] = await loadPlanList(k);
  return out;
}

export async function importPlanLists(data: unknown) {
  validatePlanLists(data);
  await AsyncStorage.multiSet(Object.entries(data).map(([k, v]) => [key(k as PlanListKey), JSON.stringify(v)]));
}

/**
 * Paws — draws a stored category/account emoji as a consistent vector icon (same on iOS and Android).
 * Data keeps its emoji (no migration); unknown emoji fall back to the emoji itself.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text } from 'react-native';

const MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // expense categories
  '🍽️': 'restaurant', '🍽': 'restaurant', '🚗': 'car', '🛍️': 'bag-handle', '🛍': 'bag-handle', '💡': 'bulb',
  '💊': 'medkit', '🎬': 'film', '📚': 'book', '✂️': 'cut', '✂': 'cut', '✈️': 'airplane', '✈': 'airplane',
  '🛒': 'cart', '🏠': 'home', '🐷': 'wallet', '📦': 'cube',
  // income categories
  '💼': 'briefcase', '💻': 'laptop', '🏪': 'storefront', '📈': 'trending-up', '🎁': 'gift', '💰': 'cash',
  // accounts / transaction fallbacks
  '💵': 'cash', '🏦': 'business', '💳': 'card', '📱': 'phone-portrait', '🔄': 'swap-horizontal', '💸': 'arrow-up-circle', '📉': 'trending-down',
};

export function CategoryIcon({ emoji, size = 18, color }: { emoji?: string | null; size?: number; color: string }) {
  const name = emoji ? MAP[emoji] : undefined;
  if (name) return <Ionicons name={name} size={size} color={color} accessible={false} />;
  return <Text style={{ fontSize: size * 0.9 }} accessible={false}>{emoji ?? '•'}</Text>;
}

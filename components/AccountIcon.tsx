/**
 * Paws — account icon: the bank's / e-wallet's own app icon when the name matches one (BDO, Maya, GCash…),
 * otherwise the account's stored icon. Logos are the official App Store icons, bundled in assets/banks.
 */
import React from 'react';
import { Image } from 'react-native';
import { bankFromName, type BankKey } from '../lib/bankLogo';
import { CategoryIcon } from './CategoryIcon';

const LOGOS: Record<BankKey, number> = {
  bdo: require('../assets/banks/bdo.png'),
  bpi: require('../assets/banks/bpi.png'),
  metrobank: require('../assets/banks/metrobank.png'),
  landbank: require('../assets/banks/landbank.png'),
  unionbank: require('../assets/banks/unionbank.png'),
  securitybank: require('../assets/banks/securitybank.png'),
  rcbc: require('../assets/banks/rcbc.png'),
  pnb: require('../assets/banks/pnb.png'),
  chinabank: require('../assets/banks/chinabank.png'),
  eastwest: require('../assets/banks/eastwest.png'),
  psbank: require('../assets/banks/psbank.png'),
  gcash: require('../assets/banks/gcash.png'),
  maya: require('../assets/banks/maya.png'),
  gotyme: require('../assets/banks/gotyme.png'),
  seabank: require('../assets/banks/seabank.png'),
  cimb: require('../assets/banks/cimb.png'),
  tonik: require('../assets/banks/tonik.png'),
};

/** `box` is the badge the icon sits in; a logo fills it, a vector icon is drawn at `size`. */
export function AccountIcon({ name, icon, size, box, color }: {
  name: string; icon?: string | null; size: number; box: number; color: string;
}) {
  const bank = bankFromName(name);
  if (bank) {
    return <Image source={LOGOS[bank]} style={{ width: box, height: box, borderRadius: box * 0.28 }} accessible={false} />;
  }
  return <CategoryIcon emoji={icon} size={size} color={color} />;
}

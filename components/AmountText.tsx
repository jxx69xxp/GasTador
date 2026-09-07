import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import Colors from '../constants/Colors';

interface Props {
  amount: number;
  style?: StyleProp<TextStyle>;
  colorCoded?: boolean; // green if positive, red if negative
  currency?: string;
}

export function AmountText({ amount, style, colorCoded = false, currency = '₱' }: Props) {
  const color = colorCoded
    ? amount >= 0 ? Colors.income : Colors.expense
    : undefined;

  const formatted = `${currency}${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <Text style={[{ fontWeight: '700' }, color ? { color } : null, style]}>
      {amount < 0 ? '-' : ''}{formatted}
    </Text>
  );
}

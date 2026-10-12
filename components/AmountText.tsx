import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import Colors from '../constants/Colors';

interface Props extends Omit<TextProps, 'style'> {
  amount: number;
  style?: StyleProp<TextStyle>;
  colorCoded?: boolean; // green if positive, red if negative
  currency?: string;
}

export function AmountText({ amount, style, colorCoded = false, currency = '₱', ...rest }: Props) {
  const color = colorCoded
    ? amount >= 0 ? Colors.income : Colors.expense
    : Colors.textPrimary; // never fall back to the platform's black text (unreadable in dark mode)

  const formatted = `${currency}${Math.abs(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <Text {...rest} style={[{ fontWeight: '700', color }, style]}>
      {amount < 0 ? '-' : ''}{formatted}
    </Text>
  );
}

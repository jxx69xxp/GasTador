/**
 * Paws — scan a receipt: camera or gallery -> on-device text recognition (ML Kit) -> parseReceipt.
 * Photos never leave the phone.
 */
import * as ImagePicker from 'expo-image-picker';
import { Alert, NativeModules } from 'react-native';
import { parseReceipt, type ReceiptGuess } from './receipt';

export async function scanReceipt(source: 'camera' | 'library'): Promise<ReceiptGuess | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to scan receipts.`);
    return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  // ML Kit is linked on Android only (see react-native.config.js); elsewhere fall back to manual entry
  if (!NativeModules.TextRecognition) {
    Alert.alert('Reading receipts isn’t available on this device yet', 'Enter the amount from your receipt manually.');
    return { amount: null, merchant: null, date: null };
  }
  try {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const { text } = await TextRecognition.recognize(res.assets[0].uri);
    const guess = parseReceipt(text);
    if (guess.amount == null) Alert.alert('No total found', 'I couldn’t find the total on this receipt. Please enter it.');
    return guess;
  } catch {
    Alert.alert('Couldn’t read that receipt', 'Try a sharper, well-lit photo, or enter it manually.');
    return { amount: null, merchant: null, date: null };
  }
}

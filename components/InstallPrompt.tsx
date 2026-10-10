// Web-only "Install Paws" popup. Chrome/Edge/Android: native install via the stashed
// beforeinstallprompt event (see app/+html.tsx). iOS Safari has no API, so it shows Add to Home Screen steps.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Colors from '../constants/Colors';

const KEY = 'paws.installDismissed';
const w = typeof window !== 'undefined' ? (window as any) : undefined;

const isStandalone = () =>
  !!w && (w.matchMedia?.('(display-mode: standalone)').matches || w.navigator.standalone === true);
const isIOS = () => !!w && /iphone|ipad|ipod/i.test(w.navigator.userAgent);
const dismissed = () => { try { return w?.localStorage.getItem(KEY) === '1'; } catch { return false; } };

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!w || isStandalone() || dismissed()) return;
    if (isIOS()) { setVisible(true); return; }
    const show = () => setVisible(true);
    if (w.__bip) show();
    w.addEventListener('bip', show);
    return () => w.removeEventListener('bip', show);
  }, []);

  const close = () => {
    try { w?.localStorage.setItem(KEY, '1'); } catch {}
    setVisible(false);
  };

  const install = async () => {
    const e = w?.__bip;
    if (!e) return close();
    e.prompt();
    await e.userChoice;
    w.__bip = undefined;
    close();
  };

  if (!visible) return null;
  const ios = isIOS();

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center', padding: 16 }}>
        <View
          accessibilityRole="alert"
          style={{ width: '100%', maxWidth: 420, backgroundColor: Colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border }}
        >
          <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.textPrimary }}>Install Paws</Text>
          <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: Colors.textSecondary }}>
            {ios
              ? 'Tap the Share button in Safari, then "Add to Home Screen" to use Paws like an app.'
              : 'Add Paws to your home screen. It opens full screen and works offline.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border }}
            >
              <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{ios ? 'Got it' : 'Cancel'}</Text>
            </Pressable>
            {!ios && (
              <Pressable
                onPress={install}
                accessibilityRole="button"
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.primary }}
              >
                <Text style={{ fontWeight: '700', color: Colors.onPrimary }}>Install app</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

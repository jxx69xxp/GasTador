/**
 * Paws — in-app splash that picks up exactly where the native splash leaves off
 * (same purple + cat at 220pt), then reveals the name/tagline and fades into the app.
 */
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, Text } from 'react-native';
import Colors from '../constants/Colors';

const MIN_VISIBLE_MS = 1200;

export function AnimatedSplash({ ready }: { ready: boolean }) {
  const [done, setDone] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;  // name + tagline
  const fade = useRef(new Animated.Value(1)).current;    // whole overlay
  const startedAt = useRef(Date.now()).current;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      await SplashScreen.hideAsync().catch(() => {});      // our overlay looks identical, so no flash
      Animated.timing(reveal, { toValue: 1, duration: reduceMotion ? 0 : 450, useNativeDriver: true }).start();
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      setTimeout(() => {
        if (cancelled) return;
        Animated.timing(fade, { toValue: 0, duration: reduceMotion ? 0 : 320, useNativeDriver: true })
          .start(() => setDone(true));
      }, wait);
    })();
    return () => { cancelled = true; };
  }, [ready, reveal, fade, startedAt]);

  if (done) return null;

  const rise = reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  return (
    <Animated.View style={[styles.overlay, { opacity: fade }]} accessibilityLabel="Paws is loading">
      <Image source={require('../assets/splash-icon.png')} style={styles.cat} />
      <Animated.View style={{ opacity: reveal, transform: [{ translateY: rise }], alignItems: 'center' }}>
        <Text style={styles.title}>Paws</Text>
        <Text style={styles.tagline}>Paws before you spend</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.brandPurple, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  cat: { width: 220, height: 220 },
  // dark ink on #A78BFA = 6.5:1 (white would only be 2.7:1)
  title: { fontSize: 40, fontWeight: '800', color: Colors.ink, marginTop: 8 },
  tagline: { fontSize: 17, fontWeight: '600', color: Colors.ink, marginTop: 4 },
});

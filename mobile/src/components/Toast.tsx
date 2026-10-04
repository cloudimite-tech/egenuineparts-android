import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../store/toastStore';
import { colors, radius } from '../theme/theme';

export function ToastHost() {
  const { message, kind, id, hide } = useToastStore();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => hide());
    }, 2400);
    return () => clearTimeout(t);
  }, [id]);

  if (!message) return null;
  const icon = kind === 'success' ? 'checkmark-circle' : kind === 'error' ? 'alert-circle-outline' : 'information-circle-outline';
  const tint = kind === 'success' ? '#4ADE80' : kind === 'error' ? '#F87171' : '#93C5FD';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(20,20,22,0.96)',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: { color: colors.white, fontWeight: '600', flex: 1, fontSize: 14 },
});

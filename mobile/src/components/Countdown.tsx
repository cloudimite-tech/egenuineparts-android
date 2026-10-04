import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, '0');

// Ticking "1d 04:22:10" boxes. Calls onEnd once when it reaches zero.
export function Countdown({ endsAt, onEnd, dark }: { endsAt: string; onEnd?: () => void; dark?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const end = new Date(endsAt).getTime();
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (end - now <= 0) onEnd?.();
  }, [end - now <= 0]);

  const { d, h, m, s } = parts(end - now);
  const box = [styles.box, dark && styles.boxDark];
  const txt = [styles.text, dark && styles.textDark];
  return (
    <View style={styles.row}>
      {d > 0 ? (
        <>
          <View style={box}>
            <Text style={txt}>{d}d</Text>
          </View>
        </>
      ) : null}
      {[h, m, s].map((v, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <Text style={[styles.colon, dark && { color: '#111' }]}>:</Text> : null}
          <View style={box}>
            <Text style={txt}>{pad(v)}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  box: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, minWidth: 26, alignItems: 'center' },
  boxDark: { backgroundColor: '#111' },
  text: { color: '#fff', fontWeight: '900', fontSize: 12, fontVariant: ['tabular-nums'] },
  textDark: { color: '#fff' },
  colon: { color: '#fff', fontWeight: '900', fontSize: 12 },
});

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/Themed';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius, spacing, themed } from '../theme/theme';
import { apiClient } from '../api/client';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';
import { initials } from '../utils/format';

type Blocked = { userId: string; name: string; createdAt: string };

export function BlockedUsersScreen() {
  const [rows, setRows] = useState<Blocked[] | null>(null);
  const load = useCallback(() => {
    apiClient.get<Blocked[]>('/users/me/blocks').then(({ data }) => setRows(data)).catch(() => setRows([]));
  }, []);
  useFocusEffect(load);

  const unblock = async (b: Blocked) => {
    try {
      await apiClient.delete(`/users/me/blocks/${b.userId}`);
      toast.success(`${b.name} unblocked`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Blocked users" subtitle="They can’t message you, and you won’t see their chats." back />
      {rows === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="hand-left-outline" title="No one blocked" message="You can block someone from the ⋯ menu in a chat." />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item.name)}</Text>
              </View>
              <Text style={styles.name}>{item.name}</Text>
              <TouchableOpacity style={styles.btn} onPress={() => unblock(item)}>
                <Text style={styles.btnText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.link, fontWeight: '900' },
  name: { flex: 1, fontWeight: '700', fontSize: 15 },
  btn: { borderWidth: 1, borderColor: colors.link, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  btnText: { color: colors.link, fontWeight: '800', fontSize: 13 },
}));

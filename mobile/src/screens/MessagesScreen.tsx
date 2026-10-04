import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { Conversation } from '../types';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ProductImage } from '../components/ProductImage';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { timeAgo } from '../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Messages'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'all' | 'buying' | 'selling';

export function MessagesScreen({ navigation }: Props) {
  const { isGuest, profile, user } = useAuthStore();
  const inboxVersion = useChatStore((s) => s.inboxVersion);
  const [threads, setThreads] = useState<Conversation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (isGuest) return;
    try {
      const { data } = await apiClient.get<Conversation[]>('/chat/conversations');
      setThreads(data);
      useChatStore.getState().refreshUnread().catch(() => {});
    } catch {
      setThreads((t) => t ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [isGuest]);

  useFocusEffect(useCallback(() => void load(), [load]));
  useEffect(() => void load(), [inboxVersion]);

  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Messages" large />
        <EmptyState
          icon="chatbubbles-outline"
          title="Chat with sellers"
          message="Ask about fitment, stock or warranty on any part — privately, right inside the app."
          actionLabel="Sign in to chat"
          onAction={() => navigation.navigate('Welcome')}
        />
      </View>
    );
  }

  const isSeller = !!profile?.store;
  const shown = (threads ?? []).filter((t) =>
    filter === 'all' ? true : filter === 'selling' ? t.viewerIsSeller : !t.viewerIsSeller,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Messages" large>
        {isSeller ? (
          <View style={styles.tabs}>
            {(['all', 'buying', 'selling'] as Filter[]).map((f) => (
              <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
                  {f === 'all' ? 'All' : f === 'buying' ? 'Buying' : 'Selling'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </Header>
      {!threads ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ flexGrow: 1, paddingVertical: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No conversations yet"
              message="Open any part and tap “Chat” to ask the seller a question about it."
              actionLabel="Browse parts"
              onAction={() => navigation.navigate('Main', { screen: 'Home' })}
            />
          }
          renderItem={({ item }) => {
            const unread = item.unreadCount ?? 0;
            const last = item.lastMessage;
            const mine = last?.senderId === user?.id;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('ChatConversation', { conversationId: item.id })}
                activeOpacity={0.8}
              >
                <View>
                  <ProductImage url={item.product.images?.[0]?.url} style={styles.thumb} iconSize={24} rounded={12} />
                  {item.viewerIsSeller ? (
                    <View style={styles.roleBadge}>
                      <Ionicons name="storefront" size={10} color={colors.white} />
                    </View>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.name, unread > 0 && { fontWeight: '900' }]} numberOfLines={1}>
                      {item.otherPartyName}
                    </Text>
                    <Text style={[styles.time, unread > 0 && { color: colors.accent, fontWeight: '700' }]}>
                      {timeAgo(last?.createdAt ?? item.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.product} numberOfLines={1}>
                    {item.product.title}
                  </Text>
                  <View style={styles.rowBottom}>
                    <Text style={[styles.preview, unread > 0 && { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                      {last ? `${mine ? 'You: ' : ''}${last.body}` : 'Start the conversation'}
                    </Text>
                    {unread > 0 ? (
                      <View style={styles.unread}>
                        <Text style={styles.unreadText}>{unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.headerElevated },
  tabActive: { backgroundColor: colors.white },
  tabText: { color: '#C9C9CF', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.black },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
  },
  thumb: { width: 58, height: 58 },
  roleBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontWeight: '800', fontSize: 15, flex: 1, color: colors.text },
  time: { color: colors.textFaint, fontSize: 12 },
  product: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 2 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  preview: { flex: 1, color: colors.textMuted, fontSize: 14 },
  unread: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: colors.white, fontSize: 12, fontWeight: '800' },
});

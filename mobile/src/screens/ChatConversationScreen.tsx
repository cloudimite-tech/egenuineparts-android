import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { connectChatSocket } from '../api/socket';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { Conversation, Message } from '../types';
import { ProductImage } from '../components/ProductImage';
import { clockTime, dayLabel, formatPrice } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatConversation'>;

type Row = { type: 'day'; key: string; label: string } | { type: 'msg'; key: string; msg: Message };

const QUICK_BUYER = ['Is this in stock?', 'Will it fit my vehicle?', 'Is it genuine?', 'Any warranty?'];
const QUICK_SELLER = ['Yes, in stock.', 'Please share your chassis code.', 'It fits — confirmed.'];

export function ChatConversationScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const [thread, setThread] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<FlatList<Row>>(null);

  useEffect(() => {
    apiClient.get<Conversation>(`/chat/conversations/${conversationId}`).then((r) => setThread(r.data)).catch(() => {});
    apiClient
      .get<Message[]>(`/chat/conversations/${conversationId}/messages`)
      .then((r) => {
        setMessages(r.data);
        useChatStore.getState().refreshUnread().catch(() => {});
      })
      .catch(() => setMessages([]));
  }, [conversationId]);

  useEffect(() => {
    if (!token) return;
    const socket = connectChatSocket(token);
    const join = () => socket.emit('join_conversation', { conversationId });
    join();
    socket.on('connect', join);

    const onNew = ({ conversationId: cid, message }: { conversationId: string; message: Message }) => {
      if (cid !== conversationId) return;
      setMessages((prev) => {
        const list = prev ?? [];
        // Replace our optimistic copy if this is the echo of our own send.
        if (message.clientId && list.some((m) => m.clientId === message.clientId)) {
          return list.map((m) => (m.clientId === message.clientId ? { ...message, pending: false } : m));
        }
        if (list.some((m) => m.id === message.id)) return list;
        return [...list, message];
      });
      if (message.senderId !== user?.id) {
        apiClient.post(`/chat/conversations/${conversationId}/read`).catch(() => {});
      }
    };
    const onBlocked = ({ conversationId: cid, clientId, reason }: { conversationId: string; clientId?: string; reason: string }) => {
      if (cid !== conversationId) return;
      setMessages((prev) => (prev ?? []).map((m) => (m.clientId === clientId ? { ...m, pending: false, blockedReason: reason } : m)));
      setNotice(reason);
    };
    socket.on('new_message', onNew);
    socket.on('message_blocked', onBlocked);
    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.off('connect', join);
      socket.off('new_message', onNew);
      socket.off('message_blocked', onBlocked);
      useChatStore.getState().refreshUnread().catch(() => {});
    };
  }, [conversationId, token, user?.id]);

  const send = useCallback(
    (text?: string) => {
      const body = (text ?? draft).trim();
      if (!body || !token) return;
      const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: Message = {
        id: clientId,
        clientId,
        conversationId,
        senderId: user?.id ?? '',
        body,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...(prev ?? []), optimistic]);
      setDraft('');
      setNotice(null);
      connectChatSocket(token).emit('send_message', { conversationId, body, clientId });
    },
    [draft, token, conversationId, user?.id],
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (const m of messages ?? []) {
      const d = dayLabel(m.createdAt);
      if (d !== lastDay) {
        out.push({ type: 'day', key: `d_${m.id}`, label: d });
        lastDay = d;
      }
      out.push({ type: 'msg', key: m.id, msg: m });
    }
    return out;
  }, [messages]);

  const quick = thread?.viewerIsSeller ? QUICK_SELLER : QUICK_BUYER;
  const product = thread?.product;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headAvatar}>
          <Ionicons name={thread?.viewerIsSeller ? 'person' : 'storefront'} size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.headName} numberOfLines={1}>
              {thread?.otherPartyName ?? ' '}
            </Text>
            {thread && !thread.viewerIsSeller && thread.store.verified ? (
              <Ionicons name="shield-checkmark" size={14} color="#60A5FA" />
            ) : null}
          </View>
          <Text style={styles.headSub}>{thread?.viewerIsSeller ? 'Buyer' : 'Seller'} · replies in the app</Text>
        </View>
        {thread && !thread.viewerIsSeller ? (
          <TouchableOpacity onPress={() => navigation.navigate('StoreProfile', { storeIdOrSlug: thread.store.slug })} hitSlop={8}>
            <Ionicons name="storefront-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      {product ? (
        <TouchableOpacity
          style={styles.productCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
        >
          <ProductImage url={product.images?.[0]?.url} style={{ width: 46, height: 46 }} iconSize={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.productLabel}>CHATTING ABOUT</Text>
            <Text style={styles.productTitle} numberOfLines={1}>
              {product.title}
            </Text>
          </View>
          <Text style={styles.productPrice}>{formatPrice(product.price, product.currency)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </TouchableOpacity>
      ) : null}

      {messages === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.sm, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={styles.safety}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
              <Text style={styles.safetyText}>
                Keep it on Genuine Parts.lk. Phone numbers, emails, links and requests to deal outside the app are blocked — so every sale stays protected.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'day') {
              return <Text style={styles.day}>{item.label}</Text>;
            }
            const m = item.msg;
            const mine = m.senderId === user?.id;
            const blocked = !!m.blockedReason;
            return (
              <View style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
                <View style={{ maxWidth: '80%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.mine : styles.theirs,
                      blocked && styles.blocked,
                      m.pending && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.bubbleText, mine && !blocked && { color: colors.white }, blocked && styles.blockedText]}>
                      {m.body}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    {blocked ? (
                      <>
                        <Ionicons name="alert-circle-outline" size={13} color={colors.accent} />
                        <Text style={[styles.meta, { color: colors.accent, fontWeight: '700' }]}>Not sent — contains contact details</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.meta}>{clockTime(m.createdAt)}</Text>
                        {mine ? (
                          <Ionicons name={m.pending ? 'time-outline' : 'checkmark-done'} size={14} color={colors.textFaint} />
                        ) : null}
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {notice ? (
        <View style={styles.notice}>
          <Ionicons name="hand-left-outline" size={18} color={colors.warning} />
          <Text style={styles.noticeText}>{notice}</Text>
          <TouchableOpacity onPress={() => setNotice(null)} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.warning} />
          </TouchableOpacity>
        </View>
      ) : null}

      {messages && messages.length < 2 ? (
        <View style={styles.quickRow}>
          {quick.map((q) => (
            <TouchableOpacity key={q} style={styles.quick} onPress={() => send(q)}>
              <Text style={styles.quickText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          placeholder={thread?.viewerIsSeller ? 'Reply to the buyer…' : 'Ask about this part…'}
          placeholderTextColor={colors.textFaint}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={[styles.send, !draft.trim() && { opacity: 0.4 }]} onPress={() => send()} disabled={!draft.trim()}>
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.headerBg,
    paddingTop: HEADER_TOP,
    paddingBottom: 12,
    paddingHorizontal: spacing.md - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  headName: { color: colors.white, fontWeight: '800', fontSize: 16, flexShrink: 1 },
  headSub: { color: '#A1A1AA', fontSize: 12, marginTop: 1 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: colors.accent },
  productTitle: { fontWeight: '700', fontSize: 14, marginTop: 1 },
  productPrice: { fontWeight: '900', fontSize: 14 },
  safety: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
  },
  safetyText: { flex: 1, color: '#1E3A8A', fontSize: 12, lineHeight: 17 },
  day: { alignSelf: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '700', marginVertical: spacing.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: colors.accent, borderBottomRightRadius: 5 },
  theirs: { backgroundColor: colors.white, borderBottomLeftRadius: 5 },
  blocked: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed' },
  blockedText: { color: colors.textMuted, textDecorationLine: 'line-through' },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 4 },
  meta: { fontSize: 11, color: colors.textFaint },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoft,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    padding: 12,
  },
  noticeText: { flex: 1, color: colors.warning, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  quick: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  quickText: { fontSize: 13, fontWeight: '600', color: colors.text },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.sm + 4,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    maxHeight: 120,
    color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});

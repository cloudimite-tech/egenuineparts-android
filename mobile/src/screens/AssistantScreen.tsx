import React, { useCallback, useRef, useState } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { colors, HEADER_TOP, radius, spacing } from '../theme/theme';
import { apiClient } from '../api/client';
import { AssistantReply, Product } from '../types';
import { GradientHeader } from '../components/GradientHeader';
import { ProductImage } from '../components/ProductImage';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { useBrowseFilterStore } from '../store/browseFilterStore';
import { discountPercent, formatPrice } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Assistant'>;

type Msg =
  | { id: string; from: 'user'; text: string }
  | { id: string; from: 'bot'; reply: AssistantReply };

const WELCOME: AssistantReply = {
  reply:
    "Hi! I'm the Genuine Parts.lk assistant \u{1F44B}\nTell me the part you need — like “brake pads for Axio 2016” or a part number — and I'll find it. I can also help with orders, delivery, payments and selling.",
  quickReplies: ['Brake pads for Axio 2016', 'Show today’s deals', 'Track my order', 'How does delivery work?', 'How do I sell?'],
};

// Conversation is kept for the app session so reopening the assistant
// doesn't lose context.
let sessionMessages: Msg[] = [{ id: 'welcome', from: 'bot', reply: WELCOME }];

export function AssistantScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const vehicle = useVehicleStore((s) => s.vehicle);
  const { setOnSaleOnly, requestVehicleSheet } = useBrowseFilterStore();
  const [messages, setMessagesState] = useState<Msg[]>(sessionMessages);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const setMessages = (updater: (m: Msg[]) => Msg[]) =>
    setMessagesState((prev) => {
      const next = updater(prev);
      sessionMessages = next;
      return next;
    });

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || thinking) return;
      setDraft('');
      setMessages((m) => [...m, { id: `u${Date.now()}`, from: 'user', text: message }]);
      setThinking(true);
      try {
        const { data } = await apiClient.post<AssistantReply>('/assistant', {
          message,
          vehicle: vehicle ? { make: vehicle.make, model: vehicle.model, year: vehicle.year } : undefined,
        });
        setMessages((m) => [...m, { id: `b${Date.now()}`, from: 'bot', reply: data }]);
      } catch {
        setMessages((m) => [
          ...m,
          { id: `b${Date.now()}`, from: 'bot', reply: { reply: 'Sorry, I couldn’t reach the server. Please try again in a moment.' } },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [thinking, vehicle],
  );

  const runAction = (type: NonNullable<AssistantReply['action']>['type']) => {
    switch (type) {
      case 'open_orders':
        return navigation.navigate('Orders');
      case 'sign_in':
        return navigation.navigate('Welcome');
      case 'open_sell':
        return profile?.store ? navigation.navigate('SellerDashboard') : navigation.navigate('StoreSetup', { mode: 'create' });
      case 'open_deals':
        setOnSaleOnly(true);
        return navigation.navigate('Main', { screen: 'Home' });
      case 'set_vehicle':
        requestVehicleSheet(true);
        return navigation.navigate('Main', { screen: 'Home' });
    }
  };

  const reset = () => setMessages(() => [{ id: 'welcome', from: 'bot', reply: WELCOME }]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <GradientHeader style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.botAvatar}>
          <MaterialCommunityIcons name="robot-happy-outline" size={22} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle}>Genuine Parts.lk Assistant</Text>
          <Text style={styles.headSub}>
            {vehicle ? `Shopping for ${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'Finds parts, tracks orders, answers questions'}
          </Text>
        </View>
        <TouchableOpacity onPress={reset} hitSlop={10}>
          <Ionicons name="refresh" size={21} color={colors.white} />
        </TouchableOpacity>
      </GradientHeader>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          thinking ? (
            <View style={[styles.botRow]}>
              <View style={styles.smallAvatar}>
                <MaterialCommunityIcons name="robot-happy-outline" size={16} color={colors.white} />
              </View>
              <View style={[styles.bubble, styles.botBubble, { paddingVertical: 12 }]}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          ) : null
        }
        renderItem={({ item, index }) =>
          item.from === 'user' ? (
            <View style={styles.userRow}>
              <View style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
            </View>
          ) : (
            <View style={{ marginBottom: 14 }}>
              <View style={styles.botRow}>
                <View style={styles.smallAvatar}>
                  <MaterialCommunityIcons name="robot-happy-outline" size={16} color={colors.white} />
                </View>
                <View style={[styles.bubble, styles.botBubble]}>
                  <Text style={styles.botText}>{item.reply.reply}</Text>
                </View>
              </View>

              {item.reply.products?.length ? (
                <FlatList
                  horizontal
                  data={item.reply.products}
                  keyExtractor={(p) => p.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingLeft: 38, paddingTop: 8 }}
                  renderItem={({ item: p }) => <MiniProduct p={p} onPress={() => navigation.navigate('ProductDetail', { productId: p.id })} />}
                />
              ) : null}

              {item.reply.action ? (
                <TouchableOpacity style={styles.action} onPress={() => runAction(item.reply.action!.type)}>
                  <Text style={styles.actionText}>{item.reply.action.label}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.accent} />
                </TouchableOpacity>
              ) : null}

              {/* Quick replies only on the latest bot message */}
              {index === messages.length - 1 && item.reply.quickReplies?.length ? (
                <View style={styles.quickRow}>
                  {item.reply.quickReplies.map((q) => (
                    <TouchableOpacity key={q} style={styles.quick} onPress={() => send(q)}>
                      <Text style={styles.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          )
        }
      />

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask about a part, order or delivery…"
          placeholderTextColor={colors.textFaint}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send(draft)}
          returnKeyType="send"
          maxLength={500}
        />
        <TouchableOpacity style={[styles.send, (!draft.trim() || thinking) && { opacity: 0.4 }]} onPress={() => send(draft)} disabled={!draft.trim() || thinking}>
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MiniProduct({ p, onPress }: { p: Product; onPress: () => void }) {
  const off = discountPercent(p.price, p.compareAtPrice);
  return (
    <TouchableOpacity style={styles.mini} onPress={onPress} activeOpacity={0.85}>
      <ProductImage url={p.images?.[0]?.url} categorySlug={p.category?.slug} style={styles.miniImg} rounded={8} iconSize={28} />
      {p.fitsVehicle ? (
        <View style={styles.fits}>
          <Ionicons name="checkmark-circle" size={11} color={colors.white} />
          <Text style={styles.fitsText}>Fits</Text>
        </View>
      ) : null}
      <Text style={styles.miniBrand} numberOfLines={1}>
        {p.brand}
      </Text>
      <Text style={styles.miniTitle} numberOfLines={2}>
        {p.title}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
        <Text style={styles.miniPrice}>{formatPrice(p.price, p.currency)}</Text>
        {off ? <Text style={styles.miniOff}>-{off}%</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: HEADER_TOP, paddingBottom: 12, paddingHorizontal: spacing.md - 4, flexDirection: 'row', alignItems: 'center', gap: 10 },
  botAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: colors.white, fontWeight: '800', fontSize: 16 },
  headSub: { color: '#A1A1AA', fontSize: 12, marginTop: 1 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  smallAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: colors.navy, borderBottomRightRadius: 5 },
  botBubble: { backgroundColor: colors.white, borderBottomLeftRadius: 5 },
  userText: { color: colors.white, fontSize: 15, lineHeight: 21 },
  botText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginLeft: 38,
    marginTop: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 38, marginTop: 10 },
  quick: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  quickText: { fontSize: 13, fontWeight: '600', color: colors.text },
  mini: { width: 138, backgroundColor: colors.white, borderRadius: radius.md, padding: 8 },
  miniImg: { width: 122, height: 96 },
  fits: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.success, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  fitsText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  miniBrand: { color: colors.accent, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 6 },
  miniTitle: { fontSize: 12, fontWeight: '600', lineHeight: 16, minHeight: 32 },
  miniPrice: { fontWeight: '900', fontSize: 14, marginTop: 2 },
  miniOff: { color: colors.accent, fontWeight: '800', fontSize: 11 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm + 4,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: { flex: 1, backgroundColor: colors.bg, borderRadius: 22, paddingHorizontal: 16, height: 44, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});

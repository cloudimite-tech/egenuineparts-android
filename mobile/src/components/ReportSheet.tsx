import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './Themed';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, themed } from '../theme/theme';
import { apiClient } from '../api/client';
import { SheetModal } from './SheetModal';
import { TextField } from './TextField';
import { Button } from './Button';
import { toast } from '../store/toastStore';
import { errorMessage } from '../utils/useRequireAccount';

export type ReportTarget = {
  type: 'PRODUCT' | 'STORE' | 'MESSAGE' | 'REVIEW' | 'CONVERSATION' | 'SERVICE' | 'USER';
  id: string;
  label: string;
  // What it's about, shown to our team (e.g. "Order AG-1A2B3C").
  context?: string;
};

const REASONS: { key: string; label: string }[] = [
  { key: 'SCAM', label: 'Scam or fraud' },
  { key: 'FAKE_OR_COUNTERFEIT', label: 'Fake or counterfeit part' },
  { key: 'CONTACT_OUTSIDE_APP', label: 'Asking to deal outside the app' },
  { key: 'ABUSIVE', label: 'Abusive or harassing' },
  { key: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { key: 'WRONG_INFO', label: 'Wrong or misleading information' },
  { key: 'SPAM', label: 'Spam' },
  { key: 'OTHER', label: 'Something else' },
];

// Reporting a buyer you've dealt with (order, appointment).
const BUYER_REASONS: { key: string; label: string }[] = [
  { key: 'NO_SHOW', label: 'Fake order or didn’t show up' },
  { key: 'PAYMENT_ISSUE', label: 'Refused to pay or payment problem' },
  { key: 'SCAM', label: 'Scam or fraud' },
  { key: 'ABUSIVE', label: 'Abusive or harassing' },
  { key: 'CONTACT_OUTSIDE_APP', label: 'Asking to deal outside the app' },
  { key: 'SPAM', label: 'Spam' },
  { key: 'OTHER', label: 'Something else' },
];
// Reporting a seller about a specific order or appointment.
const SELLER_DEAL_REASONS: { key: string; label: string }[] = [
  { key: 'NO_SHOW', label: 'Didn’t deliver or didn’t show up' },
  { key: 'FAKE_OR_COUNTERFEIT', label: 'Fake, wrong or damaged part' },
  { key: 'PAYMENT_ISSUE', label: 'Overcharged or payment problem' },
  { key: 'SCAM', label: 'Scam or fraud' },
  { key: 'ABUSIVE', label: 'Abusive or harassing' },
  { key: 'CONTACT_OUTSIDE_APP', label: 'Asking to deal outside the app' },
  { key: 'OTHER', label: 'Something else' },
];
function reasonsFor(t: ReportTarget | null) {
  if (t?.type === 'USER') return BUYER_REASONS;
  if (t?.type === 'STORE' && t.context) return SELLER_DEAL_REASONS;
  return REASONS;
}

// Report a listing, store, message, review or conversation to our team.
export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const close = () => {
    setReason(null);
    setDetails('');
    onClose();
  };

  const send = async () => {
    if (!target || !reason) return;
    setSending(true);
    try {
      await apiClient.post('/reports', { targetType: target.type, targetId: target.id, reason, details: details.trim() || undefined, context: target.context });
      toast.success('Thanks - our team will review it');
      close();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <SheetModal
      visible={!!target}
      onClose={close}
      title={target ? `Report ${target.label}` : 'Report'}
      footer={<Button title="Send report" onPress={send} loading={sending} disabled={!reason} />}
    >
      <Text style={styles.lead}>Reports are confidential - the other person isn’t told who reported them.</Text>
      {reasonsFor(target).map((r) => (
        <TouchableOpacity key={r.key} style={styles.row} onPress={() => setReason(r.key)}>
          <Ionicons name={reason === r.key ? 'radio-button-on' : 'radio-button-off'} size={20} color={reason === r.key ? colors.accent : colors.textFaint} />
          <Text style={[styles.rowText, reason === r.key && { fontWeight: '800' }]}>{r.label}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ marginTop: spacing.md }}>
        <TextField label="More details" optional placeholder="What happened?" value={details} onChangeText={setDetails} multiline maxLength={1000} />
      </View>
    </SheetModal>
  );
}

const styles = themed(() => StyleSheet.create({
  lead: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowText: { fontSize: 15, color: colors.text },
}));

export const reportStyles = themed(() => StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8 },
  linkText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chip: { borderRadius: radius.pill },
}));

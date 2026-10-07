import { Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Guests create a seller account; signed-in buyers apply from their own
// account (same verification) and keep shopping while they're reviewed.
export function startSelling(navigation: any) {
  const { isGuest, profile } = useAuthStore.getState();
  if (isGuest) {
    navigation.navigate('Signup', { sell: true });
    return;
  }
  const status = profile?.store?.status;
  if (status === 'APPROVED') {
    navigation.navigate('SellerDashboard');
    return;
  }
  if (status) {
    navigation.navigate('SellerGate');
    return;
  }
  Alert.alert(
    'Become a seller',
    'To keep buyers safe, every seller is verified. You’ll need:\n\n• Your NIC (front and back)\n• Your Business Registration (BR) certificate\n• Your shop’s address and location\n• A selfie at your shop\n\nYou can keep buying while we review your application.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Start', onPress: () => navigation.navigate('SellerApplication') },
    ],
  );
}

export function sellerStatusLabel(status?: string | null) {
  switch (status) {
    case 'PENDING':
      return 'Under review';
    case 'REJECTED':
      return 'Needs changes';
    case 'SUSPENDED':
      return 'Suspended';
    case 'APPROVED':
      return 'Approved';
    default:
      return undefined;
  }
}

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SelectedVehicle {
  make: string;
  model: string;
  year: number;
  label?: string;
}

interface VehicleState {
  vehicle: SelectedVehicle | null;
  hydrate: () => Promise<void>;
  setVehicle: (v: SelectedVehicle | null) => void;
}

const KEY = 'redline_vehicle';

// The "shopping for" vehicle. Kept on-device so guests get fitment
// filtering too, without an account.
export const useVehicleStore = create<VehicleState>((set) => ({
  vehicle: null,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) set({ vehicle: JSON.parse(raw) });
    } catch {}
  },
  setVehicle: (vehicle) => {
    set({ vehicle });
    (vehicle ? AsyncStorage.setItem(KEY, JSON.stringify(vehicle)) : AsyncStorage.removeItem(KEY)).catch(() => {});
  },
}));

export const vehicleLabel = (v: SelectedVehicle) => `${v.make} ${v.model} ${v.year}`;

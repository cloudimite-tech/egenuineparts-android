import { create } from 'zustand';

// Cross-screen handoff for Home's filters: Categories, the assistant and
// the sale rail set these, and Home applies them when it comes into focus.
interface BrowseFilterState {
  categoryId: string | null;
  categoryName: string | null;
  onSaleOnly: boolean;
  vehicleSheetRequested: boolean;
  setCategory: (id: string, name: string) => void;
  clear: () => void;
  setOnSaleOnly: (v: boolean) => void;
  requestVehicleSheet: (v: boolean) => void;
}

export const useBrowseFilterStore = create<BrowseFilterState>((set) => ({
  categoryId: null,
  categoryName: null,
  onSaleOnly: false,
  vehicleSheetRequested: false,
  setCategory: (id, name) => set({ categoryId: id, categoryName: name }),
  clear: () => set({ categoryId: null, categoryName: null }),
  setOnSaleOnly: (onSaleOnly) => set({ onSaleOnly }),
  requestVehicleSheet: (vehicleSheetRequested) => set({ vehicleSheetRequested }),
}));

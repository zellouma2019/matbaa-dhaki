import { create } from "zustand";
import type { PrintOrderLite } from "@/lib/order-types";
import type { CreatedOrder } from "@/components/app/app-shell";

type View = "new" | "repeat" | "track" | "admin";

interface AppState {
  shopId: string;
  setShopId: (v: string) => void;

  // التنقل
  view: View;
  setView: (v: View) => void;

  // طلب جديد
  createdOrder: CreatedOrder | null;
  setCreatedOrder: (o: CreatedOrder | null) => void;

  // تكرار طلب
  prefillOrder: PrintOrderLite | null;
  setPrefillOrder: (o: PrintOrderLite | null) => void;

  // الإدارة
  adminUnlocked: boolean;
  setAdminUnlocked: (v: boolean) => void;
  adminGateOpen: boolean;
  setAdminGateOpen: (v: boolean) => void;
  adminCode: string;
  setAdminCode: (v: string) => void;

  // تحديث البيانات
  refreshKey: number;
  incrementRefresh: () => void;

  // المقدمة
  showIntro: boolean;
  setShowIntro: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  shopId: "",
  setShopId: (v) => set({ shopId: v }),

  view: "new",
  setView: (v) => set({ view: v }),

  createdOrder: null,
  setCreatedOrder: (o) => set({ createdOrder: o }),

  prefillOrder: null,
  setPrefillOrder: (o) => set({ prefillOrder: o }),

  adminUnlocked: false,
  setAdminUnlocked: (v) => set({ adminUnlocked: v }),
  adminGateOpen: false,
  setAdminGateOpen: (v) => set({ adminGateOpen: v }),
  adminCode: "",
  setAdminCode: (v) => set({ adminCode: v }),

  refreshKey: 0,
  incrementRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),

  showIntro: true,
  setShowIntro: (v) => set({ showIntro: v }),
}));
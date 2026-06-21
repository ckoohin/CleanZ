import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TaskerOnboardingState {
  // Persisted state
  personalInfo: {
    phone?: string;
    bio?: string;
    experience?: string;
    skills?: string;
    addressResident?: string;
    addressCurrent?: string;
  };
  docIdNumber: string;
  bankInfo: {
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  currentStep: number;
  maxStepReached: number;
  // User sở hữu dữ liệu đang lưu — để reset khi đổi tài khoản trên cùng trình duyệt
  ownerUserId: string | null;

  // Transient state (not persisted)
  citizenCard: File[];
  idWithSelfie: File[];
  criminalRecord: File[];
  healthCertificate: File[];
  certificate: File[];

  // Actions
  setPersonalInfo: (info: Partial<TaskerOnboardingState["personalInfo"]>) => void;
  setDocIdNumber: (id: string) => void;
  setBankInfo: (info: Partial<TaskerOnboardingState["bankInfo"]>) => void;
  setCurrentStep: (step: number) => void;
  setMaxStepReached: (step: number) => void;
  setFiles: (
    type: "citizenCard" | "idWithSelfie" | "criminalRecord" | "healthCertificate" | "certificate",
    files: File[]
  ) => void;
  resetStore: () => void;
  /** Reset toàn bộ nếu user đang đăng nhập khác với chủ dữ liệu đã lưu */
  syncOwner: (userId: string | null) => void;
}

const EMPTY_STATE: Pick<
  TaskerOnboardingState,
  | "personalInfo"
  | "docIdNumber"
  | "bankInfo"
  | "currentStep"
  | "maxStepReached"
  | "citizenCard"
  | "idWithSelfie"
  | "criminalRecord"
  | "healthCertificate"
  | "certificate"
> = {
  personalInfo: {},
  docIdNumber: "",
  bankInfo: {},
  currentStep: 0,
  maxStepReached: 0,
  citizenCard: [],
  idWithSelfie: [],
  criminalRecord: [],
  healthCertificate: [],
  certificate: [],
};

export const useTaskerOnboardingStore = create<TaskerOnboardingState>()(
  persist(
    (set) => ({
      // Default state
      ...EMPTY_STATE,
      ownerUserId: null,

      // Actions
      setPersonalInfo: (info) =>
        set((state) => ({ personalInfo: { ...state.personalInfo, ...info } })),
      setDocIdNumber: (id) => set({ docIdNumber: id }),
      setBankInfo: (info) =>
        set((state) => ({ bankInfo: { ...state.bankInfo, ...info } })),
      setCurrentStep: (step) => set({ currentStep: step }),
      setMaxStepReached: (step) =>
        set((state) => ({ maxStepReached: Math.max(state.maxStepReached, step) })),
      setFiles: (type, files) => set({ [type]: files }),
      resetStore: () => set({ ...EMPTY_STATE }),
      syncOwner: (userId) =>
        set((state) =>
          state.ownerUserId === userId
            ? {}
            : { ...EMPTY_STATE, ownerUserId: userId },
        ),
    }),
    {
      name: "tasker-onboarding-storage",
      // Chỉ persist các field text/metadata, loại trừ các File object không serialize được
      partialize: (state) => ({
        personalInfo: state.personalInfo,
        bankInfo: state.bankInfo,
        currentStep: state.currentStep,
        maxStepReached: state.maxStepReached,
        ownerUserId: state.ownerUserId,
      }),
    }
  )
);

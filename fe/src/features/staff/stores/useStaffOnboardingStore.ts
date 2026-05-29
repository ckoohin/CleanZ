import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StaffOnboardingState {
  // Persisted state
  personalInfo: {
    phone?: string;
    bio?: string;
    experience?: string;
    skills?: string;
    addressResident?: string;
    addressCurrent?: string;
  };
  serviceIds: string[];
  bankInfo: {
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  currentStep: number;
  maxStepReached: number;

  // Transient state (not persisted)
  citizenCard: File[];
  idWithSelfie: File[];
  criminalRecord: File[];
  healthCertificate: File[];
  certificate: File[];

  // Actions
  setPersonalInfo: (info: Partial<StaffOnboardingState["personalInfo"]>) => void;
  setServiceIds: (ids: string[]) => void;
  setBankInfo: (info: Partial<StaffOnboardingState["bankInfo"]>) => void;
  setCurrentStep: (step: number) => void;
  setMaxStepReached: (step: number) => void;
  setFiles: (
    type: "citizenCard" | "idWithSelfie" | "criminalRecord" | "healthCertificate" | "certificate",
    files: File[]
  ) => void;
  resetStore: () => void;
}

export const useStaffOnboardingStore = create<StaffOnboardingState>()(
  persist(
    (set) => ({
      // Default persisted state
      personalInfo: {},
      serviceIds: [],
      bankInfo: {},
      currentStep: 0,
      maxStepReached: 0,

      // Default transient state
      citizenCard: [],
      idWithSelfie: [],
      criminalRecord: [],
      healthCertificate: [],
      certificate: [],

      // Actions
      setPersonalInfo: (info) =>
        set((state) => ({ personalInfo: { ...state.personalInfo, ...info } })),
      setServiceIds: (ids) => set({ serviceIds: ids }),
      setBankInfo: (info) =>
        set((state) => ({ bankInfo: { ...state.bankInfo, ...info } })),
      setCurrentStep: (step) => set({ currentStep: step }),
      setMaxStepReached: (step) =>
        set((state) => ({ maxStepReached: Math.max(state.maxStepReached, step) })),
      setFiles: (type, files) => set({ [type]: files }),
      resetStore: () =>
        set({
          personalInfo: {},
          serviceIds: [],
          bankInfo: {},
          currentStep: 0,
          maxStepReached: 0,
          citizenCard: [],
          idWithSelfie: [],
          criminalRecord: [],
          healthCertificate: [],
          certificate: [],
        }),
    }),
    {
      name: "staff-onboarding-storage",
      // Chỉ persist các field text/metadata, loại trừ các File object không serialize được
      partialize: (state) => ({
        personalInfo: state.personalInfo,
        serviceIds: state.serviceIds,
        bankInfo: state.bankInfo,
        currentStep: state.currentStep,
        maxStepReached: state.maxStepReached,
      }),
    }
  )
);

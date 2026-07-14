import { atomWithImmer } from "jotai-immer";

export type SnapshotData = {
  config: { daytime_start: string; daytime_end: string };
  plans: Record<string, unknown>[];
};

export type PlanEntry = SnapshotData["plans"][number];

export const EMPTY_DATA: SnapshotData = {
  config: { daytime_start: "10:00", daytime_end: "18:00" },
  plans: [],
};

export type PricingStore = {
  data: SnapshotData;
  savedData: SnapshotData;
  snapshotName: string;
  initialized: boolean;
};

export const pricingStoreAtom = atomWithImmer<PricingStore>({
  data: EMPTY_DATA,
  savedData: EMPTY_DATA,
  snapshotName: "",
  initialized: false,
});

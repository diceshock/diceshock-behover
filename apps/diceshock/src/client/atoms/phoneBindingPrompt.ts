import { atom } from "jotai";

export interface PhoneBindingPromptState {
  open: boolean;
}

export const phoneBindingPromptAtom = atom<PhoneBindingPromptState>({
  open: false,
});

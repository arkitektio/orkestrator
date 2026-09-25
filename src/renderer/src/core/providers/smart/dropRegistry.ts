import { create } from "zustand";
import { useEffect, useRef } from "react";

import { Action } from "@/core/lib/localactions/LocalActionProvider";
import { Structure } from "@/core/types";

export type SmartDropHandlerContext = {
  objects: Structure[];
  partners: Structure[];
  matchingActions: Action[];
};

export type SmartDropHandler = (
  context: SmartDropHandlerContext,
) => Promise<boolean | void> | boolean | void;

export type SmartDropRegistration = {
  id: string;
  objects: string[];
  partners: string[];
  actionTitles?: string[];
  handler: SmartDropHandler;
};

type SmartDropRegistryState = {
  registrations: SmartDropRegistration[];
  register: (registration: SmartDropRegistration) => void;
  unregister: (id: string) => void;
  findMatchingRegistration: (
    context: SmartDropHandlerContext,
  ) => SmartDropRegistration | undefined;
};

const buildSignature = (structures: Array<Structure | string>) =>
  structures
    .map((structure) =>
      typeof structure === "string" ? structure : structure.identifier,
    )
    .slice()
    .sort()
    .join("|");

export const useSmartDropRegistry = create<SmartDropRegistryState>((set, get) => ({
  registrations: [],
  register: (registration) => {
    set((state) => ({
      registrations: [
        ...state.registrations.filter((entry) => entry.id !== registration.id),
        registration,
      ],
    }));
  },
  unregister: (id) => {
    set((state) => ({
      registrations: state.registrations.filter((registration) => registration.id !== id),
    }));
  },
  findMatchingRegistration: (context) => {
    const objectSignature = buildSignature(context.objects);
    const partnerSignature = buildSignature(context.partners);

    return get().registrations.find((registration) => {
      if (buildSignature(registration.objects) !== objectSignature) {
        return false;
      }

      if (buildSignature(registration.partners) !== partnerSignature) {
        return false;
      }

      if (!registration.actionTitles?.length) {
        return true;
      }

      return context.matchingActions.some((action) =>
        registration.actionTitles?.includes(action.title),
      );
    });
  },
}));

export const smartDropRegistryStore = useSmartDropRegistry;

let nextRegistrationId = 0;

export const useRegisterSmartDropHandler = (
  registration: Omit<SmartDropRegistration, "id">,
) => {
  const register = useSmartDropRegistry((state) => state.register);
  const unregister = useSmartDropRegistry((state) => state.unregister);
  const registrationIdRef = useRef<string>(`smart-drop-${nextRegistrationId++}`);

  useEffect(() => {
    const id = registrationIdRef.current;

    register({
      id,
      ...registration,
    });

    return () => {
      unregister(id);
    };
  }, [register, registration, unregister]);
};

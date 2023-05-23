import React from "react";
import { useAlert } from "../../../components/alerter/alerter-context";
import { notEmpty } from "../../../floating/utils";
import { useSettings } from "../../../settings/settings-context";
import { ListReservationFragment, ReservationStatus } from "../../api/graphql";
import { useRequester } from "../requester/requester-context";
import { useReserver } from "../reserver/reserver-context";
import { Accept, Mate, MaterContext, Partner } from "./mater-context";

export interface MaterProviderProps {
  children: React.ReactNode;
}

export const MaterProvider: React.FC<MaterProviderProps> = ({ children }) => {
  const { reservations } = useReserver();
  const { assign } = useRequester();
  const { alert } = useAlert();
  const {
    settings: { allowBatch },
  } = useSettings();

  const requestMate = async (
    self: Partner,
    partners: Partner[],
    res: ListReservationFragment,
    isBatch: boolean = false,
    isSelf: boolean = false
  ) => {
    const itemIdentifiers = new Set(
      partners.map((el) => el.identifier as string)
    );

    if (itemIdentifiers.size > 1) {
      alert({
        message: "Multiple models in the same selection is not supported yet",
      });
      return;
    }

    const selfArg = res.node?.args?.at(0);
    if (!selfArg) {
      alert({
        message:
          "Node has no arguments. Dropping here does not affect anything",
      });
      return;
    }

    console.log(self, partners, res, isBatch, isSelf);

    if (partners.length > 1) {
      if (isSelf) {
        if (isBatch) {
          partners.map((el) =>
            assign({
              reservation: res,
              defaults: {
                [selfArg.key]: el.object,
              },
            })
          );
        } else {
          assign({
            reservation: res,
            defaults: {
              [selfArg.key]: partners.map((el) => el.object),
            },
          });
        }
      } else {
        const mateArg = res.node?.args?.at(1);

        if (
          mateArg?.child?.identifier &&
          itemIdentifiers.has(mateArg?.child?.identifier)
        ) {
          assign({
            reservation: res,
            defaults: {
              [selfArg.key]: self.object,
              [mateArg.key]: partners.map((el) => el.object),
            },
          });
        } else if (
          allowBatch &&
          mateArg?.identifier &&
          itemIdentifiers.has(mateArg?.identifier)
        ) {
          console.log("Batching together");
          partners.map((el) =>
            assign({
              reservation: res,
              defaults: {
                [selfArg.key]: self.object,
                [mateArg.key]: el.object,
              },
            })
          );
        } else {
          alert({
            message: "Second Argument does not match",
          });
        }
      }
    }

    if (partners.length == 1) {
      if (isSelf) {
        assign({
          reservation: res,
          defaults: {
            [selfArg.key]: partners[0].object,
          },
        });
      } else {
        const mateArg = res.node?.args?.at(1);
        if (mateArg?.identifier && itemIdentifiers.has(mateArg?.identifier)) {
          assign({
            reservation: res,
            defaults: {
              [selfArg.key]: self.object,
              [mateArg.key]: partners[0].object,
            },
          });
        } else {
          alert({
            message: "Second Argument does not match",
          });
        }
      }
    }
  };

  const calculateMates = (over: Accept, self: Partner): Mate[] => {
    if (!reservations) {
      return [];
    }

    const [modifier, element] = over.split(":");
    const left = self.identifier;

    if (modifier === "item") {
      const partner_reservations = reservations?.reservations
        ?.filter((res) => res?.status == ReservationStatus.Active)
        .filter(notEmpty)
        .filter(
          (res) =>
            res?.node?.args?.at(0)?.identifier == left &&
            res?.node?.args?.at(1)?.identifier == element
        )
        .map((res) => ({
          accepts: [`item:${res?.node?.args?.at(1)?.identifier}`] as Accept[],
          action: (self: Partner, mates: Partner[]) =>
            requestMate(self, mates, res, false),
          label: res.node?.name || "Error here",
        }));

      return partner_reservations || [];
    }

    if (modifier == "list") {
      const partner_reservations =
        reservations?.reservations
          ?.filter((res) => res?.status == ReservationStatus.Active)
          .filter(notEmpty)
          ?.filter(
            (res) =>
              res?.node?.args?.at(0)?.child?.identifier == left &&
              res?.node?.args?.at(1)?.identifier == element
          )
          .map((res) => ({
            accepts: [
              `list:${res?.node?.args?.at(1)?.child?.identifier}`,
            ] as Accept[],
            action: (self: Partner, mates: Partner[]) =>
              requestMate(self, mates, res, false),
            label: res.node?.name || "Error here",
          })) || [];

      const batched_reservations = allowBatch
        ? reservations?.reservations
            ?.filter((res) => res?.status == ReservationStatus.Active)
            .filter(notEmpty)
            .filter(
              (res) =>
                res?.node?.args?.at(0)?.identifier == left &&
                res?.node?.args?.at(1)?.identifier == element
            )
            .map((res) => ({
              accepts: [
                `list:${res?.node?.args?.at(1)?.identifier}`,
              ] as Accept[],
              action: (self: Partner, mates: Partner[]) =>
                requestMate(self, mates, res, true),
              label: res.node?.name || "Error here",
            })) || []
        : [];

      return partner_reservations.concat(batched_reservations) || [];
    }

    return [];
  };

  const calculateSelfMates = (over: Accept, self: Partner): Mate[] => {
    if (!reservations) {
      return [];
    }

    console.log("Calculating self mates for list", over, self);

    const [modifier, element] = over.split(":");
    const left = self.identifier;

    if (modifier === "item") {
      const partner_reservations = reservations?.reservations
        ?.filter((res) => res?.status == ReservationStatus.Active)
        .filter((res) => res?.node?.args?.at(0)?.identifier == element)
        .filter(notEmpty)
        .map((res) => ({
          accepts: [`item:${res?.node?.args?.at(0)?.identifier}`] as Accept[],
          action: (self: Partner, mates: Partner[]) =>
            requestMate(self, mates, res, false, true),
          label:
            res.node?.args?.at(1)?.identifier == element
              ? res.node?.name + " (with self)"
              : res.node?.name || "Error here",
        }));

      return partner_reservations || [];
    }

    if (modifier == "list") {
      console.log("Calculating self mates for list");
      const partner_reservations =
        reservations?.reservations
          ?.filter((res) => res?.status == ReservationStatus.Active)
          ?.filter(
            (res) => res?.node?.args?.at(0)?.child?.identifier == element
          )
          .filter(notEmpty)
          .map((res) => ({
            accepts: [
              `list:${res?.node?.args?.at(0)?.child?.identifier}`,
            ] as Accept[],
            action: (self: Partner, mates: Partner[]) =>
              requestMate(self, mates, res, false, true),
            label: res.node?.name || "Error here",
          })) || [];

      const batched_reservations = allowBatch
        ? reservations?.reservations
            ?.filter((res) => res?.status == ReservationStatus.Active)
            .filter((res) => res?.node?.args?.at(0)?.identifier == element)
            .filter(notEmpty)
            .map((res) => ({
              accepts: [
                `list:${res?.node?.args?.at(0)?.identifier}`,
              ] as Accept[],
              action: (self: Partner, mates: Partner[]) =>
                requestMate(self, mates, res, true, true),
              label:
                res.node?.args?.at(1)?.identifier == element
                  ? res.node?.name + " (with self) (Batch)"
                  : res.node?.name + " (Batch)" || "Error here",
            })) || []
        : [];

      return partner_reservations.concat(batched_reservations);
    }

    return [];
  };
  return (
    <MaterContext.Provider
      value={{
        reservations,
        calculateMates,
        calculateSelfMates,
      }}
    >
      {children}
    </MaterContext.Provider>
  );
};

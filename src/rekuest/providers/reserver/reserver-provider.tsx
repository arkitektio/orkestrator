import React from "react";
import { v4 as uuidv4 } from "uuid";
import { useAlert } from "../../../components/alerter/alerter-context";
import { DetailReservationFragment } from "../../api/graphql";
import { usePostman } from "../postman/postman-context";
import {
  Defered,
  ReserveOptions,
  ReserverContext,
  ReserveRequest,
  UnreserveOptions,
} from "./reserver-context";

export type ReserverProviderProps = {
  children: React.ReactNode;
  defaults?: Omit<ReserveOptions, "node">;
  autoResolve?: boolean;
};

export const ReserverProvider: React.FC<ReserverProviderProps> = ({
  children,
  defaults = {},
  autoResolve,
}) => {
  const { reserve: postreserve, unreserve: postunreserve } = usePostman();
  const { alert } = useAlert();

  const [pendingRequests, setPendingRequests] = React.useState<
    ReserveRequest[]
  >([]);
  const [resolvedRequests, setResolvedRequests] = React.useState<
    ReserveRequest[]
  >([]);

  const resolve = (request: ReserveRequest) => {
    let x = postreserve(request.options);
    x.then((reserve) => {
      if (reserve) {
        request.defered.resolve(reserve);

        setPendingRequests((pendingRequests) =>
          pendingRequests.filter((r) => r.id !== request.id)
        );
        setResolvedRequests((resolvedRequests) => [
          ...resolvedRequests,
          request,
        ]);
      }
    });
    return x;
  };

  const reject = (request: ReserveRequest) => {
    setPendingRequests(pendingRequests.filter((r) => r.id !== request.id));
  };

  const reserve = (options: ReserveOptions) => {
    if (autoResolve) {
      return postreserve(options).then((x) => x);
    }

    var defered = new Defered();

    var promise = new Promise<DetailReservationFragment>((resolve, reject) => {
      defered.resolver = resolve;
      defered.rejecter = reject;
    });

    setPendingRequests((pendingRequests) => {
      return [
        ...pendingRequests,
        { id: uuidv4(), options: options, defered: defered },
      ];
    });

    return promise;
  };

  const unreserve = (options: UnreserveOptions) => {
    postunreserve(options)
      .then(() => {
        console.log("Unreserved");
      })
      .catch((e) => alert(e.message));
  };

  return (
    <ReserverContext.Provider
      value={{
        unreserve: unreserve,
        reserve: reserve,
        resolve: resolve,
        reject: reject,
        pending: pendingRequests,
      }}
    >
      {children}
    </ReserverContext.Provider>
  );
};

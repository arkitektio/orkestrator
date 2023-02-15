import React, { useState, useEffect } from "react";
import { useFakts } from "@jhnnsrs/fakts";
import { DeadJSON, HealthReturn, HealthyJSON, HealthzContext } from "./context";

export interface HealthzProviderProps {
  children: React.ReactNode;
}

const checkHealth = async (
  name: string,
  healthz: string
): Promise<HealthReturn> => {
  try {
    const res = await fetch(`${healthz}/?format=json`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.ok) return { name, ok: (await res.json()) as HealthyJSON };
    else {
      return { name, error: (await res.json()) as DeadJSON };
    }
  } catch (e) {
    return { name, error: { Connection: (e as any).message } };
  }
};

export const HealthzProvider: React.FC<HealthzProviderProps> = (props) => {
  const { fakts } = useFakts();
  const [global_error, setGlobalError] = useState<string | null>(null);
  const [errors, setErrors] = useState<HealthReturn[] | undefined>();
  const [reload, setReload] = useState<boolean>(false);

  useEffect(() => {
    if (fakts) {
      try {
        let checks = [];

        for (let key in fakts) {
          let value = fakts[key as keyof any] as any;
          if (value.healthz) {
            checks.push(checkHealth(key, value.healthz));
          }
        }

        Promise.all(checks).then((values) => {
          let errors = values.filter((value) => value.error);
          console.log(errors);
        });
      } catch (e) {
        console.log(e);
        setGlobalError("Couldn not connect");
      }
    }
  }, [fakts, reload]);

  useEffect(() => {
    if (errors) {
      const interval = setInterval(() => {
        setReload(!reload);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [errors]);

  return (
    <HealthzContext.Provider value={{ errors }}>
      {props.children}
    </HealthzContext.Provider>
  );
};

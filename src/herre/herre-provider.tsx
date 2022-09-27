import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useFakts } from "../fakts/fakts-config";
import { PKCECodePair } from "../pkce/pkce";
import { toUrlEncoded } from "../pkce/util";
import { HerreContext } from "./herre-context";
import { HerreUser } from "./herre-types";
import { TokenRequestBody } from "./pkce/AuthService";
import { createPKCECodes } from "./pkce/pkce";

export type WrappedHerreProps = {
  children?: React.ReactNode;
};

export type HerreProps = {};

export type Auth = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
};

export const HerreProvider: React.FC<WrappedHerreProps> = (props) => {
  const [user, setUser] = useState<HerreUser | undefined>();
  const [access_token, setAccessToken] = useState<string | undefined>();
  const [refresh_token, setRefreshToken] = useState<string | undefined>();
  const [staging_token, setStagingToken] = useState<string | undefined>();
  const [code, setCode] = useState<string | undefined>();
  const { fakts } = useFakts();
  const location = useLocation();
  const navigate = useNavigate();

  const getPkce = () => {
    const pkce = localStorage.getItem("pkce");
    if (null === pkce) {
      throw new Error("PKCE pair not found in local storage");
    } else {
      return JSON.parse(pkce) as PKCECodePair;
    }
  };

  const getAuth = () => {
    const auth = localStorage.getItem("auth");
    if (!auth) {
      return undefined;
    } else {
      try {
        return JSON.parse(auth) as Auth;
      } catch (e) {
        return undefined;
      }
    }
  };

  useEffect(() => {
    const auth = getAuth();
    if (auth) {
      setStagingToken(auth.access_token);
      setRefreshToken(auth.refresh_token);
    }
  }, []);

  const fetchToken = async (code: string, isRefresh = false) => {
    const grantType = "authorization_code";

    let payload: TokenRequestBody = {
      clientId: fakts.herre.client_id.trim(),
      clientSecret: fakts.herre.client_secret.trim(),
      redirectUri: window.location.origin + "/callback",
      grantType,
    };
    console.log(payload);

    if (isRefresh) {
      payload = {
        ...payload,
        grantType: "refresh_token",
        refresh_token: code,
      };
    } else {
      const pkce: PKCECodePair = getPkce();
      const codeVerifier = pkce.codeVerifier;
      payload = {
        ...payload,
        code,
        codeVerifier,
      };
    }

    console.log(payload);
    const response = await fetch(`${fakts.herre.base_url}/token/`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: toUrlEncoded(payload),
    }).catch((e) => {
      console.log({ e });
      throw e;
    });

    const json = await response.json();
    console.log(json);
    return json;
  };

  useEffect(() => {
    if (code) {
      console.log("Code changed, challenging server");
      fetchToken(code).then((token) => {
        localStorage.setItem("auth", token);
        setStagingToken(token.access_token);
        setRefreshToken(token.refresh_token);
      });
    }
  }, [code]);

  useEffect(() => {
    if (staging_token && fakts) {
      console.log(`Fetching user from ${fakts.herre.base_url}/userinfo/`);
      fetch(`${fakts.herre.base_url}/userinfo/`, {
        headers: {
          Authorization: `Bearer ${staging_token}`,
        },
        method: "GET",
      }).then(
        (result) => {
          if (result) {
            result.json().then((data) => {
              console.log(data);
              if (data.error) {
                logout();
              }
              if (data.sub) {
                setUser(data);
                setAccessToken(staging_token);
                localStorage.setItem(
                  "auth",
                  JSON.stringify({
                    access_token: staging_token,
                    refresh_token: refresh_token,
                  })
                );
                let path = localStorage.getItem("preAuthUri");
                if (path) {
                  localStorage.removeItem("preAuthUri");
                  navigate("/user");
                }
              }
            });
          } else {
            console.log("Didnt receive an Associated User", result);
          }
        },
        (error) => {
          console.error(error);
          logout();
        }
      );
    }
  }, [staging_token]);

  const logout = () => {
    console.log("Logging Out");
    localStorage.removeItem("auth");
    setUser(undefined);
    setAccessToken(undefined);
  };

  const login = () => {
    console.log("Logging in");
    //service?.login();

    const pkce = createPKCECodes();
    localStorage.setItem("pkce", JSON.stringify(pkce));
    localStorage.setItem("preAuthUri", location.pathname);

    const codeChallenge = pkce.codeChallenge;

    const query = {
      clientId: fakts.herre.client_id.trim(),
      scopes: fakts.herre.scopes.join(" "),
      responseType: "code",
      redirectUri: window.location.origin + "/callback",
      codeChallenge,
      codeChallengeMethod: "S256",
    };
    // Responds with a 302 redirect
    const url = `${fakts.herre.base_url}/authorize/?${toUrlEncoded(query)}`;
    window.location.replace(url);
  };

  return (
    <HerreContext.Provider
      value={{
        logout: logout,
        login: login,
        setCode: setCode,
        user: user,
        token: access_token,
      }}
    >
      {props.children}
    </HerreContext.Provider>
  );
};

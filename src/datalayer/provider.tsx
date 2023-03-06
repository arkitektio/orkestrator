import { useState } from "react";
import { AwsClient } from "aws4fetch";
import { DatalayerConfig, DatalayerContext, UploadOptions } from "./context";
import { Credentials } from "../mikro/api/graphql";

export type DatalayerProps = {
  children: React.ReactNode;
};

export const createAwsClient = (credentials: Credentials) => {
  return new AwsClient({
    secretAccessKey: credentials.accessKey,
    accessKeyId: credentials.secretKey,
    sessionToken: credentials.sessionToken,
  });
};

export const uploadFetch = (
  url: RequestInfo | URL,
  options?:
    | (RequestInit & { onProgress?: (ev: ProgressEvent) => void })
    | undefined
) =>
  new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status !== 204) {
        reject(new Error(`Failed to upload file: ${xhr.responseText}`));
      }
      const body = "response" in xhr ? xhr.response : (xhr as any).responseText;
      resolve(new Response(body));
    };
    xhr.onerror = () => {
      reject(new TypeError("Network request failed"));
    };
    xhr.ontimeout = () => {
      reject(new TypeError("Network request failed"));
    };

    xhr.open(options?.method || "POST", url.toString(), true);

    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    if (xhr.upload && options?.onProgress) {
      xhr.upload.onprogress = options.onProgress;
    }

    if (options?.signal) {
      let signal = options.signal;

      if (signal) {
        signal.addEventListener("abort", () => {
          xhr.abort();
          reject(new DOMException("Aborted", "AbortError"));
        });
      }
    }

    xhr.send(options?.body as any);
  });

export type ExtraRequest = RequestInit & {
  onProgress?: (this: any, e: ProgressEvent) => void;
};

const customFetch = (uri: any, options: ExtraRequest) => {
  if (options.onProgress) {
    return uploadFetch(uri, options);
  }
  return fetch(uri, options);
};

export const DatalayerProvider: React.FC<DatalayerProps> = ({ children }) => {
  const [client, setClient] = useState<AwsClient | undefined>();
  const [config, setConfig] = useState<DatalayerConfig>();

  const configure = async (config: DatalayerConfig) => {
    setConfig(config);
  };

  const upload = async (file: File, options?: UploadOptions) => {
    if (!config) {
      throw Error("No client configured");
    }

    let z = await config.presign(file.name);

    let data = new FormData();
    data.append("file", file);
    data.append("key", z.fields.key);
    data.append("bucket", z.bucket);
    data.append("X-Amz-Algorithm", z.fields.xAmzAlgorithm);
    data.append("X-Amz-Credential", z.fields.xAmzCredential);
    data.append("X-Amz-Date", z.fields.xAmzDate);
    data.append("X-Amz-Signature", z.fields.xAmzSignature);
    data.append("Policy", z.fields.policy);

    let x = customFetch(`${config?.endpointUrl}/${z.bucket}`, {
      body: data,
      mode: "cors",
      method: "POST",
      onProgress: options?.onProgress,
      signal: options?.signal,
    });

    await x;
    return `${z.bucket}/${z.fields.key}`;
  };

  return (
    <DatalayerContext.Provider
      value={{
        configure: configure,
        upload,
      }}
    >
      {children}
    </DatalayerContext.Provider>
  );
};

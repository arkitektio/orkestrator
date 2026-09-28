export type LivekitClient = {
  url: string;
};

export type LivekitConfig = {
  url: string;
};

export const createLivekitClient = (config: LivekitConfig) => {
  return {
    url: config.url,
  };
};

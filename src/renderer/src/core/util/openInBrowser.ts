/** Opens a URL (a provider's login page, a link in a mail) in the system browser; a new tab in the web build. */
export const openInBrowser = (url: string) => {
  if (window.api?.openWebbrowser) void window.api.openWebbrowser(url);
  else window.open(url, "_blank", "noopener");
};

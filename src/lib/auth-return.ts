export const buildLoginUrlWithReturnTo = (path: string) => {
  const target = path.startsWith("/") ? path : `/${path}`;
  return `/?return_to=${encodeURIComponent(target)}`;
};

export const currentLocationReturnTo = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;


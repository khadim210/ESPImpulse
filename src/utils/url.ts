export const getAppBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_APP_URL;

  if (configuredUrl && configuredUrl.trim() !== '') {
    return configuredUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
};

export const getPublicSubmissionUrl = (programId: string): string => {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/submit/${programId}`;
};

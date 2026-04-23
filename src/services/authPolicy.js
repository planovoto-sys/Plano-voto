const EMAIL_VERIFICATION_REQUIRED = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION !== 'false';

const TRUSTED_FEDERATED_PROVIDERS = new Set([
  'google.com',
  'apple.com',
  'microsoft.com',
  'github.com',
  'facebook.com',
  'twitter.com'
]);

const hasPasswordProvider = (user) => (
  user?.providerData?.some((provider) => provider?.providerId === 'password') ?? false
);

const hasTrustedFederatedProvider = (user) => (
  user?.providerData?.some((provider) => TRUSTED_FEDERATED_PROVIDERS.has(provider?.providerId)) ?? false
);

export const isEmailVerificationRequired = () => EMAIL_VERIFICATION_REQUIRED;

export const isVotingUserVerified = (user) => {
  if (!user) return false;
  if (!EMAIL_VERIFICATION_REQUIRED) return true;
  if (!user.email) return false;

  // Password provider requires Firebase email verification.
  if (hasPasswordProvider(user)) {
    return user.emailVerified === true;
  }

  // Federated providers commonly deliver pre-verified identities.
  if (hasTrustedFederatedProvider(user)) {
    return true;
  }

  return user.emailVerified === true;
};

export const canAccessVotingArea = (user) => Boolean(user) && isVotingUserVerified(user);

export const getAuthBlockReason = (user) => {
  if (!user) return 'AUTH_REQUIRED';
  if (!isVotingUserVerified(user)) return 'EMAIL_NOT_VERIFIED';
  return null;
};
export const getProfileImage = (profile) => {
  if (!profile) return '';
  if (typeof profile === 'string') return profile;

  const account = profile.userId || profile.user || {};
  return profile.profileImage
    || account.profileImage
    || account.avatar
    || profile.avatar
    || profile.image
    || account.image
    || '';
};

export default getProfileImage;
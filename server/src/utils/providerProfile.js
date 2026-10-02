const normalized = (value) => String(value || '').trim().toLocaleLowerCase();

export const buildServiceAreaFilter = ({
  countryId,
  stateId,
  districtId,
  cityId,
  location,
} = {}) => {
  const criteria = {};
  if (countryId) criteria.countryId = countryId;
  if (stateId) criteria.stateId = stateId;
  if (districtId) criteria.districtId = districtId;
  if (cityId) criteria.cityId = cityId;

  const hasLocationIds = Object.keys(criteria).length > 0;
  const locationText = String(location || '').trim();
  let locationRegex;
  if (locationText) {
    const escaped = locationText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    locationRegex = new RegExp(`(?:^|[,\\s])${escaped}(?:[,\\s]|$)`, 'i');
    criteria.$or = [
      { city: locationRegex },
      { district: locationRegex },
      { area: locationRegex },
      { pincode: locationRegex },
    ];
  }

  if (!Object.keys(criteria).length) return null;
  const structuredCoverage = { serviceAreas: { $elemMatch: criteria } };
  if (hasLocationIds || !locationRegex) return structuredCoverage;

  return {
    $or: [
      structuredCoverage,
      { serviceArea: locationRegex },
    ],
  };
};

export const providerCoversLocation = (provider, customerLocation) => {
  const location = customerLocation || {};
  const customerCountry = normalized(location.country);
  const customerState = normalized(location.state);
  const customerDistrict = normalized(location.district);
  const customerCity = normalized(location.city);
  const customerArea = normalized(location.area);
  const customerPincode = normalized(location.pincode);
  if (!customerCountry || !customerState || !customerDistrict || !customerCity) return false;

  return (provider.serviceAreas || []).some((serviceArea) => {
    if (serviceArea.isActive === false) return false;
    if (
      normalized(serviceArea.country) !== customerCountry
      || normalized(serviceArea.state) !== customerState
      || normalized(serviceArea.district) !== customerDistrict
    ) return false;

    if (serviceArea.coversDistrict === true) return true;
    if (normalized(serviceArea.city) !== customerCity) return false;
    const providerArea = normalized(serviceArea.area);
    if (providerArea && providerArea !== customerArea) return false;
    const providerPincode = normalized(serviceArea.pincode);
    return !providerPincode || providerPincode === customerPincode;
  });
};

export const providerServesDistrict = (provider, customerLocation) => {
  const location = customerLocation || {};
  const district = normalized(location.district);
  if (!district) return false;

  const matchesLocation = (providerLocation) => {
    if (normalized(providerLocation.district) !== district) return false;
    const country = normalized(providerLocation.country);
    const state = normalized(providerLocation.state);
    return (!country || !normalized(location.country) || country === normalized(location.country))
      && (!state || !normalized(location.state) || state === normalized(location.state));
  };

  const serviceAreas = provider.serviceAreas || [];
  if (serviceAreas.length > 0) {
    return serviceAreas.some((area) =>
      area.isActive !== false && matchesLocation(area)
    );
  }

  return matchesLocation(provider.location || {});
};

const plainProvider = (provider) => (
  provider?.toObject ? provider.toObject({ flattenMaps: true }) : { ...provider }
);

export const toProviderSummary = (provider) => {
  const value = plainProvider(provider);
  const user = value.userId && typeof value.userId === 'object' ? value.userId : {};
  const profileImage = value.profileImage || value.avatar || user.avatar || '';
  const location = value.location || {};
  const profile = { ...value };
  delete profile.settings;

  return {
    ...profile,
    userId: user?._id
      ? { _id: user._id, name: user.name, avatar: user.avatar }
      : value.userId,
    id: String(value._id || value.id || ''),
    name: value.businessName || user.name || value.name || 'Service professional',
    profileImage,
    avatar: profileImage,
    coverImage: value.coverImage || '',
    rating: Number(value.rating || 0),
    reviewCount: Number(value.reviewCount || 0),
    totalBookings: Number(value.totalBookings ?? value.jobsCompleted ?? 0),
    experience: Number(value.experience || 0),
    verificationStatus: value.verificationStatus || (value.isVerified ? 'verified' : 'pending'),
    country: location.country || '',
    state: location.state || '',
    district: location.district || '',
    city: location.city || '',
    area: location.area || '',
    address: location.fullAddress || location.address || '',
    serviceAreas: (value.serviceAreas || []).filter((area) => area.isActive !== false),
    services: value.services || [],
  };
};

export const toProviderProfile = (provider) => {
  const summary = toProviderSummary(provider);
  const value = plainProvider(provider);
  const user = value.userId && typeof value.userId === 'object' ? value.userId : {};
  if (user.phone && value.settings?.privacy?.showPhone !== false) {
    summary.userId = {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
    };
  }
  return summary;
};

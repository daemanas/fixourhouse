export const getBookingRoute = (serviceId) => {
  const normalizedServiceId = serviceId && typeof serviceId === 'object'
    ? serviceId._id || serviceId.id
    : serviceId;
  return normalizedServiceId
    ? `/customer/service/${encodeURIComponent(String(normalizedServiceId))}`
    : null;
};

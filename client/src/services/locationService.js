import api from './api';

export const getCountries = async () => {
  const response = await api.get('/locations/countries');
  return response;
};

export const getStates = async (countryId) => {
  const params = {};
  if (countryId) params.countryId = countryId;
  const response = await api.get('/locations/states', { params });
  return response;
};

export const getDistricts = async (stateId) => {
  const response = await api.get('/locations/districts', {
    params: { stateId },
  });
  return response;
};

export const getCities = async ({ districtId, stateId }) => {
  const params = {};
  if (districtId) params.districtId = districtId;
  else if (stateId) params.stateId = stateId;

  const response = await api.get('/locations/cities', { params });
  return response;
};

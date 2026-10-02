import test from 'node:test';
import assert from 'node:assert/strict';
import Location from '../models/Location.js';
import {
  getCountries,
  getStates,
  getDistricts,
  getCities,
} from './locationController.js';

const query = (value) => ({
  select() { return this; },
  sort() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

const invoke = async (handler, req) => {
  return new Promise((resolve, reject) => {
    let status;
    const res = {
      status(code) {
        status = code;
        return this;
      },
      json(response) {
        resolve({ status, response });
        return this;
      },
    };
    handler(req, res, reject);
  });
};

test('country response shape remains stable', async (t) => {
  const originalFind = Location.find;
  Location.find = () => query([{ _id: 'india-id', name: 'India', code: 'IN' }]);
  t.after(() => { Location.find = originalFind; });

  const result = await invoke(getCountries, { query: {}, params: {} });
  assert.equal(result.status, 200);
  assert.deepEqual(result.response.data.countries, [{ _id: 'india-id', name: 'India', code: 'IN' }]);
  assert.equal(result.response.success, true);
});

test('path and legacy query parameters both resolve the same cascade ids', async (t) => {
  const originalFind = Location.find;
  const originalFindOne = Location.findOne;
  const filters = [];
  Location.find = (filter) => {
    filters.push(filter);
    return query([{ _id: 'child-id', name: 'Child' }]);
  };
  Location.findOne = (filter) => Promise.resolve({ _id: filter._id, type: filter.type, isActive: true });
  t.after(() => {
    Location.find = originalFind;
    Location.findOne = originalFindOne;
  });

  const pathStates = await invoke(getStates, { params: { countryId: 'country-id' }, query: {} });
  assert.equal(pathStates.response.data.states.length, 1);
  assert.deepEqual(filters.at(-1), { type: 'state', isActive: true, parentId: 'country-id' });

  const queryStates = await invoke(getStates, { params: {}, query: { countryId: 'legacy-country-id' } });
  assert.deepEqual(filters.at(-1), { type: 'state', isActive: true, parentId: 'legacy-country-id' });

  const pathDistricts = await invoke(getDistricts, { params: { stateId: 'state-id' }, query: {} });
  assert.equal(pathDistricts.response.data.districts.length, 1);
  assert.deepEqual(filters.at(-1), { type: 'district', parentId: 'state-id', isActive: true });

  const pathCities = await invoke(getCities, { params: { districtId: 'district-id' }, query: {} });
  assert.equal(pathCities.response.data.cities.length, 1);
  assert.deepEqual(filters.at(-1), { type: 'city', parentId: 'district-id', isActive: true });

  const queryCities = await invoke(getCities, { params: {}, query: { districtId: 'legacy-district-id' } });
  assert.deepEqual(filters.at(-1), { type: 'city', parentId: 'legacy-district-id', isActive: true });
});

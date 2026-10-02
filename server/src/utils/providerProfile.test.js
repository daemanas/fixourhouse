import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildServiceAreaFilter,
  providerCoversLocation,
  providerServesDistrict,
  toProviderProfile,
  toProviderSummary,
} from './providerProfile.js';
import { updateProviderValidator } from '../validators/providerValidator.js';

const customerLocation = {
  country: 'India',
  state: 'West Bengal',
  district: 'Howrah',
  city: 'Howrah',
  area: 'Bhandardaha',
  pincode: '711101',
};

const provider = {
  serviceAreas: [{
    country: 'India',
    state: 'West Bengal',
    district: 'Howrah',
    city: 'Howrah',
    area: 'Bhandardaha',
    pincode: '711101',
    isActive: true,
  }],
};

test('provider coverage requires exact city, locality, and configured PIN', () => {
  assert.equal(providerCoversLocation(provider, customerLocation), true);
  assert.equal(providerCoversLocation(provider, {
    ...customerLocation,
    area: 'Shibpur',
  }), false);
  assert.equal(providerCoversLocation(provider, {
    ...customerLocation,
    pincode: '711102',
  }), false);
});

test('district-wide provider coverage matches any city/locality in that district', () => {
  const districtWideProvider = {
    serviceAreas: [{
      country: 'India',
      state: 'West Bengal',
      district: 'Howrah',
      city: '',
      coversDistrict: true,
      isActive: true,
    }],
  };

  assert.equal(providerCoversLocation(districtWideProvider, {
    ...customerLocation,
    area: 'Shibpur',
    city: 'Howrah',
  }), true);
});

test('provider coverage excludes other districts and states', () => {
  assert.equal(providerCoversLocation(provider, {
    ...customerLocation,
    district: 'Kolkata',
    city: 'Kolkata',
  }), false);
  assert.equal(providerCoversLocation(provider, {
    ...customerLocation,
    district: 'Nadia',
    city: 'Krishnanagar',
  }), false);
});

test('district nearby matching ignores city but excludes other districts', () => {
  const district = { country: 'India', state: 'West Bengal', district: 'Howrah' };
  const servesHowrah = (city) => ({
    serviceAreas: [{
      country: 'India',
      state: 'West Bengal',
      district: 'Howrah',
      city,
      isActive: true,
    }],
  });

  assert.equal(providerServesDistrict(servesHowrah('Bhandardaha'), district), true);
  assert.equal(providerServesDistrict(servesHowrah('Shibpur'), district), true);
  assert.equal(providerServesDistrict(servesHowrah('Bally'), district), true);
  assert.equal(providerServesDistrict({
    serviceAreas: [{ country: 'India', state: 'West Bengal', district: 'Nadia', city: 'Krishnanagar' }],
  }, district), false);
  assert.equal(providerServesDistrict({
    serviceAreas: [{ country: 'India', state: 'West Bengal', district: 'Kolkata', city: 'Kolkata' }],
  }, district), false);
});

test('primary provider district is fallback only when service areas are unconfigured', () => {
  const customer = { country: 'India', state: 'West Bengal', district: 'Howrah' };
  assert.equal(providerServesDistrict({
    location: { country: 'India', state: 'West Bengal', district: 'Howrah' },
    serviceAreas: [],
  }, customer), true);
  assert.equal(providerServesDistrict({
    location: { country: 'India', state: 'West Bengal', district: 'Howrah' },
    serviceAreas: [{ country: 'India', state: 'West Bengal', district: 'Kolkata', isActive: true }],
  }, customer), false);
  assert.equal(providerServesDistrict({
    location: { district: 'Howrah' },
    serviceAreas: [{ district: 'Howrah', isActive: false }],
  }, customer), false);
});

test('provider summary normalizes public image, location, ratings, and coverage fields', () => {
  const summary = toProviderSummary({
    _id: 'provider-id',
    businessName: 'LocalFix Services',
    location: { country: 'India', state: 'West Bengal', district: 'Howrah', city: 'Howrah' },
    serviceAreas: provider.serviceAreas,
    userId: { name: 'Owner', avatar: '/uploads/provider.png' },
    rating: 4.8,
    reviewCount: 12,
  });

  assert.equal(summary.profileImage, '/uploads/provider.png');
  assert.equal(summary.avatar, '/uploads/provider.png');
  assert.equal(summary.city, 'Howrah');
  assert.equal(summary.district, 'Howrah');
  assert.equal(summary.rating, 4.8);
  assert.equal(summary.reviewCount, 12);
  assert.equal(summary.serviceAreas.length, 1);
});

test('provider summaries omit private user and settings fields while profiles respect phone visibility', () => {
  const providerWithPrivateFields = {
    _id: 'provider-id',
    businessName: 'LocalFix Services',
    userId: {
      _id: 'user-id',
      name: 'Owner',
      avatar: '/uploads/provider.png',
      email: 'owner@example.test',
      phone: '9876543210',
    },
    settings: { privacy: { showPhone: false }, payment: { accountNumber: 'secret' } },
  };

  const summary = toProviderSummary(providerWithPrivateFields);
  assert.equal(summary.userId.email, undefined);
  assert.equal(summary.userId.phone, undefined);
  assert.equal(summary.settings, undefined);
  assert.equal(toProviderProfile(providerWithPrivateFields).userId.phone, undefined);
  assert.equal(toProviderProfile({
    ...providerWithPrivateFields,
    settings: { privacy: { showPhone: true } },
  }).userId.phone, '9876543210');
});

test('public location filters query structured coverage rather than business location', () => {
  const query = buildServiceAreaFilter({
    countryId: 'country-id',
    stateId: 'state-id',
    location: 'Bhandardaha',
  });

  const coverage = query.serviceAreas.$elemMatch;
  assert.equal(coverage.countryId, 'country-id');
  assert.equal(coverage.stateId, 'state-id');
  assert.equal(coverage.$or.length, 4);
  assert.equal(coverage.$or.every((field) => Object.values(field)[0].test('Bhandardaha')), true);
  assert.equal(query['location.city'], undefined);
  assert.equal(buildServiceAreaFilter({ location: 'Howrah' }).$or.length, 2);
  assert.equal(buildServiceAreaFilter(), null);
});

test('provider profile validation allows district-wide coverage without a city', () => {
  const validResult = updateProviderValidator.validate({
    body: {
      serviceAreas: [{
        country: 'India',
        state: 'West Bengal',
        district: 'Howrah',
        city: '',
        coversDistrict: true,
      }],
    },
  });
  assert.equal(validResult.error, undefined);

  const invalidResult = updateProviderValidator.validate({
    body: {
      serviceAreas: [{
        country: 'India',
        state: 'West Bengal',
        district: 'Howrah',
        city: '',
        coversDistrict: false,
      }],
    },
  });
  assert.ok(invalidResult.error);
});

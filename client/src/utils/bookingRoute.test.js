import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBookingRoute } from './bookingRoute.js';

test('booking route uses the service id and never the provider id', () => {
  assert.equal(
    getBookingRoute({ _id: 'service-1' }),
    '/customer/service/service-1',
  );
});

test('booking route does not require provider context', () => {
  assert.equal(
    getBookingRoute('service-1'),
    '/customer/service/service-1',
  );
});

test('booking route refuses missing service id', () => {
  assert.equal(getBookingRoute(), null);
});

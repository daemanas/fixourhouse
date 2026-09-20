/**
 * Idempotent India Location Master Importer.
 *
 * Hierarchy:
 *   Country ("India", type: 'country', parentId: null)
 *     -> State (type: 'state', parentId: country._id)
 *        -> District (type: 'district', parentId: state._id)
 *           -> City/Town (type: 'city', parentId: district._id)
 *
 * Run:  npm run import:locations   (from /server directory)
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Location from '../src/models/Location.js';
import { getAllStatesWithDistricts } from 'india-states-districts';
import { State, City } from 'country-state-city';

const CURATED_DISTRICT_TOWNS = {
  'cooch behar': ['Cooch Behar', 'Dinhata', 'Mathabhanga', 'Mekhliganj', 'Tufanganj', 'Haldibari', 'Sitai', 'Sitalkuchi', 'Gosanimari'],
  'hooghly': ['Arambagh', 'Bansberia', 'Bhadreswar', 'Chandannagar', 'Chinsurah', 'Dankuni', 'Hooghly', 'Konnagar', 'Rishra', 'Serampore', 'Tarakeswar', 'Singur', 'Pandua', 'Balagarh', 'Haripal'],
  'darjeeling': ['Darjeeling', 'Kurseong', 'Mirik', 'Siliguri', 'Takdah'],
  'kalimpong': ['Kalimpong', 'Gorubathan'],
  'alipurduar': ['Alipurduar', 'Falakata', 'Madarihat', 'Kumargram'],
  'jalpaiguri': ['Jalpaiguri', 'Malbazar', 'Dhupguri', 'Maynaguri'],
  'kolkata': ['Kolkata', 'Alipore', 'Ballygunge', 'Salt Lake', 'Jadavpur'],
  'howrah': ['Howrah', 'Bally', 'Uluberia', 'Bagnan', 'Amta'],
  'nadia': ['Krishnanagar', 'Nabadwip', 'Ranaghat', 'Kalyani', 'Chakdaha', 'Santipur'],
  'north 24 parganas': ['Barasat', 'Basirhat', 'Bongaon', 'Barrackpore', 'Bidhannagar', 'Kanchrapara', 'Naihati'],
  'south 24 parganas': ['Alipore', 'Diamond Harbour', 'Canning', 'Baruipur', 'Sonarpur', 'Kakdwip'],
  'paschim bardhaman': ['Asansol', 'Durgapur', 'Raniganj', 'Kulti'],
  'purba bardhaman': ['Bardhaman', 'Kalna', 'Katwa', 'Memari'],
  'paschim medinipur': ['Midnapore', 'Kharagpur', 'Ghatal'],
  'purba medinipur': ['Tamluk', 'Haldia', 'Contai', 'Egra', 'Digha'],
  'bankura': ['Bankura', 'Bishnupur', 'Khatra'],
  'purulia': ['Purulia', 'Raghunathpur', 'Jhalda'],
  'birbhum': ['Suri', 'Bolpur', 'Rampurhat', 'Sainthia'],
  'malda': ['English Bazar', 'Old Malda', 'Chanchal'],
  'murshidabad': ['Baharampur', 'Berhampore', 'Jiaganj', 'Jangipur', 'Kandi'],
  'uttar dinajpur': ['Raiganj', 'Kaliyaganj', 'Islampur'],
  'dakshin dinajpur': ['Balurghat', 'Gangarampur'],
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildStateCodeMap() {
  const states = State.getStatesOfCountry('IN');
  const map = new Map();
  for (const s of states) {
    map.set(s.name.toLowerCase().trim(), s.isoCode);
  }
  return map;
}


async function importLocations() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/localfix';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('[import:locations] Connected to ' + mongoose.connection.host);

  const stateCodeMap = buildStateCodeMap();
  const statesWithDistricts = getAllStatesWithDistricts();

  // 0. Upsert Country node
  const countryDoc = await Location.findOneAndUpdate(
    { name: 'India', type: 'country' },
    {
      $setOnInsert: {
        name: 'India',
        type: 'country',
        parentId: null,
        code: 'IN',
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let stateCnt = 0;
  let districtCnt = 0;
  let cityCnt = 0;

  for (const stateData of statesWithDistricts) {
    const stateName = stateData.name.trim();
    const isoCode = stateCodeMap.get(stateName.toLowerCase()) || '';

    // 1. Upsert State under Country
    const stateDoc = await Location.findOneAndUpdate(
      { name: stateName, type: 'state' },
      {
        $set: { parentId: countryDoc._id },
        $setOnInsert: {
          name: stateName,
          type: 'state',
          code: isoCode,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    stateCnt++;

    // 2. Upsert each district under this state
    const districtDocs = [];
    const districtMapByName = new Map();
    for (const districtName of stateData.districts || []) {
      const trimmed = districtName.trim();
      const distDoc = await Location.findOneAndUpdate(
        { name: trimmed, type: 'district', parentId: stateDoc._id },
        {
          $setOnInsert: {
            name: trimmed,
            type: 'district',
            parentId: stateDoc._id,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      districtDocs.push(distDoc);
      districtMapByName.set(trimmed.toLowerCase(), distDoc);
      districtCnt++;
    }

    // 3. Process cities for this state from country-state-city
    const citiesFromPkg = isoCode ? City.getCitiesOfState('IN', isoCode) : [];

    const districtHQs = [];
    for (const dDoc of districtDocs) {
      const dLower = dDoc.name.toLowerCase();
      const matchingCity = citiesFromPkg.find((c) => {
        const cLower = c.name.toLowerCase().trim();
        return cLower === dLower || cLower === dLower.replace(/ district$/i, '').trim();
      });

      if (matchingCity && matchingCity.latitude && matchingCity.longitude) {
        districtHQs.push({
          doc: dDoc,
          name: dDoc.name,
          lat: parseFloat(matchingCity.latitude),
          lon: parseFloat(matchingCity.longitude),
        });
      }
    }

    const citiesByDistrictId = new Map();
    for (const dDoc of districtDocs) {
      citiesByDistrictId.set(dDoc._id.toString(), new Set());
    }

    for (const dDoc of districtDocs) {
      const dKey = dDoc.name.toLowerCase();
      const curatedList = CURATED_DISTRICT_TOWNS[dKey] || [];
      const set = citiesByDistrictId.get(dDoc._id.toString());
      for (const townName of curatedList) {
        set.add(townName);
      }
    }

    for (const city of citiesFromPkg) {
      let cName = city.name.trim();

      if (cName.toLowerCase().endsWith(' district')) {
        continue;
      }
      if (cName.toLowerCase().endsWith(' community development block')) {
        cName = cName.replace(/ community development block$/i, '').trim();
      }

      const cLower = cName.toLowerCase();
      const lat = parseFloat(city.latitude);
      const lon = parseFloat(city.longitude);

      let matchedDistDoc = districtMapByName.get(cLower);

      if (!matchedDistDoc) {
        for (const dDoc of districtDocs) {
          const curatedList = CURATED_DISTRICT_TOWNS[dDoc.name.toLowerCase()] || [];
          if (curatedList.some((t) => t.toLowerCase() === cLower)) {
            matchedDistDoc = dDoc;
            break;
          }
        }
      }

      if (!matchedDistDoc && lat && lon && districtHQs.length > 0) {
        let minDist = Infinity;
        let closestHQ = null;
        for (const hq of districtHQs) {
          const dist = haversine(lat, lon, hq.lat, hq.lon);
          if (dist < minDist && dist < 100) {
            minDist = dist;
            closestHQ = hq;
          }
        }
        if (closestHQ) {
          matchedDistDoc = closestHQ.doc;
        }
      }

      if (matchedDistDoc) {
        const set = citiesByDistrictId.get(matchedDistDoc._id.toString());
        if (set) {
          set.add(cName);
        }
      }
    }

    for (const dDoc of districtDocs) {
      const citySet = citiesByDistrictId.get(dDoc._id.toString());
      if (!citySet) continue;

      for (const cityName of citySet) {
        await Location.findOneAndUpdate(
          { name: cityName, type: 'city', parentId: dDoc._id },
          {
            $setOnInsert: {
              name: cityName,
              type: 'city',
              parentId: dDoc._id,
              isActive: true,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        cityCnt++;
      }
    }

    console.log(
      '  [' + stateName + '] ' +
      districtDocs.length + ' districts'
    );
  }

  console.log(
    '\n[import:locations] Done: ' +
    stateCnt + ' states, ' +
    districtCnt + ' districts, ' +
    cityCnt + ' cities upserted under Country India.'
  );
  await mongoose.disconnect();
}

importLocations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[import:locations] Failed:', err);
    process.exit(1);
  });

﻿
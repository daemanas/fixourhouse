import { useState, useEffect } from 'react';
import Select from '../ui/Select';
import { getCountries, getStates, getDistricts, getCities } from '../../services/locationService';

/**
 * Reusable India / Global Location Cascade Component (Country → State → District → City/Town)
 *
 * Accepts `value`: { country, state, district, city, countryId, stateId, districtId, cityId }
 * Notifies `onChange`: ({ country, state, district, city, countryId, stateId, districtId, cityId })
 */
export default function LocationCascade({
  value = {},
  onChange,
  disabled = false,
  required = false,
  showLabels = true,
  showCountry = true,
  className = '',
}) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCountryId, setSelectedCountryId] = useState(value.countryId || '');
  const [selectedStateId, setSelectedStateId] = useState(value.stateId || '');
  const [selectedDistrictId, setSelectedDistrictId] = useState(value.districtId || '');
  const [selectedCityId, setSelectedCityId] = useState(value.cityId || '');

  // Keep internal state in sync when parent props update externally
  useEffect(() => {
    if (value.countryId && value.countryId !== selectedCountryId) {
      setSelectedCountryId(value.countryId);
    }
    if (value.stateId && value.stateId !== selectedStateId) {
      setSelectedStateId(value.stateId);
    }
    if (value.districtId && value.districtId !== selectedDistrictId) {
      setSelectedDistrictId(value.districtId);
    }
    if (value.cityId && value.cityId !== selectedCityId) {
      setSelectedCityId(value.cityId);
    }
  }, [value.countryId, value.stateId, value.districtId, value.cityId]);

  // 1. Fetch Countries on mount
  useEffect(() => {
    let mounted = true;
    setLoadingCountries(true);
    getCountries()
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.data?.countries || [];
        setCountries(list);

        // Default to India if available and none selected
        if (list.length > 0 && !selectedCountryId) {
          const india = list.find((c) => c.name.toLowerCase() === 'india') || list[0];
          setSelectedCountryId(india._id);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load countries');
      })
      .finally(() => {
        if (mounted) setLoadingCountries(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Fetch States on mount / when selectedCountryId changes
  useEffect(() => {
    let mounted = true;
    setLoadingStates(true);
    getStates(selectedCountryId)
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.data?.states || [];
        setStates(list);

        // If value has state name but no stateId, try to match
        if (value.state && !selectedStateId) {
          const match = list.find(
            (s) => s.name.toLowerCase() === value.state.toLowerCase()
          );
          if (match) setSelectedStateId(match._id);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load states');
      })
      .finally(() => {
        if (mounted) setLoadingStates(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedCountryId]);

  // 3. Fetch Districts when selectedStateId changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      setSelectedDistrictId('');
      setCities([]);
      setSelectedCityId('');
      return;
    }

    let mounted = true;
    setLoadingDistricts(true);
    getDistricts(selectedStateId)
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.data?.districts || [];
        setDistricts(list);

        // If value has district name but no districtId, match it
        if (value.district && !selectedDistrictId) {
          const match = list.find(
            (d) => d.name.toLowerCase() === value.district.toLowerCase()
          );
          if (match) setSelectedDistrictId(match._id);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load districts');
      })
      .finally(() => {
        if (mounted) setLoadingDistricts(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedStateId]);

  // 4. Fetch Cities when selectedDistrictId changes (ONLY for selected District)
  useEffect(() => {
    if (!selectedDistrictId) {
      setCities([]);
      setSelectedCityId('');
      return;
    }

    let mounted = true;
    setLoadingCities(true);
    getCities({ districtId: selectedDistrictId })
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.data?.cities || [];
        setCities(list);

        // If value has city name but no cityId, match it
        if (value.city && !selectedCityId) {
          const match = list.find(
            (c) => c.name.toLowerCase() === value.city.toLowerCase()
          );
          if (match) setSelectedCityId(match._id);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load cities');
      })
      .finally(() => {
        if (mounted) setLoadingCities(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedDistrictId]);

  // Handle Country Change
  const handleCountryChange = (e) => {
    const countryId = e.target.value;
    setSelectedCountryId(countryId);
    setSelectedStateId('');
    setSelectedDistrictId('');
    setSelectedCityId('');
    setStates([]);
    setDistricts([]);
    setCities([]);

    const cDoc = countries.find((c) => c._id === countryId);
    const newCountry = cDoc ? cDoc.name : 'India';

    if (onChange) {
      onChange({
        country: newCountry,
        state: '',
        district: '',
        city: '',
        countryId,
        stateId: '',
        districtId: '',
        cityId: '',
      });
    }
  };

  // Handle State Change
  const handleStateChange = (e) => {
    const stateId = e.target.value;
    setSelectedStateId(stateId);
    setSelectedDistrictId('');
    setSelectedCityId('');
    setDistricts([]);
    setCities([]);

    const stDoc = states.find((s) => s._id === stateId);
    const newState = stDoc ? stDoc.name : '';
    const cDoc = countries.find((c) => c._id === selectedCountryId);

    if (onChange) {
      onChange({
        country: cDoc ? cDoc.name : value.country || 'India',
        state: newState,
        district: '',
        city: '',
        countryId: selectedCountryId,
        stateId,
        districtId: '',
        cityId: '',
      });
    }
  };

  // Handle District Change
  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    setSelectedDistrictId(districtId);
    setSelectedCityId('');
    setCities([]);

    const distDoc = districts.find((d) => d._id === districtId);
    const newDistrict = distDoc ? distDoc.name : '';
    const stDoc = states.find((s) => s._id === selectedStateId);
    const cDoc = countries.find((c) => c._id === selectedCountryId);

    if (onChange) {
      onChange({
        country: cDoc ? cDoc.name : value.country || 'India',
        state: stDoc ? stDoc.name : value.state || '',
        district: newDistrict,
        city: '',
        countryId: selectedCountryId,
        stateId: selectedStateId,
        districtId,
        cityId: '',
      });
    }
  };

  // Handle City Change
  const handleCityChange = (e) => {
    const cityId = e.target.value;
    setSelectedCityId(cityId);

    const cityDoc = cities.find((c) => c._id === cityId);
    const newCity = cityDoc ? cityDoc.name : '';
    const stDoc = states.find((s) => s._id === selectedStateId);
    const distDoc = districts.find((d) => d._id === selectedDistrictId);
    const cDoc = countries.find((c) => c._id === selectedCountryId);

    if (onChange) {
      onChange({
        country: cDoc ? cDoc.name : value.country || 'India',
        state: stDoc ? stDoc.name : value.state || '',
        district: distDoc ? distDoc.name : value.district || '',
        city: newCity,
        countryId: selectedCountryId,
        stateId: selectedStateId,
        districtId: selectedDistrictId,
        cityId,
      });
    }
  };

  const gridColsClass = showCountry
    ? 'grid-cols-1 sm:grid-cols-4'
    : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className={`grid ${gridColsClass} gap-3 ${className}`}>
      {/* Country Selector */}
      {showCountry && (
        <Select
          label={showLabels ? 'Country' : undefined}
          options={countries.map((c) => ({ value: c._id, label: c.name }))}
          value={selectedCountryId}
          onChange={handleCountryChange}
          placeholder={loadingCountries ? 'Loading countries...' : 'Select Country'}
          disabled={disabled || loadingCountries}
          required={required}
        />
      )}

      {/* State Selector */}
      <Select
        label={showLabels ? 'State' : undefined}
        options={states.map((s) => ({ value: s._id, label: s.name }))}
        value={selectedStateId}
        onChange={handleStateChange}
        placeholder={loadingStates ? 'Loading states...' : 'Select State'}
        disabled={disabled || loadingStates}
        required={required}
      />

      {/* District Selector */}
      <Select
        label={showLabels ? 'District' : undefined}
        options={districts.map((d) => ({ value: d._id, label: d.name }))}
        value={selectedDistrictId}
        onChange={handleDistrictChange}
        placeholder={
          loadingDistricts
            ? 'Loading districts...'
            : !selectedStateId
            ? 'Select State first'
            : 'Select District'
        }
        disabled={disabled || !selectedStateId || loadingDistricts}
      />

      {/* City/Town Selector */}
      <Select
        label={showLabels ? 'City / Town' : undefined}
        options={cities.map((c) => ({ value: c._id, label: c.name }))}
        value={selectedCityId}
        onChange={handleCityChange}
        placeholder={
          loadingCities
            ? 'Loading cities...'
            : !selectedDistrictId
            ? 'Select District first'
            : cities.length === 0
            ? 'No cities/towns available'
            : 'Select City / Town'
        }
        disabled={disabled || !selectedDistrictId || loadingCities || cities.length === 0}
      />
      {error && <p className="col-span-full text-xs text-danger-500 mt-1">{error}</p>}
    </div>
  );
}
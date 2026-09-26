import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';
import { getAdminLocationAnalytics } from '../../../services/adminService';

export function LocationAnalyticsSection({ initialData = {}, period = '30d', startDate = '', endDate = '' }) {
  const [level, setLevel] = useState('state');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [locationData, setLocationData] = useState({
    ...initialData,
    locations: initialData.locations || initialData.topLocations || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const fetchLocations = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const params = { level, period };
      if (selectedState) params.state = selectedState;
      if (selectedDistrict) params.district = selectedDistrict;
      if (period === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const response = await getAdminLocationAnalytics(params);
      if (currentRequestId === requestId.current) setLocationData(response.data.data);
    } catch (requestError) {
      if (currentRequestId === requestId.current) {
        setError(requestError.response?.data?.message || 'Unable to load location data.');
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [level, selectedState, selectedDistrict, period, startDate, endDate]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openLocation = (name) => {
    if (level === 'state') {
      setSelectedState(name);
      setSelectedDistrict('');
      setLevel('district');
    } else if (level === 'district') {
      setSelectedDistrict(name);
      setLevel('city');
    }
  };

  const showStates = () => {
    setLevel('state');
    setSelectedState('');
    setSelectedDistrict('');
  };

  const showDistricts = () => {
    setLevel('district');
    setSelectedDistrict('');
  };

  const locationsList = locationData.locations || [];
  const unmappedRecords = locationData.unmappedRecords || {};
  const unmappedTotal = (unmappedRecords.customers || 0) + (unmappedRecords.providers || 0) + (unmappedRecords.bookings || 0);
  const locationLabel = level === 'state' ? 'STATE' : level === 'district' ? 'DISTRICT' : 'CITY / TOWN';
  const emptyMessage = level === 'district'
    ? 'No districts registered in this state yet.'
    : level === 'city'
      ? 'No cities registered in this district yet.'
      : 'No registered locations are available yet.';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Coverage summary */}
      <Card className="p-6 lg:col-span-1">
        <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-1">Platform Coverage</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Geographic reach across registered users and providers</p>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Registered States</p>
              <p className="text-2xl font-bold text-ink-light dark:text-ink-dark mt-1">{locationData.totalStates || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Registered Cities</p>
              <p className="text-2xl font-bold text-ink-light dark:text-ink-dark mt-1">{locationData.totalCities || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Registered Districts</p>
              <p className="text-2xl font-bold text-ink-light dark:text-ink-dark mt-1">{locationData.totalDistricts || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Unknown / Unmapped Records</p>
            <p className="mt-1 text-2xl font-bold text-ink-light dark:text-ink-dark">{unmappedTotal}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {unmappedRecords.customers || 0} customers · {unmappedRecords.providers || 0} providers · {unmappedRecords.bookings || 0} bookings in period
            </p>
          </div>
        </div>
      </Card>

      {/* Hierarchical Top Locations */}
      <Card className="p-6 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">Top Locations</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Location Coverage · Platform geographic activity by State → District → City</p>
          </div>
          {level !== 'state' && (
            <button
              type="button"
              onClick={level === 'city' ? showDistricts : showStates}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md border border-border-light px-3 py-2 text-sm font-medium text-ink-light transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:text-ink-dark dark:hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
              {level === 'city' ? 'Back to Districts' : 'Back to States'}
            </button>
          )}
        </div>

        <nav aria-label="Location breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={showStates} className="font-medium text-primary-700 hover:underline dark:text-primary-400">All States</button>
          {selectedState && (
            <>
              <ChevronRight aria-hidden="true" className="h-4 w-4 text-gray-400" />
              <button type="button" onClick={showDistricts} aria-current={level === 'district' ? 'page' : undefined} className="font-medium text-primary-700 hover:underline dark:text-primary-400">{selectedState}</button>
            </>
          )}
          {selectedDistrict && (
            <>
              <ChevronRight aria-hidden="true" className="h-4 w-4 text-gray-400" />
              <button type="button" onClick={() => setLevel('city')} aria-current="page" className="font-medium text-primary-700 hover:underline dark:text-primary-400">{selectedDistrict}</button>
            </>
          )}
        </nav>

        {error && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {loading ? (
          <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
            Loading {level === 'state' ? 'states' : level === 'district' ? 'districts' : 'cities'}...
          </div>
        ) : locationsList.length === 0 ? (
          <EmptyState title={emptyMessage} description="Locations will appear here as normalized platform records are added." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark">
                  {['Rank', locationLabel, 'Customers', 'Providers', 'Bookings', 'Completed Bookings'].map((column) => (
                    <th key={column} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {locationsList.map((item, index) => {
                  const clickable = level !== 'city';
                  return (
                    <tr
                      key={`${item.name}-${index}`}
                      onClick={clickable ? () => openLocation(item.name) : undefined}
                      onKeyDown={clickable ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openLocation(item.name);
                        }
                      } : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      className={`${clickable ? 'cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:hover:bg-gray-800/50 dark:focus:bg-gray-800/50' : ''} transition-colors`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-gray-500">#{item.rank || index + 1}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-ink-light dark:text-ink-dark">
                        <span className="inline-flex items-center gap-2">
                          {item.name}
                          {clickable && <ChevronRight aria-hidden="true" className="h-4 w-4 text-gray-400" />}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-light dark:text-ink-dark">{item.customers}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-light dark:text-ink-dark">{item.providers}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-light dark:text-ink-dark">{item.bookings}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-light dark:text-ink-dark">{item.completedBookings}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default LocationAnalyticsSection;
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { getAdminAnalytics } from '../../services/adminService';
import AnalyticsHeader from '../../components/admin/analytics/AnalyticsHeader';
import AnalyticsKpiGrid from '../../components/admin/analytics/AnalyticsKpiGrid';
import RegistrationOverviewChart from '../../components/admin/analytics/RegistrationOverviewChart';
import ActiveUsersCharts from '../../components/admin/analytics/ActiveUsersCharts';
import BookingAnalyticsSection from '../../components/admin/analytics/BookingAnalyticsSection';
import LocationAnalyticsSection from '../../components/admin/analytics/LocationAnalyticsSection';
import RatingAndGrowthSection from '../../components/admin/analytics/RatingAndGrowthSection';

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { period };
      if (period === 'custom' && customRange.startDate && customRange.endDate) {
        params.startDate = customRange.startDate;
        params.endDate = customRange.endDate;
      }
      const res = await getAdminAnalytics(params);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [period, customRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePeriodChange = (val) => {
    setPeriod(val);
  };

  const handleApplyCustomRange = (start, end) => {
    setCustomRange({ startDate: start, endDate: end });
    setPeriod('custom');
  };

  if (error && !data) {
    return (
      <div className="space-y-6">
        <AnalyticsHeader
          period={period}
          onPeriodChange={handlePeriodChange}
          onApplyCustomRange={handleApplyCustomRange}
          onRefresh={fetchAnalytics}
          loading={loading}
        />
        <Card className="p-12 text-center">
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load analytics"
            description={error}
            action={
              <Button onClick={fetchAnalytics} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const bookingOverview = data?.bookingOverview || {};
  const ratingOverview = data?.ratingOverview || {};
  const locations = data?.locations || {};
  const userGrowth = data?.userGrowth || {};
  const monthlyData = data?.monthlyData || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-8">
      <AnalyticsHeader
        period={period}
        onPeriodChange={handlePeriodChange}
        onApplyCustomRange={handleApplyCustomRange}
        onRefresh={fetchAnalytics}
        loading={loading}
      />

      <AnalyticsKpiGrid kpis={kpis} loading={loading} />

      <RegistrationOverviewChart monthlyData={monthlyData} />

      <ActiveUsersCharts monthlyData={monthlyData} />

      <BookingAnalyticsSection bookingOverview={bookingOverview} monthlyData={monthlyData} />

      <LocationAnalyticsSection locations={locations} />

      <RatingAndGrowthSection
        ratingOverview={ratingOverview}
        userGrowth={userGrowth}
        recentActivity={recentActivity}
      />
    </div>
  );
}

export default AdminAnalyticsPage;
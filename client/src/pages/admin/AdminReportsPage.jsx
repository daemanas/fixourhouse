import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Flag, CheckCircle2, XCircle, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';

const initialReports = [
  { id: 1, type: 'fraud', reporter: 'Amit Sharma', target: 'Rajesh Kumar', description: 'Provider asked for extra payment outside the app.', status: 'pending', date: '02 Aug 2026' },
  { id: 2, type: 'abuse', reporter: 'Priya Patel', target: 'Sunita Verma', description: 'Provider used abusive language during the visit.', status: 'reviewing', date: '01 Aug 2026' },
  { id: 3, type: 'copyright', reporter: 'Rahul Verma', target: 'Vikram Singh', description: 'Provider copied service images from another platform.', status: 'resolved', date: '31 Jul 2026' },
  { id: 4, type: 'fraud', reporter: 'Sneha Gupta', target: 'Anita Desai', description: 'Provider did not show up for the booked appointment.', status: 'pending', date: '30 Jul 2026' },
  { id: 5, type: 'abuse', reporter: 'Vikram Singh', target: 'Mohan Lal', description: 'Customer made inappropriate comments.', status: 'dismissed', date: '29 Jul 2026' },
];

const typeConfig = {
  fraud: { label: 'Fraud', variant: 'danger' },
  abuse: { label: 'Abuse', variant: 'warning' },
  copyright: { label: 'Copyright', variant: 'primary' },
};

const statusConfig = {
  pending: { label: 'Pending', variant: 'warning' },
  reviewing: { label: 'Reviewing', variant: 'primary' },
  resolved: { label: 'Resolved', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'danger' },
};

export function AdminReportsPage() {
  const [reports, setReports] = useState(initialReports);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.reporter.toLowerCase().includes(search.toLowerCase()) ||
      r.target.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleStatus = (report, status) => {
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, status } : r))
    );
    toast.success(`Report marked as ${status}`);
  };

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <Badge variant={typeConfig[row.type]?.variant || 'primary'}>
          {typeConfig[row.type]?.label || row.type}
        </Badge>
      ),
    },
    { key: 'reporter', label: 'Reporter' },
    { key: 'target', label: 'Reported User' },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <span className="block max-w-[250px] truncate">{row.description}</span>
      ),
    },
    { key: 'date', label: 'Date' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={statusConfig[row.status]?.variant || 'primary'}>
          {statusConfig[row.status]?.label || row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedReport(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'pending' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatus(row, 'reviewing')}>
                <Flag className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleStatus(row, 'resolved')}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleStatus(row, 'dismissed')}>
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Reports</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage fraud, abuse, and copyright reports
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'fraud', label: 'Fraud' },
              { value: 'abuse', label: 'Abuse' },
              { value: 'copyright', label: 'Copyright' },
            ]}
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-6">
          <Table columns={columns} data={filteredReports} />
        </Card>
      </motion.div>

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Report Details"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <Badge variant={typeConfig[selectedReport.type]?.variant || 'primary'}>
                  {typeConfig[selectedReport.type]?.label || selectedReport.type}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <Badge variant={statusConfig[selectedReport.status]?.variant || 'primary'}>
                  {statusConfig[selectedReport.status]?.label || selectedReport.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reporter</p>
                <p className="font-medium text-ink-light dark:text-ink-dark">
                  {selectedReport.reporter}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Target</p>
                <p className="font-medium text-ink-light dark:text-ink-dark">
                  {selectedReport.target}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-ink-light dark:text-ink-dark">
                  {selectedReport.date}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
              <p className="text-ink-light dark:text-ink-dark">{selectedReport.description}</p>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminReportsPage;

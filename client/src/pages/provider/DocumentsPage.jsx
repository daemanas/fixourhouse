import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FileText, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const initialDocuments = [
  {
    id: 1,
    name: 'Aadhaar Card',
    type: 'Identity Proof',
    status: 'verified',
    uploadedAt: '12 Jan 2026',
  },
  {
    id: 2,
    name: 'PAN Card',
    type: 'Tax Document',
    status: 'verified',
    uploadedAt: '12 Jan 2026',
  },
  {
    id: 3,
    name: 'Professional Certificate',
    type: 'Certification',
    status: 'pending',
    uploadedAt: '15 Jan 2026',
  },
  {
    id: 4,
    name: 'Police Verification',
    type: 'Background Check',
    status: 'rejected',
    uploadedAt: '15 Jan 2026',
  },
];

const statusConfig = {
  verified: { label: 'Verified', color: 'success', icon: CheckCircle2 },
  pending: { label: 'Pending Review', color: 'warning', icon: ShieldCheck },
  rejected: { label: 'Rejected', color: 'danger', icon: XCircle },
};

export function DocumentsPage() {
  const [documents, setDocuments] = useState(initialDocuments);

  const handleUpload = () => {
    toast.success('Document upload coming soon');
  };

  const handleReupload = (id) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status: 'pending' } : doc))
    );
    toast.success('Document re-uploaded for review');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Documents</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your verification documents
          </p>
        </div>
        <Button onClick={handleUpload}>
          <FileText className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {documents.map((doc, index) => {
            const status = statusConfig[doc.status];
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                          {doc.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {doc.type} • Uploaded {doc.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={status.color}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                      {doc.status === 'rejected' && (
                        <Button variant="outline" size="sm" onClick={() => handleReupload(doc.id)}>
                          Re-upload
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">
              Verification Status
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/20">
                <div className="flex items-center gap-2 text-success-600 dark:text-success-400">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-medium">2 of 4 documents verified</span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Your profile is partially verified. Complete all documents to get fully verified.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Verification Progress</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">50%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-2 rounded-full bg-success-500" style={{ width: '50%' }} />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Fully verified providers get up to 3x more bookings and a verified badge on their profile.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default DocumentsPage;

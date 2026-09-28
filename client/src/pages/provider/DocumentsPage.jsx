import Card from '../../components/ui/Card';
import { ShieldCheck } from 'lucide-react';

export function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Documents</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Verification flow update
        </p>
      </div>

      <Card className="p-8 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">
              Document Verification Not Required
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              LocalFix provider accounts no longer require manual document uploads. Verification is managed directly by our administration team via phone/service review.
            </p>
            <p className="mt-4 text-sm font-medium text-primary-600 dark:text-primary-400">
              Please check your Partner Workspace Dashboard to view your current verification status.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DocumentsPage;

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export interface BulkImportResultRow {
  row: number;
  status: string; // 'imported' | 'skipped' | 'failed'
  reason?: string;
  [key: string]: any;
}

export interface BulkImportSummary {
  total: number;
  imported?: number;
  skipped?: number;
  failed: number;
  results: BulkImportResultRow[];
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  templateColumns: string[];
  templateSampleRow?: string[];
  onImport: (rows: Record<string, string>[]) => Promise<BulkImportSummary>;
}

/**
 * Generic CSV bulk-import modal, reused across Residents, Assets, and
 * Vendors. Handles: file picking, CSV parsing (via papaparse), a downloadable
 * template, a row-count preview, and a post-import results summary
 * (imported/skipped/failed counts + per-row reasons). The actual API call is
 * left to the caller via onImport, since each entity has its own endpoint.
 */
export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  templateColumns,
  templateSampleRow,
  onImport
}) => {
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setSummary(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(results.errors[0].message);
          setParsedRows([]);
          return;
        }
        setParsedRows(results.data);
      },
      error: (err: any) => {
        setParseError(err.message || 'Failed to parse CSV file');
        setParsedRows([]);
      }
    });
  };

  const handleDownloadTemplate = () => {
    const csvContent = [templateColumns.join(','), (templateSampleRow || []).join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    try {
      const result = await onImport(parsedRows);
      setSummary(result);
    } catch (err: any) {
      setParseError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setParseError('');
    setSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseAndReset = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-brand-600 p-4 border-b border-brand-700 flex justify-between items-center rounded-t-2xl sticky top-0">
          <h3 className="font-semibold text-lg text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> {title}
          </h3>
          <button onClick={handleCloseAndReset} className="text-white hover:bg-brand-700 p-1 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {description && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">{description}</p>
          )}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-lg py-2 transition"
          >
            <Download className="w-4 h-4" /> Download CSV Template
          </button>

          {!summary && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full text-sm border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500"
              />
              {fileName && !parseError && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  Parsed {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} from {fileName}
                </p>
              )}
              {parseError && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {parseError}
                </p>
              )}
            </div>
          )}

          {!summary && parsedRows.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200">
                Preview (first 3 rows)
              </div>
              <div className="p-3 text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                {parsedRows.slice(0, 3).map((row, idx) => (
                  <div key={idx} className="truncate">{Object.values(row).join(' | ')}</div>
                ))}
              </div>
            </div>
          )}

          {summary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 border border-green-100 rounded-lg p-2">
                  <div className="text-lg font-bold text-green-700">
                    {summary.imported ?? (summary.total - summary.failed - (summary.skipped || 0))}
                  </div>
                  <div className="text-[10px] text-green-700 font-medium uppercase">Imported</div>
                </div>
                {summary.skipped !== undefined && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                    <div className="text-lg font-bold text-amber-700">{summary.skipped}</div>
                    <div className="text-[10px] text-amber-700 font-medium uppercase">Skipped</div>
                  </div>
                )}
                <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                  <div className="text-lg font-bold text-red-700">{summary.failed}</div>
                  <div className="text-[10px] text-red-700 font-medium uppercase">Failed</div>
                </div>
              </div>
              {summary.results.some((r) => r.status !== 'imported') && (
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {summary.results.filter((r) => r.status !== 'imported').map((r, idx) => (
                    <div key={idx} className="px-3 py-1.5 text-xs border-b border-gray-100 last:border-0 flex justify-between gap-2">
                      <span className="text-gray-500 shrink-0">Row {r.row}</span>
                      <span className="text-gray-700 truncate flex-1 text-right">{r.reason || r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            {summary ? (
              <>
                <button type="button" onClick={handleReset} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
                  Import Another File
                </button>
                <button type="button" onClick={handleCloseAndReset} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition">
                  Done
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleCloseAndReset} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={parsedRows.length === 0 || isImporting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : `Import ${parsedRows.length} Row${parsedRows.length !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

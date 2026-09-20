import React from 'react';
import { BusinessSettings } from '../../api';

export interface BusinessDocumentHeaderProps {
  businessSettings: BusinessSettings;
  documentLabel: string;
  documentNumber: string;
  date: string;
  time?: string;
}

export const BusinessDocumentHeader: React.FC<BusinessDocumentHeaderProps> = ({
  businessSettings,
  documentLabel,
  documentNumber,
  date,
  time,
}) => {
  return (
    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {businessSettings.business_name}
          </h3>
          {businessSettings.address && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
              {businessSettings.address}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right text-[11px] text-slate-600 shrink-0">
          {businessSettings.gstin && (
            <p>
              <span className="font-semibold text-slate-700">GSTIN:</span> {businessSettings.gstin}
            </p>
          )}
          {businessSettings.phone && (
            <p>
              <span className="font-semibold text-slate-700">Phone:</span> {businessSettings.phone}
            </p>
          )}
        </div>
      </div>
      <div className="pt-1 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
        <span>
          <strong>{documentLabel}:</strong> {documentNumber}
        </span>
        <span>
          <strong>Date:</strong> {date} {time ? time : ''}
        </span>
      </div>
    </div>
  );
};

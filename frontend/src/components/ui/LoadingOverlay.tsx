import React from 'react';

export interface LoadingOverlayProps {
  isVisible?: boolean;
  show?: boolean;
  message?: string;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  show,
  message = 'Loading KIFA FoodCo...',
  subMessage,
}) => {
  const visible = isVisible ?? show ?? false;
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm transition-opacity duration-200 pointer-events-auto select-none"
      role="alert"
      aria-busy="true"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-xs sm:max-w-sm mx-4 text-center transform transition-transform animate-in fade-in zoom-in-95 duration-200">
        {/* Animated Brand Spinner */}
        <div className="relative flex items-center justify-center w-14 h-14 mb-4">
          {/* Outer track */}
          <div className="w-14 h-14 rounded-full border-4 border-slate-100" />
          {/* Spinning gradient ring */}
          <div className="absolute w-14 h-14 rounded-full border-4 border-transparent border-t-[#172554] border-r-[#F59E0B] animate-spin" />
          {/* Inner core */}
          <div className="absolute w-3 h-3 rounded-full bg-[#172554]" />
        </div>

        {/* Message */}
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          {message}
        </h3>

        {/* Submessage / Progress hint */}
        {subMessage ? (
          <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
            {subMessage}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 mt-1.5">
            Please wait while the operation completes...
          </p>
        )}
      </div>
    </div>
  );
};

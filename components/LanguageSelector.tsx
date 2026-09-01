import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full' | 'dropdown';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'dropdown', className = '' }) => {
  const { currentLanguage, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelectLanguage = (code: LanguageCode, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold shadow-xs transition active:scale-95"
          title="Change Language"
          aria-label="Change Language"
        >
          <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span className="font-medium">{currentOption.nativeLabel}</span>
          <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
        </button>

        {isOpen && (
          <div 
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 z-[1000] animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 flex items-center justify-between">
              <span>Select Language</span>
              <Globe className="w-3 h-3 text-brand-500" />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={(e) => handleSelectLanguage(lang.code, e)}
                    onMouseDown={(e) => handleSelectLanguage(lang.code, e)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition cursor-pointer ${
                      isSelected ? 'bg-brand-50 text-brand-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{lang.nativeLabel}</span>
                      <span className="text-[11px] text-gray-400 font-normal">({lang.label})</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold shadow-xs transition hover:border-brand-300 active:scale-95"
        title="Change Language"
        aria-label="Change Language"
      >
        <Globe className="w-4 h-4 text-brand-600 shrink-0" />
        <span className="font-semibold text-gray-900">{currentOption.nativeLabel}</span>
        <span className="hidden sm:inline text-gray-400 text-[11px] font-normal">({currentOption.label})</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-[1000] animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-brand-600" />
              <span>Choose Language</span>
            </div>
            <span className="text-[9px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded font-mono">
              {currentLanguage.toUpperCase()}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={(e) => handleSelectLanguage(lang.code, e)}
                  onMouseDown={(e) => handleSelectLanguage(lang.code, e)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition cursor-pointer ${
                    isSelected ? 'bg-brand-50 text-brand-800 font-bold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 text-sm leading-tight">{lang.nativeLabel}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{lang.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import type { Settings } from '@/shared/types';
import { SUPPORTED_PROVIDERS } from '@/shared/constants';

interface ProviderHealthInfo {
  provider: string;
  configured: boolean;
  enabled: boolean;
}

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [providerHealth, setProviderHealth] = useState<Record<string, ProviderHealthInfo>>({});

  useEffect(() => {
    if (!isExpanded || settings.providerMode !== 'manual') return;

    fetch(`${settings.apiBaseUrl}/api/tweak/provider-status`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.providers) return;
        const healthMap: Record<string, ProviderHealthInfo> = {};
        for (const p of data.providers) {
          healthMap[p.provider.toLowerCase()] = p;
        }
        setProviderHealth(healthMap);
      })
      .catch(() => {});
  }, [isExpanded, settings.providerMode, settings.apiBaseUrl]);

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 rounded p-1 -m-1"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-1 text-sm font-semibold text-black">
          <SettingsIcon size={14} />
          Settings
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-4 text-xs">
          {/* Provider Mode */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Provider Selection
            </label>
            <select
              value={settings.providerMode}
              onChange={(e) => onUpdate({ providerMode: e.target.value as 'auto' | 'manual' })}
              className="w-full p-1.5 border border-gray-300 rounded text-black bg-white"
            >
              <option value="auto">Auto (recommended)</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {/* Preferred Provider (only shown in manual mode) */}
          {settings.providerMode === 'manual' && (
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Preferred Provider
              </label>
              <select
                value={settings.preferredProvider || ''}
                onChange={(e) => onUpdate({ preferredProvider: e.target.value || undefined })}
                className="w-full p-1.5 border border-gray-300 rounded text-black bg-white"
              >
                <option value="">Select provider</option>
                {SUPPORTED_PROVIDERS.map((provider) => {
                  const health = providerHealth[provider];
                  const isAvailable = !health || health.configured;
                  const label = provider.charAt(0).toUpperCase() + provider.slice(1);
                  return (
                    <option
                      key={provider}
                      value={provider}
                      disabled={!isAvailable}
                      className={isAvailable ? '' : 'text-gray-400'}
                    >
                      {label}{health && !isAvailable ? ' — n/a' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Floating Button */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Floating Button on AI Chats
            </label>
            <select
              value={settings.floatingButton}
              onChange={(e) => onUpdate({ floatingButton: e.target.value as 'always' | 'on-focus' | 'disabled' })}
              className="w-full p-1.5 border border-gray-300 rounded text-black bg-white"
            >
              <option value="on-focus">Show on focus</option>
              <option value="always">Always visible</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Sync History */}
          <div className="flex items-center justify-between">
            <label className="font-medium text-gray-700">
              Sync history with web app
            </label>
            <input
              type="checkbox"
              checked={settings.syncHistory}
              onChange={(e) => onUpdate({ syncHistory: e.target.checked })}
              className="w-4 h-4 accent-black"
            />
          </div>

          {/* Keyboard Shortcuts */}
          <div className="flex items-center justify-between">
            <label className="font-medium text-gray-700">
              Enable keyboard shortcuts
            </label>
            <input
              type="checkbox"
              checked={settings.keyboardShortcuts}
              onChange={(e) => onUpdate({ keyboardShortcuts: e.target.checked })}
              className="w-4 h-4 accent-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const OpenWebAppButton: React.FC = () => {
  const handleOpenWebApp = () => {
    chrome.tabs.create({ url: 'https://mstprmpt.zeidgeist.com' });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleOpenWebApp}
      className="w-full justify-center text-gray-600 hover:text-black"
    >
      <ExternalLink size={14} />
      <span>Open Web App</span>
    </Button>
  );
};

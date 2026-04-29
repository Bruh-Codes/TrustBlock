'use client';

import { Bell, Shield } from 'lucide-react';

export function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Manage notifications and wallet controls.</p>
      </div>

      <div className="panel-surface p-5">
        <div className="flex items-center gap-3">
          <div className="ui-icon-box h-8 w-8">
            <Bell className="h-4 w-4" />
          </div>
          <h3 className="text-main text-sm font-semibold">Notifications</h3>
        </div>

        <div className="mt-4 space-y-4 text-sm text-white">
          <ToggleRow title="Email updates" description="Receive escrow status changes in your inbox." enabled />
          <ToggleRow title="Browser notifications" description="Push alerts for approvals, disputes, and releases." />
        </div>
      </div>

      <div className="panel-surface p-5">
        <div className="flex items-center gap-3">
          <div className="ui-icon-box h-8 w-8">
            <Shield className="h-4 w-4" />
          </div>
          <h3 className="text-main text-sm font-semibold">Security</h3>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl border border-white/8 bg-white/4 p-4">
          <div>
            <p className="font-medium text-white">Connected wallet</p>
            <p className="mt-1 font-mono text-sm text-[var(--muted)]">0x71C...976F</p>
          </div>
          <button className="ui-button-secondary px-4 py-2 text-sm font-semibold">
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  enabled = false,
}: {
  title: string;
  description: string;
  enabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/8 bg-white/4 p-4">
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          enabled ? 'surface-strong text-main' : 'surface-soft text-muted'
        }`}
      >
        {enabled ? 'On' : 'Off'}
      </span>
    </div>
  );
}

"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type WorkspaceTab<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

type WorkspaceTabsProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  ariaLabel: string;
  tabs: readonly WorkspaceTab<T>[];
  children: ReactNode;
};

export function WorkspaceTabs<T extends string>({
  value,
  onValueChange,
  ariaLabel,
  tabs,
  children,
}: WorkspaceTabsProps<T>) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(nextValue) => {
        const nextTab = tabs.find((tab) => tab.id === nextValue);
        if (nextTab) onValueChange(nextTab.id);
      }}
      className="min-w-0"
    >
      <Tabs.List
        aria-label={ariaLabel}
        className="mb-4 flex max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1.5"
      >
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <Tabs.Trigger
            key={id}
            value={id}
            className="flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 data-[state=active]:bg-emerald-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
            {badge && (
              <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900">
                {badge}
              </span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content
        value={value}
        className="workspace-tab-panel min-w-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        {children}
      </Tabs.Content>
    </Tabs.Root>
  );
}
"use client";

import { useEffect } from "react";

interface AdminShortcutsProps {
  onSearchFocus: () => void;
  onRefresh: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminShortcuts({ onSearchFocus, onRefresh, activeTab, onTabChange }: AdminShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSearchFocus();
      }
      if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onRefresh();
      }
      // Number keys 1-6 for tab switching
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tabs = ["orders", "kanban", "analytics", "customers", "expenses", "settings"];
        if (tabs[num - 1]) onTabChange(tabs[num - 1]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchFocus, onRefresh, activeTab, onTabChange]);

  return null; // No visible UI
}
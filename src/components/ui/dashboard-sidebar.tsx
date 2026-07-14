'use client';

import { type LucideIcon, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SidebarItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  onClick?: () => void;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface DashboardSidebarProps {
  /** Ordered sections of navigation items. */
  sections: SidebarSection[];
  /** Currently active item key. */
  activeKey: string;
  /** Callback fired when a nav item is clicked. */
  onNavigate: (key: string) => void;
  /** Custom logo / brand element rendered at the very top. */
  logo?: ReactNode;
  /** Optional footer area (user avatar, settings, etc.). */
  footer?: ReactNode;
  /** Controlled collapse state – when `true` the sidebar shrinks to icon-only. */
  collapsed?: boolean;
  /** Fires when the user clicks the collapse toggle button. */
  onToggleCollapse?: () => void;
  /** Controlled mobile open state – parent manages this. */
  mobileOpen?: boolean;
  /** Fires when parent should toggle mobile drawer. */
  onMobileToggle?: () => void;
}

// ---------------------------------------------------------------------------
// Breakpoint helpers
// ---------------------------------------------------------------------------

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

let resizeListeners: (() => void)[] = [];

function subscribeToResize(callback: () => void) {
  resizeListeners.push(callback);
  window.addEventListener('resize', callback);
  return () => {
    resizeListeners = resizeListeners.filter((l) => l !== callback);
    window.removeEventListener('resize', callback);
  };
}

function getViewportWidth() {
  return window.innerWidth;
}

function getServerViewportWidth() {
  return TABLET_BREAKPOINT;
}

function useBreakpoint() {
  const width = useSyncExternalStore(
    subscribeToResize,
    getViewportWidth,
    getServerViewportWidth,
  );

  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
  };
}

// ---------------------------------------------------------------------------
// Hydration-safe mounted detection
// ---------------------------------------------------------------------------

const noopSubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// ---------------------------------------------------------------------------
// SidebarNavItem
// ---------------------------------------------------------------------------

interface SidebarNavItemProps {
  item: SidebarItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

function SidebarNavItem({ item, isActive, collapsed, onClick }: SidebarNavItemProps) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-md',
        collapsed ? 'justify-center px-0 py-2.5' : 'px-4 py-2.5',
        'transition-colors duration-150 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800',
        isActive
          ? 'bg-slate-700 text-white'
          : 'text-slate-300 hover:bg-slate-700/60 hover:text-slate-100',
      )}
    >
      <span
        className={cn(
          'absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l-full transition-all duration-150',
          isActive ? 'bg-violet-600 opacity-100' : 'bg-transparent opacity-0',
        )}
      />

      <Icon
        size={20}
        className={cn(
          'shrink-0 transition-colors duration-150',
          isActive ? 'text-white' : 'text-slate-400',
        )}
      />

      {!collapsed && (
        <span className="flex flex-1 items-center justify-between gap-2 truncate text-sm font-medium">
          <span className="truncate">{item.label}</span>

          {item.badge != null && (
            <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {item.badge}
            </span>
          )}
        </span>
      )}

      {collapsed && item.badge != null && (
        <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-violet-500" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DashboardSidebar
// ---------------------------------------------------------------------------

export function DashboardSidebar({
  sections,
  activeKey,
  onNavigate,
  logo,
  footer,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  mobileOpen: controlledMobileOpen,
  onMobileToggle,
}: DashboardSidebarProps) {
  const mounted = useHydrated();
  const { isMobile, isTablet } = useBreakpoint();

  // Mobile: use controlled prop if provided, otherwise internal state
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = controlledMobileOpen ?? internalMobileOpen;
  const setMobileOpen = onMobileToggle
    ? () => onMobileToggle()
    : (v: boolean) => setInternalMobileOpen(v);

  // Close mobile on viewport change
  const [prevIsMobile, setPrevIsMobile] = useState(true);
  useEffect(() => {
    if (prevIsMobile && !isMobile) {
      setMobileOpen(false);
      setPrevIsMobile(false);
    }
    if (!prevIsMobile && isMobile) {
      setPrevIsMobile(true);
    }
  }, [isMobile, prevIsMobile, setMobileOpen]);

  const mobileVisible = isMobile && mobileOpen;

  const effectiveCollapsed = isMobile
    ? false
    : isTablet
      ? true
      : (controlledCollapsed ?? false);

  const handleNavigate = useCallback(
    (key: string) => {
      onNavigate(key);
      setMobileOpen(false);
    },
    [onNavigate, setMobileOpen],
  );

  // Close on Escape
  useEffect(() => {
    if (!mobileVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileVisible, setMobileOpen]);

  const renderedSections = useMemo(
    () =>
      sections.map((section, sIdx) => (
        <div key={sIdx} className="flex flex-col gap-1">
          {section.title && !effectiveCollapsed && (
            <h4 className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </h4>
          )}

          {section.title && effectiveCollapsed && (
            <div className="mx-3 my-2 h-px bg-slate-700" />
          )}

          {section.items.map((item) => (
            <SidebarNavItem
              key={item.key}
              item={item}
              isActive={activeKey === item.key}
              collapsed={effectiveCollapsed}
              onClick={() => {
                if (item.onClick) item.onClick();
                handleNavigate(item.key);
              }}
            />
          ))}
        </div>
      )),
    [sections, activeKey, effectiveCollapsed, handleNavigate],
  );

  const showCollapseToggle = !isMobile && onToggleCollapse;
  const CollapseIcon = effectiveCollapsed ? PanelRightOpen : PanelRightClose;

  // Before mount: placeholder
  if (!mounted) {
    return (
      <aside
        dir="rtl"
        className="relative flex h-full flex-col shrink-0 overflow-hidden bg-slate-800 transition-all duration-300 ease-in-out w-[260px]"
        style={{ backgroundColor: '#1e293b' }}
      >
        {logo && (
          <div className="mt-6 flex shrink-0 items-center px-4 pb-4">
            {logo}
          </div>
        )}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          {renderedSections}
        </nav>
      </aside>
    );
  }

  // -----------------------------------------------------------------------
  // Mobile: overlay drawer (renders backdrop + aside, no wrapper)
  // -----------------------------------------------------------------------
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-50 bg-black/50 transition-opacity duration-200',
            mobileVisible
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer */}
        <aside
          dir="rtl"
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden bg-slate-800 shadow-2xl transition-transform duration-300 ease-in-out',
            mobileVisible ? 'translate-x-0' : 'translate-x-full',
          )}
          style={{ width: 260, backgroundColor: '#1e293b' }}
        >
          {logo && (
            <div className="mt-6 flex shrink-0 items-center justify-center px-4 pb-4">
              {logo}
            </div>
          )}

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
            {renderedSections}
          </nav>

          {footer && (
            <div className="shrink-0 border-t border-slate-700/60 px-4 py-3">
              {footer}
            </div>
          )}
        </aside>
      </>
    );
  }

  // -----------------------------------------------------------------------
  // Desktop / Tablet: inline sidebar
  // -----------------------------------------------------------------------
  return (
    <aside
      dir="rtl"
      className={cn(
        'relative flex h-full flex-col shrink-0 overflow-hidden bg-slate-800 transition-all duration-300 ease-in-out',
        effectiveCollapsed ? 'w-[72px]' : 'w-[260px]',
      )}
      style={{ backgroundColor: '#1e293b' }}
    >
      {logo && (
        <div
          className={cn(
            'mt-6 flex shrink-0 items-center',
            effectiveCollapsed ? 'justify-center px-2 pb-4' : 'px-4 pb-4',
          )}
        >
          {logo}
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        {renderedSections}
      </nav>

      {showCollapseToggle && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-slate-700/60 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            effectiveCollapsed && 'justify-center px-0',
          )}
          aria-label={effectiveCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          <CollapseIcon size={20} />
          {!effectiveCollapsed && <span>تصغير القائمة</span>}
        </button>
      )}

      {footer && (
        <div className="shrink-0 border-t border-slate-700/60 px-4 py-3">
          {footer}
        </div>
      )}
    </aside>
  );
}
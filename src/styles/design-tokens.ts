/**
 * Design Tokens - Centralized styling constants
 *
 * This file contains all the shared styling constants used throughout the app.
 * Update these values to change the styling across all components at once.
 */

// ============================================================================
// SECTION HEADERS
// ============================================================================

/**
 * Dark section header - used for modal headers, report headers, cards with emphasis
 */
export const sectionHeader = {
  base: 'bg-gray-900 text-white',
  title: 'text-lg font-semibold text-white',
  subtitle: 'text-sm text-gray-400',
  icon: 'text-white',
  iconContainer: 'w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center',
};

/**
 * Light section header - used for simple section titles
 */
export const sectionLabel = {
  base: 'flex items-center gap-2',
  icon: 'text-gray-400',
  text: 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide',
};

// ============================================================================
// CARDS
// ============================================================================

export const card = {
  base: 'bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700',
  padded: 'bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700',
  hover: 'hover:shadow-md transition-shadow',
};

// ============================================================================
// BADGES & INDICATORS
// ============================================================================

/**
 * Rank badge - used for numbered rankings (1st, 2nd, 3rd, etc.)
 */
export const rankBadge = {
  base: 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
  primary: 'bg-gray-900 dark:bg-white text-white dark:text-gray-900',
  secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

/**
 * Avatar placeholder - used when no profile image is available
 */
export const avatar = {
  base: 'rounded-full flex items-center justify-center',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
  colors: {
    primary: 'bg-gray-900 dark:bg-white text-white dark:text-gray-900',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    muted: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
  },
};

// ============================================================================
// PROGRESS BARS
// ============================================================================

export const progressBar = {
  track: 'h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden',
  fill: 'h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-500',
};

// ============================================================================
// INPUT CONTAINERS
// ============================================================================

export const inputContainer = {
  base: 'bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700',
};

// ============================================================================
// KPI / STATS
// ============================================================================

export const kpiCard = {
  container: 'bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700',
  label: 'flex items-center gap-2 mb-2',
  labelIcon: 'text-gray-400',
  labelText: 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide',
  value: 'text-2xl font-bold text-gray-900 dark:text-white',
  subtitle: 'text-xs text-gray-400 mt-1',
};

/**
 * Dark stats panel - used for daily summaries
 */
export const darkStatsPanel = {
  container: 'bg-gray-900 rounded-xl p-6 text-white',
  header: 'flex items-center gap-3 mb-6',
  iconContainer: 'w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center',
  title: 'text-lg font-semibold capitalize',
  subtitle: 'text-sm text-gray-400',
  statsGrid: 'grid grid-cols-3 gap-6',
  statLabel: 'flex items-center gap-2 text-gray-400',
  statLabelIcon: 'size-[14px]',
  statLabelText: 'text-xs font-medium uppercase tracking-wide',
  statValue: 'text-3xl font-bold tracking-tight',
};

// ============================================================================
// DIVIDERS
// ============================================================================

export const divider = {
  light: 'border-t border-gray-100 dark:border-gray-700',
  dark: 'border-t border-gray-800',
};

// ============================================================================
// BUTTONS
// ============================================================================

export const buttonVariants = {
  primary: 'bg-gray-900 hover:bg-gray-800 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white',
  ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

// ============================================================================
// HELPER CLASSES
// ============================================================================

/**
 * Combines multiple class strings, filtering out undefined/null values
 */
export const cx = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export type OnboardingTrigger =
  | {
      type: 'xp';
      value: number;
      label?: string;
    }
  | {
    type: 'content';
    contentType: 'lesson' | 'course' | 'blog';
    contentId: string;
    contentTitle?: string;
    label?: string;
  };

type OnboardingCta = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type OnboardingPopup = {
  id: string;
  house: string;
  xpGate?: string;
  title: string;
  body: string;
  highlights?: string[];
  badgeLabel?: string;
  primaryCta?: OnboardingCta;
  secondaryCta?: OnboardingCta;
  trigger?: OnboardingTrigger;
  status?: 'draft' | 'ready' | 'published';
  language?: string | null;
};

export type HouseOnboardingAnalytics = {
  ctr: number;
  completionRate: number;
  manualApprovals: number;
  blockedAttempts: number;
};

export type HouseOnboardingSequence = {
  house: string;
  sport: string;
  head: string;
  popups: OnboardingPopup[];
  analytics: HouseOnboardingAnalytics;
};

export type OnboardingLogAction = 'delivered' | 'primary' | 'secondary' | 'dismiss';

export type OnboardingLogEntry = {
  id: string;
  popupId: string;
  action: OnboardingLogAction;
  timestamp: number;
  house: string;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
};

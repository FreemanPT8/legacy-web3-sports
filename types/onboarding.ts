export type OnboardingPopup = {
  id: string;
  house: string;
  xpGate?: string;
  title: string;
  body: string;
  highlights?: string[];
  badgeLabel?: string;
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
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

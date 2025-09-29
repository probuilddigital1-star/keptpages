const KEY = 'sleek_ux_flags_v1';

export function getFlags() {
  try { 
    return JSON.parse(localStorage.getItem(KEY)) || {}; 
  } catch { 
    return {}; 
  }
}

export function setFlags(patch) {
  const next = { ...getFlags(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isFirstRunDone() {
  return !!getFlags().firstRunDone;
}

export function completeFirstRun() {
  return setFlags({ firstRunDone: true });
}

export function hasCompletedOnboarding() {
  return !!getFlags().onboardingCompleted;
}

export function completeOnboarding() {
  return setFlags({ onboardingCompleted: true });
}
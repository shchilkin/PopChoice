export function createFreshQuizHref(): string {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `/quiz?restart=${token}`;
}

export function navigateToFreshQuiz(): void {
  window.location.assign(createFreshQuizHref());
}

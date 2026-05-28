export const CATALOG_HEALTH_REFRESH_EVENT = 'popchoice:catalog-health-refresh';

export function requestCatalogHealthRefresh(): void {
  window.dispatchEvent(new CustomEvent(CATALOG_HEALTH_REFRESH_EVENT));
}

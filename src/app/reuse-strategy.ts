import {
    RouteReuseStrategy,
    DetachedRouteHandle,
    ActivatedRouteSnapshot
} from '@angular/router';

export class CustomReuseStrategy implements RouteReuseStrategy {
    private storedRoutes = new Map<string, DetachedRouteHandle>();

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        // Cache only the files route (preserves file upload state).
        // Results must reinitialize from the service to pick up fresh data.
        // Analysis must reinitialize so no method appears pre-selected.
        return route.routeConfig?.path === 'files';
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
        if (route.routeConfig && handle) {
            this.storedRoutes.set(route.routeConfig.path ?? '', handle);
        }
        // Stores the route (component, e.g. Files) keyed by its path
    }

    // Called when a route is about to be reattached; checks whether it has been stored
    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        return this.storedRoutes.has(route.routeConfig?.path ?? '');
    }

    // Called when a route is about to be reattached; returns the stored handle if available
    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        return this.storedRoutes.get(route.routeConfig?.path ?? '') || null;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        return future.routeConfig === curr.routeConfig;
    }
}
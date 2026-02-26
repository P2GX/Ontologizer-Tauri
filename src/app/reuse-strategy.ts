import {
    RouteReuseStrategy,
    DetachedRouteHandle,
    ActivatedRouteSnapshot
} from '@angular/router';

export class CustomReuseStrategy implements RouteReuseStrategy {
    private storedRoutes = new Map<string, DetachedRouteHandle>();

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        return true; // immer Route trennen --> Komponente zwischenspeichern --> beim wechseln/navigieren
        // zwischen Seiten wird die Komponente also Seite nicht neu geladen
        // und die Daten bleiben erhalten
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
        if (route.routeConfig && handle) {
            this.storedRoutes.set(route.routeConfig.path ?? '', handle);
        }
        // Speichert die Route (Komponente, also z.B. Files) mit ihrem Pfad als Schlüssel
    }

    // Diese Methode wird aufgerufen, wenn eine Route wiederverwendet werden soll
    // und prüft, ob die Route bereits gespeichert wurde
    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        return this.storedRoutes.has(route.routeConfig?.path ?? '');
    }

    // Diese Methode wird aufgerufen, wenn eine Route wiederverwendet werden soll
    // und gibt die gespeicherte Route zurück, falls vorhanden
    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        return this.storedRoutes.get(route.routeConfig?.path ?? '') || null;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        return future.routeConfig === curr.routeConfig;
    }
}
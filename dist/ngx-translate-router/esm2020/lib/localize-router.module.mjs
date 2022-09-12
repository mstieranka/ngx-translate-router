import { NgModule, APP_INITIALIZER, Optional, SkipSelf, Injectable, Injector, ApplicationRef, Compiler } from '@angular/core';
import { LocalizeRouterService } from './localize-router.service';
import { DummyLocalizeParser, LocalizeParser } from './localize-router.parser';
import { RouterModule, RouteReuseStrategy, Router, UrlSerializer, ChildrenOutletContexts, ROUTES, ROUTER_CONFIGURATION, UrlHandlingStrategy, DefaultTitleStrategy, TitleStrategy } from '@angular/router';
import { LocalizeRouterPipe } from './localize-router.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule, Location } from '@angular/common';
import { ALWAYS_SET_PREFIX, CACHE_MECHANISM, CACHE_NAME, DEFAULT_LANG_FUNCTION, LOCALIZE_ROUTER_FORROOT_GUARD, LocalizeRouterSettings, RAW_ROUTES, USE_CACHED_LANG, COOKIE_FORMAT, INITIAL_NAVIGATION } from './localize-router.config';
import { GilsdavReuseStrategy } from './gilsdav-reuse-strategy';
import { setupRouter } from './localized-router';
import { deepCopy } from './util';
import * as i0 from "@angular/core";
export class ParserInitializer {
    /**
     * CTOR
     */
    constructor(injector) {
        this.injector = injector;
    }
    appInitializer() {
        const res = this.parser.load(this.routes);
        return res.then(() => {
            const localize = this.injector.get(LocalizeRouterService);
            const router = this.injector.get(Router);
            const settings = this.injector.get(LocalizeRouterSettings);
            localize.init();
            if (settings.initialNavigation) {
                return new Promise(resolve => {
                    // @ts-ignore
                    const oldAfterPreactivation = router.afterPreactivation;
                    let firstInit = true;
                    // @ts-ignore
                    router.afterPreactivation = () => {
                        if (firstInit) {
                            resolve();
                            firstInit = false;
                            localize.hooks._initializedSubject.next(true);
                            localize.hooks._initializedSubject.complete();
                        }
                        return oldAfterPreactivation();
                    };
                });
            }
            else {
                localize.hooks._initializedSubject.next(true);
                localize.hooks._initializedSubject.complete();
            }
        });
    }
    generateInitializer(parser, routes) {
        this.parser = parser;
        this.routes = routes.reduce((a, b) => a.concat(b));
        return this.appInitializer;
    }
}
ParserInitializer.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: ParserInitializer, deps: [{ token: i0.Injector }], target: i0.ɵɵFactoryTarget.Injectable });
ParserInitializer.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: ParserInitializer });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: ParserInitializer, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i0.Injector }]; } });
export function getAppInitializer(p, parser, routes) {
    // DeepCopy needed to prevent RAW_ROUTES mutation
    const routesCopy = deepCopy(routes);
    return p.generateInitializer(parser, routesCopy).bind(p);
}
export class LocalizeRouterModule {
    static forRoot(routes, config = {}) {
        return {
            ngModule: LocalizeRouterModule,
            providers: [
                {
                    provide: Router,
                    useFactory: setupRouter,
                    deps: [
                        ApplicationRef,
                        UrlSerializer,
                        ChildrenOutletContexts,
                        Location,
                        Injector,
                        Compiler,
                        ROUTES,
                        LocalizeParser,
                        ROUTER_CONFIGURATION,
                        DefaultTitleStrategy,
                        [TitleStrategy, new Optional()],
                        [UrlHandlingStrategy, new Optional()],
                        [RouteReuseStrategy, new Optional()]
                    ]
                },
                {
                    provide: LOCALIZE_ROUTER_FORROOT_GUARD,
                    useFactory: provideForRootGuard,
                    deps: [[LocalizeRouterModule, new Optional(), new SkipSelf()]]
                },
                { provide: USE_CACHED_LANG, useValue: config.useCachedLang },
                { provide: ALWAYS_SET_PREFIX, useValue: config.alwaysSetPrefix },
                { provide: CACHE_NAME, useValue: config.cacheName },
                { provide: CACHE_MECHANISM, useValue: config.cacheMechanism },
                { provide: DEFAULT_LANG_FUNCTION, useValue: config.defaultLangFunction },
                { provide: COOKIE_FORMAT, useValue: config.cookieFormat },
                { provide: INITIAL_NAVIGATION, useValue: config.initialNavigation },
                LocalizeRouterSettings,
                config.parser || { provide: LocalizeParser, useClass: DummyLocalizeParser },
                {
                    provide: RAW_ROUTES,
                    multi: true,
                    useValue: routes
                },
                LocalizeRouterService,
                ParserInitializer,
                {
                    provide: APP_INITIALIZER,
                    multi: true,
                    useFactory: getAppInitializer,
                    deps: [ParserInitializer, LocalizeParser, RAW_ROUTES]
                },
                {
                    provide: RouteReuseStrategy,
                    useClass: GilsdavReuseStrategy
                }
            ]
        };
    }
    static forChild(routes) {
        return {
            ngModule: LocalizeRouterModule,
            providers: [
                {
                    provide: RAW_ROUTES,
                    multi: true,
                    useValue: routes
                }
            ]
        };
    }
}
LocalizeRouterModule.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
LocalizeRouterModule.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterModule, declarations: [LocalizeRouterPipe], imports: [CommonModule, RouterModule, TranslateModule], exports: [LocalizeRouterPipe] });
LocalizeRouterModule.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterModule, imports: [CommonModule, RouterModule, TranslateModule] });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule, RouterModule, TranslateModule],
                    declarations: [LocalizeRouterPipe],
                    exports: [LocalizeRouterPipe]
                }]
        }] });
export function provideForRootGuard(localizeRouterModule) {
    if (localizeRouterModule) {
        throw new Error(`LocalizeRouterModule.forRoot() called twice. Lazy loaded modules should use LocalizeRouterModule.forChild() instead.`);
    }
    return 'guarded';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemUtcm91dGVyLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL25neC10cmFuc2xhdGUtcm91dGVyL3NyYy9saWIvbG9jYWxpemUtcm91dGVyLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsUUFBUSxFQUF1QixlQUFlLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFDbEUsVUFBVSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUMvQyxNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0UsT0FBTyxFQUNMLFlBQVksRUFBVSxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLHNCQUFzQixFQUN2RixNQUFNLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsYUFBYSxFQUN2RixNQUFNLGlCQUFpQixDQUFDO0FBQ3pCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3pELE9BQU8sRUFDTCxpQkFBaUIsRUFDakIsZUFBZSxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSw2QkFBNkIsRUFDM0Qsc0JBQXNCLEVBQzVDLFVBQVUsRUFDVixlQUFlLEVBQ2YsYUFBYSxFQUNiLGtCQUFrQixFQUNuQixNQUFNLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxv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QUFvQixFQUFFO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQ2Isc0hBQXNILENBQUMsQ0FBQztLQUMzSDtJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIE5nTW9kdWxlLCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBBUFBfSU5JVElBTElaRVIsIE9wdGlvbmFsLCBTa2lwU2VsZixcclxuICBJbmplY3RhYmxlLCBJbmplY3RvciwgQXBwbGljYXRpb25SZWYsIENvbXBpbGVyXHJcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCB7IExvY2FsaXplUm91dGVyU2VydmljZSB9IGZyb20gJy4vbG9jYWxpemUtcm91dGVyLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEdW1teUxvY2FsaXplUGFyc2VyLCBMb2NhbGl6ZVBhcnNlciB9IGZyb20gJy4vbG9jYWxpemUtcm91dGVyLnBhcnNlcic7XHJcbmltcG9ydCB7XHJcbiAgUm91dGVyTW9kdWxlLCBSb3V0ZXMsIFJvdXRlUmV1c2VTdHJhdGVneSwgUm91dGVyLCBVcmxTZXJpYWxpemVyLCBDaGlsZHJlbk91dGxldENvbnRleHRzLFxyXG4gIFJPVVRFUywgUk9VVEVSX0NPTkZJR1VSQVRJT04sIFVybEhhbmRsaW5nU3RyYXRlZ3ksIERlZmF1bHRUaXRsZVN0cmF0ZWd5LCBUaXRsZVN0cmF0ZWd5XHJcbn0gZnJvbSAnQGFuZ3VsYXIvcm91dGVyJztcclxuaW1wb3J0IHsgTG9jYWxpemVSb3V0ZXJQaXBlIH0gZnJvbSAnLi9sb2NhbGl6ZS1yb3V0ZXIucGlwZSc7XHJcbmltcG9ydCB7IFRyYW5zbGF0ZU1vZHVsZSB9IGZyb20gJ0BuZ3gtdHJhbnNsYXRlL2NvcmUnO1xyXG5pbXBvcnQgeyBDb21tb25Nb2R1bGUsIExvY2F0aW9uIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcclxuaW1wb3J0IHtcclxuICBBTFdBWVNfU0VUX1BSRUZJWCxcclxuICBDQUNIRV9NRUNIQU5JU00sIENBQ0hFX05BTUUsIERFRkFVTFRfTEFOR19GVU5DVElPTiwgTE9DQUxJWkVfUk9VVEVSX0ZPUlJPT1RfR1VBUkQsXHJcbiAgTG9jYWxpemVSb3V0ZXJDb25maWcsIExvY2FsaXplUm91dGVyU2V0dGluZ3MsXHJcbiAgUkFXX1JPVVRFUyxcclxuICBVU0VfQ0FDSEVEX0xBTkcsXHJcbiAgQ09PS0lFX0ZPUk1BVCxcclxuICBJTklUSUFMX05BVklHQVRJT05cclxufSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci5jb25maWcnO1xyXG5pbXBvcnQgeyBHaWxzZGF2UmV1c2VTdHJhdGVneSB9IGZyb20gJy4vZ2lsc2Rhdi1yZXVzZS1zdHJhdGVneSc7XHJcbmltcG9ydCB7IHNldHVwUm91dGVyIH0gZnJvbSAnLi9sb2NhbGl6ZWQtcm91dGVyJztcclxuaW1wb3J0IHsgZGVlcENvcHkgfSBmcm9tICcuL3V0aWwnO1xyXG5cclxuQEluamVjdGFibGUoKVxyXG5leHBvcnQgY2xhc3MgUGFyc2VySW5pdGlhbGl6ZXIge1xyXG4gIHBhcnNlcjogTG9jYWxpemVQYXJzZXI7XHJcbiAgcm91dGVzOiBSb3V0ZXM7XHJcblxyXG4gIC8qKlxyXG4gICAqIENUT1JcclxuICAgKi9cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGluamVjdG9yOiBJbmplY3Rvcikge1xyXG4gIH1cclxuXHJcbiAgYXBwSW5pdGlhbGl6ZXIoKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIGNvbnN0IHJlcyA9IHRoaXMucGFyc2VyLmxvYWQodGhpcy5yb3V0ZXMpO1xyXG5cclxuICAgIHJldHVybiByZXMudGhlbigoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGxvY2FsaXplID0gdGhpcy5pbmplY3Rvci5nZXQoTG9jYWxpemVSb3V0ZXJTZXJ2aWNlKTtcclxuICAgICAgY29uc3Qgcm91dGVyID0gdGhpcy5pbmplY3Rvci5nZXQoUm91dGVyKTtcclxuICAgICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLmluamVjdG9yLmdldChMb2NhbGl6ZVJvdXRlclNldHRpbmdzKTtcclxuICAgICAgbG9jYWxpemUuaW5pdCgpO1xyXG5cclxuICAgICAgaWYgKHNldHRpbmdzLmluaXRpYWxOYXZpZ2F0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4ge1xyXG4gICAgICAgICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgICAgICAgY29uc3Qgb2xkQWZ0ZXJQcmVhY3RpdmF0aW9uID0gcm91dGVyLmFmdGVyUHJlYWN0aXZhdGlvbjtcclxuICAgICAgICAgIGxldCBmaXJzdEluaXQgPSB0cnVlO1xyXG4gICAgICAgICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgICAgICAgcm91dGVyLmFmdGVyUHJlYWN0aXZhdGlvbiA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKGZpcnN0SW5pdCkge1xyXG4gICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICBmaXJzdEluaXQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICBsb2NhbGl6ZS5ob29rcy5faW5pdGlhbGl6ZWRTdWJqZWN0Lm5leHQodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgbG9jYWxpemUuaG9va3MuX2luaXRpYWxpemVkU3ViamVjdC5jb21wbGV0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBvbGRBZnRlclByZWFjdGl2YXRpb24oKTtcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9jYWxpemUuaG9va3MuX2luaXRpYWxpemVkU3ViamVjdC5uZXh0KHRydWUpO1xyXG4gICAgICAgIGxvY2FsaXplLmhvb2tzLl9pbml0aWFsaXplZFN1YmplY3QuY29tcGxldGUoKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZW5lcmF0ZUluaXRpYWxpemVyKHBhcnNlcjogTG9jYWxpemVQYXJzZXIsIHJvdXRlczogUm91dGVzW10pOiAoKSA9PiBQcm9taXNlPGFueT4ge1xyXG4gICAgdGhpcy5wYXJzZXIgPSBwYXJzZXI7XHJcbiAgICB0aGlzLnJvdXRlcyA9IHJvdXRlcy5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIpKTtcclxuICAgIHJldHVybiB0aGlzLmFwcEluaXRpYWxpemVyO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFwcEluaXRpYWxpemVyKHA6IFBhcnNlckluaXRpYWxpemVyLCBwYXJzZXI6IExvY2FsaXplUGFyc2VyLCByb3V0ZXM6IFJvdXRlc1tdKTogYW55IHtcclxuICAvLyBEZWVwQ29weSBuZWVkZWQgdG8gcHJldmVudCBSQVdfUk9VVEVTIG11dGF0aW9uXHJcbiAgY29uc3Qgcm91dGVzQ29weSA9IGRlZXBDb3B5KHJvdXRlcyk7XHJcbiAgcmV0dXJuIHAuZ2VuZXJhdGVJbml0aWFsaXplcihwYXJzZXIsIHJvdXRlc0NvcHkpLmJpbmQocCk7XHJcbn1cclxuXHJcbkBOZ01vZHVsZSh7XHJcbiAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSwgUm91dGVyTW9kdWxlLCBUcmFuc2xhdGVNb2R1bGVdLFxyXG4gIGRlY2xhcmF0aW9uczogW0xvY2FsaXplUm91dGVyUGlwZV0sXHJcbiAgZXhwb3J0czogW0xvY2FsaXplUm91dGVyUGlwZV1cclxufSlcclxuZXhwb3J0IGNsYXNzIExvY2FsaXplUm91dGVyTW9kdWxlIHtcclxuXHJcbiAgc3RhdGljIGZvclJvb3Qocm91dGVzOiBSb3V0ZXMsIGNvbmZpZzogTG9jYWxpemVSb3V0ZXJDb25maWcgPSB7fSk6IE1vZHVsZVdpdGhQcm92aWRlcnM8TG9jYWxpemVSb3V0ZXJNb2R1bGU+IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG5nTW9kdWxlOiBMb2NhbGl6ZVJvdXRlck1vZHVsZSxcclxuICAgICAgcHJvdmlkZXJzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZTogUm91dGVyLFxyXG4gICAgICAgICAgdXNlRmFjdG9yeTogc2V0dXBSb3V0ZXIsXHJcbiAgICAgICAgICBkZXBzOiBbXHJcbiAgICAgICAgICAgIEFwcGxpY2F0aW9uUmVmLFxyXG4gICAgICAgICAgICBVcmxTZXJpYWxpemVyLFxyXG4gICAgICAgICAgICBDaGlsZHJlbk91dGxldENvbnRleHRzLFxyXG4gICAgICAgICAgICBMb2NhdGlvbixcclxuICAgICAgICAgICAgSW5qZWN0b3IsXHJcbiAgICAgICAgICAgIENvbXBpbGVyLFxyXG4gICAgICAgICAgICBST1VURVMsXHJcbiAgICAgICAgICAgIExvY2FsaXplUGFyc2VyLFxyXG4gICAgICAgICAgICBST1VURVJfQ09ORklHVVJBVElPTixcclxuICAgICAgICAgICAgRGVmYXVsdFRpdGxlU3RyYXRlZ3ksXHJcbiAgICAgICAgICAgIFtUaXRsZVN0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV0sXHJcbiAgICAgICAgICAgIFtVcmxIYW5kbGluZ1N0cmF0ZWd5LCBuZXcgT3B0aW9uYWwoKV0sXHJcbiAgICAgICAgICAgIFtSb3V0ZVJldXNlU3RyYXRlZ3ksIG5ldyBPcHRpb25hbCgpXVxyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZTogTE9DQUxJWkVfUk9VVEVSX0ZPUlJPT1RfR1VBUkQsXHJcbiAgICAgICAgICB1c2VGYWN0b3J5OiBwcm92aWRlRm9yUm9vdEd1YXJkLFxyXG4gICAgICAgICAgZGVwczogW1tMb2NhbGl6ZVJvdXRlck1vZHVsZSwgbmV3IE9wdGlvbmFsKCksIG5ldyBTa2lwU2VsZigpXV1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHsgcHJvdmlkZTogVVNFX0NBQ0hFRF9MQU5HLCB1c2VWYWx1ZTogY29uZmlnLnVzZUNhY2hlZExhbmcgfSxcclxuICAgICAgICB7IHByb3ZpZGU6IEFMV0FZU19TRVRfUFJFRklYLCB1c2VWYWx1ZTogY29uZmlnLmFsd2F5c1NldFByZWZpeCB9LFxyXG4gICAgICAgIHsgcHJvdmlkZTogQ0FDSEVfTkFNRSwgdXNlVmFsdWU6IGNvbmZpZy5jYWNoZU5hbWUgfSxcclxuICAgICAgICB7IHByb3ZpZGU6IENBQ0hFX01FQ0hBTklTTSwgdXNlVmFsdWU6IGNvbmZpZy5jYWNoZU1lY2hhbmlzbSB9LFxyXG4gICAgICAgIHsgcHJvdmlkZTogREVGQVVMVF9MQU5HX0ZVTkNUSU9OLCB1c2VWYWx1ZTogY29uZmlnLmRlZmF1bHRMYW5nRnVuY3Rpb24gfSxcclxuICAgICAgICB7IHByb3ZpZGU6IENPT0tJRV9GT1JNQVQsIHVzZVZhbHVlOiBjb25maWcuY29va2llRm9ybWF0IH0sXHJcbiAgICAgICAgeyBwcm92aWRlOiBJTklUSUFMX05BVklHQVRJT04sIHVzZVZhbHVlOiBjb25maWcuaW5pdGlhbE5hdmlnYXRpb24gfSxcclxuICAgICAgICBMb2NhbGl6ZVJvdXRlclNldHRpbmdzLFxyXG4gICAgICAgIGNvbmZpZy5wYXJzZXIgfHwgeyBwcm92aWRlOiBMb2NhbGl6ZVBhcnNlciwgdXNlQ2xhc3M6IER1bW15TG9jYWxpemVQYXJzZXIgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlOiBSQVdfUk9VVEVTLFxyXG4gICAgICAgICAgbXVsdGk6IHRydWUsXHJcbiAgICAgICAgICB1c2VWYWx1ZTogcm91dGVzXHJcbiAgICAgICAgfSxcclxuICAgICAgICBMb2NhbGl6ZVJvdXRlclNlcnZpY2UsXHJcbiAgICAgICAgUGFyc2VySW5pdGlhbGl6ZXIsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZTogQVBQX0lOSVRJQUxJWkVSLFxyXG4gICAgICAgICAgbXVsdGk6IHRydWUsXHJcbiAgICAgICAgICB1c2VGYWN0b3J5OiBnZXRBcHBJbml0aWFsaXplcixcclxuICAgICAgICAgIGRlcHM6IFtQYXJzZXJJbml0aWFsaXplciwgTG9jYWxpemVQYXJzZXIsIFJBV19ST1VURVNdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlOiBSb3V0ZVJldXNlU3RyYXRlZ3ksXHJcbiAgICAgICAgICB1c2VDbGFzczogR2lsc2RhdlJldXNlU3RyYXRlZ3lcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBzdGF0aWMgZm9yQ2hpbGQocm91dGVzOiBSb3V0ZXMpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPExvY2FsaXplUm91dGVyTW9kdWxlPiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBuZ01vZHVsZTogTG9jYWxpemVSb3V0ZXJNb2R1bGUsXHJcbiAgICAgIHByb3ZpZGVyczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHByb3ZpZGU6IFJBV19ST1VURVMsXHJcbiAgICAgICAgICBtdWx0aTogdHJ1ZSxcclxuICAgICAgICAgIHVzZVZhbHVlOiByb3V0ZXNcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvdmlkZUZvclJvb3RHdWFyZChsb2NhbGl6ZVJvdXRlck1vZHVsZTogTG9jYWxpemVSb3V0ZXJNb2R1bGUpOiBzdHJpbmcge1xyXG4gIGlmIChsb2NhbGl6ZVJvdXRlck1vZHVsZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICBgTG9jYWxpemVSb3V0ZXJNb2R1bGUuZm9yUm9vdCgpIGNhbGxlZCB0d2ljZS4gTGF6eSBsb2FkZWQgbW9kdWxlcyBzaG91bGQgdXNlIExvY2FsaXplUm91dGVyTW9kdWxlLmZvckNoaWxkKCkgaW5zdGVhZC5gKTtcclxuICB9XHJcbiAgcmV0dXJuICdndWFyZGVkJztcclxufVxyXG4iXX0=
import { Router, ROUTES } from '@angular/router';
import { NgModuleFactory, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { from, of, isObservable } from 'rxjs';
import { mergeMap, map } from 'rxjs/operators';
import { flatten, isPromise } from './util';
export class LocalizedRouter extends Router {
    constructor(_rootComponentType, _urlSerializer, _rootContexts, _location, injector, compiler, config, localize) {
        super(_rootComponentType, _urlSerializer, _rootContexts, _location, injector, compiler, config);
        this.config = config;
        // Custom configuration
        const platformId = injector.get(PLATFORM_ID);
        const isBrowser = isPlatformBrowser(platformId);
        // __proto__ is needed for preloaded modules be doesn't work with SSR
        // @ts-ignore
        const configLoader = (isBrowser ? this.configLoader.__proto__ : this.configLoader);
        configLoader.loadModuleFactoryOrRoutes = (loadChildren) => {
            return wrapIntoObservable(loadChildren()).pipe(mergeMap((t) => {
                let compiled;
                if (t instanceof NgModuleFactory || Array.isArray(t)) {
                    compiled = of(t);
                }
                else {
                    compiled = from(compiler.compileModuleAsync(t));
                }
                return compiled.pipe(map(factory => {
                    if (Array.isArray(factory)) {
                        return factory;
                    }
                    return {
                        moduleType: factory.moduleType,
                        create: (parentInjector) => {
                            const module = factory.create(parentInjector);
                            const getMethod = module.injector.get.bind(module.injector);
                            module.injector['get'] = (token, notFoundValue) => {
                                const getResult = getMethod(token, notFoundValue);
                                if (token === ROUTES) {
                                    // translate lazy routes
                                    return localize.initChildRoutes([].concat(...getResult));
                                }
                                else {
                                    return getResult;
                                }
                            };
                            return module;
                        }
                    };
                }));
            }));
        };
        // (this as any).navigations = (this as any).setupNavigations((this as any).transitions);
    }
}
export function setupRouter(ref, urlSerializer, contexts, location, injector, compiler, config, localize, opts = {}, defaultTitleStrategy, titleStrategy, urlHandlingStrategy, routeReuseStrategy) {
    const router = new LocalizedRouter(null, urlSerializer, contexts, location, injector, compiler, flatten(config), localize);
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    router.titleStrategy = titleStrategy ?? defaultTitleStrategy;
    if (opts.errorHandler) {
        router.errorHandler = opts.errorHandler;
    }
    if (opts.malformedUriErrorHandler) {
        router.malformedUriErrorHandler = opts.malformedUriErrorHandler;
    }
    if (opts.enableTracing) {
        router.events.subscribe((e) => {
            console.group(`Router Event: ${e.constructor.name}`);
            console.log(e.toString());
            console.log(e);
            console.groupEnd();
        });
    }
    if (opts.onSameUrlNavigation) {
        router.onSameUrlNavigation = opts.onSameUrlNavigation;
    }
    if (opts.paramsInheritanceStrategy) {
        router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
    }
    if (opts.urlUpdateStrategy) {
        router.urlUpdateStrategy = opts.urlUpdateStrategy;
    }
    if (opts.relativeLinkResolution) {
        router.relativeLinkResolution = opts.relativeLinkResolution;
    }
    return router;
}
export function wrapIntoObservable(value) {
    if (isObservable(value)) {
        return value;
    }
    if (isPromise(value)) {
        // Use `Promise.resolve()` to wrap promise-like instances.
        // Required ie when a Resolver returns a AngularJS `$q` promise to correctly trigger the
        // change detection.
        return from(Promise.resolve(value));
    }
    return of(value);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemVkLXJvdXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL25neC10cmFuc2xhdGUtcm91dGVyL3NyYy9saWIvbG9jYWxpemVkLXJvdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsTUFBTSxFQUN5QyxNQUFNLEVBQ3RELE1BQU0saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUE0QyxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3ZHLE9BQU8sRUFBWSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBYyxNQUFNLE1BQU0sQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBRzVDLE1BQU0sT0FBTyxlQUFnQixTQUFRLE1BQU07SUFDekMsWUFDRSxrQkFBb0MsRUFDcEMsY0FBNkIsRUFDN0IsYUFBcUMsRUFDckMsU0FBbUIsRUFBRSxRQUFrQixFQUN2QyxRQUFrQixFQUNYLE1BQWMsRUFDckIsUUFBd0I7UUFFeEIsS0FBSyxDQUFDLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFIekYsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUlyQix1QkFBdUI7UUFDdkIsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QyxNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNoRCxxRUFBcUU7UUFDckUsYUFBYTtRQUNiLE1BQU0sWUFBWSxHQUFHLENBQUMsU0FB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RCxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNwQiwwREFBMEQ7UUFDMUQsd0ZBQXdGO1FBQ3hGLG9CQUFvQjtRQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDckM7SUFFRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuICBSb3V0ZXIsIFVybFNlcmlhbGl6ZXIsIENoaWxkcmVuT3V0bGV0Q29udGV4dHMsIFJvdXRlcywgUm91dGUsIEV4dHJhT3B0aW9ucywgVXJsSGFuZGxpbmdTdHJhdGVneSxcclxuICBSb3V0ZVJldXNlU3RyYXRlZ3ksIFJvdXRlckV2ZW50LCBMb2FkQ2hpbGRyZW4sIFJPVVRFUywgRGVmYXVsdFRpdGxlU3RyYXRlZ3ksIFRpdGxlU3RyYXRlZ3lcclxufSBmcm9tICdAYW5ndWxhci9yb3V0ZXInO1xyXG5pbXBvcnQgeyBUeXBlLCBJbmplY3RvciwgQ29tcGlsZXIsIEFwcGxpY2F0aW9uUmVmLCBOZ01vZHVsZUZhY3RvcnksIFBMQVRGT1JNX0lEIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCB7IExvY2F0aW9uLCBpc1BsYXRmb3JtQnJvd3NlciB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XHJcbmltcG9ydCB7IGZyb20sIG9mLCBpc09ic2VydmFibGUsIE9ic2VydmFibGUgfSBmcm9tICdyeGpzJztcclxuaW1wb3J0IHsgbWVyZ2VNYXAsIG1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcclxuaW1wb3J0IHsgZmxhdHRlbiwgaXNQcm9taXNlIH0gZnJvbSAnLi91dGlsJztcclxuaW1wb3J0IHsgTG9jYWxpemVQYXJzZXIgfSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci5wYXJzZXInO1xyXG5cclxuZXhwb3J0IGNsYXNzIExvY2FsaXplZFJvdXRlciBleHRlbmRzIFJvdXRlciB7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBfcm9vdENvbXBvbmVudFR5cGU6IFR5cGU8YW55PiB8IG51bGwsXHJcbiAgICBfdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplcixcclxuICAgIF9yb290Q29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXHJcbiAgICBfbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsXHJcbiAgICBjb21waWxlcjogQ29tcGlsZXIsXHJcbiAgICBwdWJsaWMgY29uZmlnOiBSb3V0ZXMsXHJcbiAgICBsb2NhbGl6ZTogTG9jYWxpemVQYXJzZXJcclxuICApIHtcclxuICAgIHN1cGVyKF9yb290Q29tcG9uZW50VHlwZSwgX3VybFNlcmlhbGl6ZXIsIF9yb290Q29udGV4dHMsIF9sb2NhdGlvbiwgaW5qZWN0b3IsIGNvbXBpbGVyLCBjb25maWcpO1xyXG4gICAgLy8gQ3VzdG9tIGNvbmZpZ3VyYXRpb25cclxuICAgIGNvbnN0IHBsYXRmb3JtSWQgPSBpbmplY3Rvci5nZXQoUExBVEZPUk1fSUQpO1xyXG4gICAgY29uc3QgaXNCcm93c2VyID0gaXNQbGF0Zm9ybUJyb3dzZXIocGxhdGZvcm1JZCk7XHJcbiAgICAvLyBfX3Byb3RvX18gaXMgbmVlZGVkIGZvciBwcmVsb2FkZWQgbW9kdWxlcyBiZSBkb2Vzbid0IHdvcmsgd2l0aCBTU1JcclxuICAgIC8vIEB0cy1pZ25vcmVcclxuICAgIGNvbnN0IGNvbmZpZ0xvYWRlciA9IChpc0Jyb3dzZXIgPyB0aGlzLmNvbmZpZ0xvYWRlci5fX3Byb3RvX18gOiB0aGlzLmNvbmZpZ0xvYWRlcik7XHJcblxyXG4gICAgY29uZmlnTG9hZGVyLmxvYWRNb2R1bGVGYWN0b3J5T3JSb3V0ZXMgPSAobG9hZENoaWxkcmVuOiBMb2FkQ2hpbGRyZW4pID0+IHtcclxuICAgICAgcmV0dXJuIHdyYXBJbnRvT2JzZXJ2YWJsZShsb2FkQ2hpbGRyZW4oKSkucGlwZShtZXJnZU1hcCgodDogYW55KSA9PiB7XHJcbiAgICAgICAgbGV0IGNvbXBpbGVkOiBPYnNlcnZhYmxlPE5nTW9kdWxlRmFjdG9yeTxhbnk+IHwgQXJyYXk8YW55Pj47XHJcbiAgICAgICAgaWYgKHQgaW5zdGFuY2VvZiBOZ01vZHVsZUZhY3RvcnkgfHwgQXJyYXkuaXNBcnJheSh0KSkge1xyXG4gICAgICAgICAgY29tcGlsZWQgPSBvZih0KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY29tcGlsZWQgPSBmcm9tKGNvbXBpbGVyLmNvbXBpbGVNb2R1bGVBc3luYyh0KSkgYXMgT2JzZXJ2YWJsZTxOZ01vZHVsZUZhY3Rvcnk8YW55Pj47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb21waWxlZC5waXBlKG1hcChmYWN0b3J5ID0+IHtcclxuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGZhY3RvcnkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWN0b3J5O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbW9kdWxlVHlwZTogZmFjdG9yeS5tb2R1bGVUeXBlLFxyXG4gICAgICAgICAgICBjcmVhdGU6IChwYXJlbnRJbmplY3RvcjogSW5qZWN0b3IpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCBtb2R1bGUgPSBmYWN0b3J5LmNyZWF0ZShwYXJlbnRJbmplY3Rvcik7XHJcbiAgICAgICAgICAgICAgY29uc3QgZ2V0TWV0aG9kID0gbW9kdWxlLmluamVjdG9yLmdldC5iaW5kKG1vZHVsZS5pbmplY3Rvcik7XHJcblxyXG4gICAgICAgICAgICAgIG1vZHVsZS5pbmplY3RvclsnZ2V0J10gPSAodG9rZW46IGFueSwgbm90Rm91bmRWYWx1ZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBnZXRSZXN1bHQgPSBnZXRNZXRob2QodG9rZW4sIG5vdEZvdW5kVmFsdWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0b2tlbiA9PT0gUk9VVEVTKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHRyYW5zbGF0ZSBsYXp5IHJvdXRlc1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gbG9jYWxpemUuaW5pdENoaWxkUm91dGVzKFtdLmNvbmNhdCguLi5nZXRSZXN1bHQpKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRSZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICByZXR1cm4gbW9kdWxlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgfSkpO1xyXG4gICAgfTtcclxuICAgIC8vICh0aGlzIGFzIGFueSkubmF2aWdhdGlvbnMgPSAodGhpcyBhcyBhbnkpLnNldHVwTmF2aWdhdGlvbnMoKHRoaXMgYXMgYW55KS50cmFuc2l0aW9ucyk7XHJcbiAgfVxyXG5cclxufVxyXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBSb3V0ZXIoXHJcbiAgcmVmOiBBcHBsaWNhdGlvblJlZiwgdXJsU2VyaWFsaXplcjogVXJsU2VyaWFsaXplciwgY29udGV4dHM6IENoaWxkcmVuT3V0bGV0Q29udGV4dHMsXHJcbiAgbG9jYXRpb246IExvY2F0aW9uLCBpbmplY3RvcjogSW5qZWN0b3IsIGNvbXBpbGVyOiBDb21waWxlcixcclxuICBjb25maWc6IFJvdXRlW11bXSwgbG9jYWxpemU6IExvY2FsaXplUGFyc2VyLCBvcHRzOiBFeHRyYU9wdGlvbnMgPSB7fSxcclxuICBkZWZhdWx0VGl0bGVTdHJhdGVneTogRGVmYXVsdFRpdGxlU3RyYXRlZ3ksIHRpdGxlU3RyYXRlZ3k/OiBUaXRsZVN0cmF0ZWd5LFxyXG4gIHVybEhhbmRsaW5nU3RyYXRlZ3k/OiBVcmxIYW5kbGluZ1N0cmF0ZWd5LCByb3V0ZVJldXNlU3RyYXRlZ3k/OiBSb3V0ZVJldXNlU3RyYXRlZ3kpIHtcclxuICBjb25zdCByb3V0ZXIgPSBuZXcgTG9jYWxpemVkUm91dGVyKFxyXG4gICAgbnVsbCwgdXJsU2VyaWFsaXplciwgY29udGV4dHMsIGxvY2F0aW9uLCBpbmplY3RvciwgY29tcGlsZXIsIGZsYXR0ZW4oY29uZmlnKSwgbG9jYWxpemUpO1xyXG5cclxuICBpZiAodXJsSGFuZGxpbmdTdHJhdGVneSkge1xyXG4gICAgcm91dGVyLnVybEhhbmRsaW5nU3RyYXRlZ3kgPSB1cmxIYW5kbGluZ1N0cmF0ZWd5O1xyXG4gIH1cclxuXHJcbiAgaWYgKHJvdXRlUmV1c2VTdHJhdGVneSkge1xyXG4gICAgcm91dGVyLnJvdXRlUmV1c2VTdHJhdGVneSA9IHJvdXRlUmV1c2VTdHJhdGVneTtcclxuICB9XHJcblxyXG4gIHJvdXRlci50aXRsZVN0cmF0ZWd5ID0gdGl0bGVTdHJhdGVneSA/PyBkZWZhdWx0VGl0bGVTdHJhdGVneTtcclxuXHJcbiAgaWYgKG9wdHMuZXJyb3JIYW5kbGVyKSB7XHJcbiAgICByb3V0ZXIuZXJyb3JIYW5kbGVyID0gb3B0cy5lcnJvckhhbmRsZXI7XHJcbiAgfVxyXG5cclxuICBpZiAob3B0cy5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIpIHtcclxuICAgIHJvdXRlci5tYWxmb3JtZWRVcmlFcnJvckhhbmRsZXIgPSBvcHRzLm1hbGZvcm1lZFVyaUVycm9ySGFuZGxlcjtcclxuICB9XHJcblxyXG4gIGlmIChvcHRzLmVuYWJsZVRyYWNpbmcpIHtcclxuICAgIHJvdXRlci5ldmVudHMuc3Vic2NyaWJlKChlOiBSb3V0ZXJFdmVudCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmdyb3VwKGBSb3V0ZXIgRXZlbnQ6ICR7KDxhbnk+ZS5jb25zdHJ1Y3RvcikubmFtZX1gKTtcclxuICAgICAgY29uc29sZS5sb2coZS50b1N0cmluZygpKTtcclxuICAgICAgY29uc29sZS5sb2coZSk7XHJcbiAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKG9wdHMub25TYW1lVXJsTmF2aWdhdGlvbikge1xyXG4gICAgcm91dGVyLm9uU2FtZVVybE5hdmlnYXRpb24gPSBvcHRzLm9uU2FtZVVybE5hdmlnYXRpb247XHJcbiAgfVxyXG5cclxuICBpZiAob3B0cy5wYXJhbXNJbmhlcml0YW5jZVN0cmF0ZWd5KSB7XHJcbiAgICByb3V0ZXIucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneSA9IG9wdHMucGFyYW1zSW5oZXJpdGFuY2VTdHJhdGVneTtcclxuICB9XHJcblxyXG4gIGlmIChvcHRzLnVybFVwZGF0ZVN0cmF0ZWd5KSB7XHJcbiAgICByb3V0ZXIudXJsVXBkYXRlU3RyYXRlZ3kgPSBvcHRzLnVybFVwZGF0ZVN0cmF0ZWd5O1xyXG4gIH1cclxuXHJcbiAgaWYgKG9wdHMucmVsYXRpdmVMaW5rUmVzb2x1dGlvbikge1xyXG4gICAgcm91dGVyLnJlbGF0aXZlTGlua1Jlc29sdXRpb24gPSBvcHRzLnJlbGF0aXZlTGlua1Jlc29sdXRpb247XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcm91dGVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JhcEludG9PYnNlcnZhYmxlPFQ+KHZhbHVlOiBUIHwgTmdNb2R1bGVGYWN0b3J5PFQ+IHwgUHJvbWlzZTxUPiB8IE9ic2VydmFibGU8VD4pIHtcclxuICBpZiAoaXNPYnNlcnZhYmxlKHZhbHVlKSkge1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlzUHJvbWlzZSh2YWx1ZSkpIHtcclxuICAgIC8vIFVzZSBgUHJvbWlzZS5yZXNvbHZlKClgIHRvIHdyYXAgcHJvbWlzZS1saWtlIGluc3RhbmNlcy5cclxuICAgIC8vIFJlcXVpcmVkIGllIHdoZW4gYSBSZXNvbHZlciByZXR1cm5zIGEgQW5ndWxhckpTIGAkcWAgcHJvbWlzZSB0byBjb3JyZWN0bHkgdHJpZ2dlciB0aGVcclxuICAgIC8vIGNoYW5nZSBkZXRlY3Rpb24uXHJcbiAgICByZXR1cm4gZnJvbShQcm9taXNlLnJlc29sdmUodmFsdWUpKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBvZih2YWx1ZSk7XHJcbn1cclxuIl19
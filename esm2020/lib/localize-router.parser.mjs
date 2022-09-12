import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Observable } from 'rxjs';
import { Location } from '@angular/common';
import { CacheMechanism, LocalizeRouterSettings } from './localize-router.config';
import { Inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import * as i0 from "@angular/core";
import * as i1 from "@ngx-translate/core";
import * as i2 from "@angular/common";
import * as i3 from "./localize-router.config";
const COOKIE_EXPIRY = 30; // 1 month
/**
 * Abstract class for parsing localization
 */
export class LocalizeParser {
    /**
     * Loader constructor
     */
    constructor(translate, location, settings) {
        this.translate = translate;
        this.location = location;
        this.settings = settings;
    }
    /**
   * Prepare routes to be fully usable by ngx-translate-router
   * @param routes
   */
    /* private initRoutes(routes: Routes, prefix = '') {
      routes.forEach(route => {
        if (route.path !== '**') {
          const routeData: any = route.data = route.data || {};
          routeData.localizeRouter = {};
          routeData.localizeRouter.fullPath = `${prefix}/${route.path}`;
          if (route.children && route.children.length > 0) {
            this.initRoutes(route.children, routeData.localizeRouter.fullPath);
          }
        }
      });
    } */
    /**
     * Initialize language and routes
     */
    init(routes) {
        let selectedLanguage;
        // this.initRoutes(routes);
        this.routes = routes;
        if (!this.locales || !this.locales.length) {
            return Promise.resolve();
        }
        /** detect current language */
        const locationLang = this.getLocationLang();
        const browserLang = this._getBrowserLang();
        if (this.settings.defaultLangFunction) {
            this.defaultLang = this.settings.defaultLangFunction(this.locales, this._cachedLang, browserLang);
        }
        else {
            this.defaultLang = this._cachedLang || browserLang || this.locales[0];
        }
        selectedLanguage = locationLang || this.defaultLang;
        this.translate.setDefaultLang(this.defaultLang);
        let children = [];
        /** if set prefix is enforced */
        if (this.settings.alwaysSetPrefix) {
            const baseRoute = { path: '', redirectTo: this.defaultLang, pathMatch: 'full' };
            /** extract potential wildcard route */
            const wildcardIndex = routes.findIndex((route) => route.path === '**');
            if (wildcardIndex !== -1) {
                this._wildcardRoute = routes.splice(wildcardIndex, 1)[0];
            }
            children = this.routes.splice(0, this.routes.length, baseRoute);
        }
        else {
            children = [...this.routes]; // shallow copy of routes
        }
        /** exclude certain routes */
        for (let i = children.length - 1; i >= 0; i--) {
            if (children[i].data && children[i].data['skipRouteLocalization']) {
                if (this.settings.alwaysSetPrefix) {
                    // add directly to routes
                    this.routes.push(children[i]);
                }
                // remove from routes to translate only if doesn't have to translate `redirectTo` property
                if (children[i].redirectTo === undefined || !(children[i].data['skipRouteLocalization']['localizeRedirectTo'])) {
                    children.splice(i, 1);
                }
            }
        }
        /** append children routes */
        if (children && children.length) {
            if (this.locales.length > 1 || this.settings.alwaysSetPrefix) {
                this._languageRoute = { children: children };
                this.routes.unshift(this._languageRoute);
            }
        }
        /** ...and potential wildcard route */
        if (this._wildcardRoute && this.settings.alwaysSetPrefix) {
            this.routes.push(this._wildcardRoute);
        }
        /** translate routes */
        return firstValueFrom(this.translateRoutes(selectedLanguage));
    }
    initChildRoutes(routes) {
        this._translateRouteTree(routes);
        return routes;
    }
    /**
     * Translate routes to selected language
     */
    translateRoutes(language) {
        return new Observable((observer) => {
            this._cachedLang = language;
            if (this._languageRoute) {
                this._languageRoute.path = language;
            }
            this.translate.use(language).subscribe((translations) => {
                this._translationObject = translations;
                this.currentLang = language;
                if (this._languageRoute) {
                    this._translateRouteTree(this._languageRoute.children, true);
                    // if there is wildcard route
                    if (this._wildcardRoute && this._wildcardRoute.redirectTo) {
                        this._translateProperty(this._wildcardRoute, 'redirectTo', true);
                    }
                }
                else {
                    this._translateRouteTree(this.routes, true);
                }
                observer.next(void 0);
                observer.complete();
            });
        });
    }
    /**
     * Translate the route node and recursively call for all it's children
     */
    _translateRouteTree(routes, isRootTree) {
        routes.forEach((route) => {
            const skipRouteLocalization = (route.data && route.data['skipRouteLocalization']);
            const localizeRedirection = !skipRouteLocalization || skipRouteLocalization['localizeRedirectTo'];
            if (route.redirectTo && localizeRedirection) {
                const prefixLang = route.redirectTo.indexOf('/') === 0 || isRootTree;
                this._translateProperty(route, 'redirectTo', prefixLang);
            }
            if (skipRouteLocalization) {
                return;
            }
            if (route.path !== null && route.path !== undefined /* && route.path !== '**'*/) {
                this._translateProperty(route, 'path');
            }
            if (route.children) {
                this._translateRouteTree(route.children);
            }
            if (route.loadChildren && route._loadedRoutes?.length) {
                this._translateRouteTree(route._loadedRoutes);
            }
        });
    }
    /**
     * Translate property
     * If first time translation then add original to route data object
     */
    _translateProperty(route, property, prefixLang) {
        // set property to data if not there yet
        const routeData = route.data = route.data || {};
        if (!routeData.localizeRouter) {
            routeData.localizeRouter = {};
        }
        if (!routeData.localizeRouter[property]) {
            routeData.localizeRouter = { ...routeData.localizeRouter, [property]: route[property] };
        }
        const result = this.translateRoute(routeData.localizeRouter[property]);
        route[property] = prefixLang ? this.addPrefixToUrl(result) : result;
    }
    get urlPrefix() {
        if (this.settings.alwaysSetPrefix || this.currentLang !== this.defaultLang) {
            return this.currentLang ? this.currentLang : this.defaultLang;
        }
        else {
            return '';
        }
    }
    /**
     * Add current lang as prefix to given url.
     */
    addPrefixToUrl(url) {
        const splitUrl = url.split('?');
        splitUrl[0] = splitUrl[0].replace(/\/$/, '');
        const joinedUrl = splitUrl.join('?');
        if (this.urlPrefix === '') {
            return joinedUrl;
        }
        if (!joinedUrl.startsWith('/')) {
            return `${this.urlPrefix}/${joinedUrl}`;
        }
        return `/${this.urlPrefix}${joinedUrl}`;
    }
    /**
     * Translate route and return observable
     */
    translateRoute(path) {
        const queryParts = path.split('?');
        if (queryParts.length > 2) {
            throw Error('There should be only one query parameter block in the URL');
        }
        const pathSegments = queryParts[0].split('/');
        /** collect observables  */
        return pathSegments
            .map((part) => part.length ? this.translateText(part) : part)
            .join('/') +
            (queryParts.length > 1 ? `?${queryParts[1]}` : '');
    }
    /**
     * Get language from url
     */
    getLocationLang(url) {
        const queryParamSplit = (url || this.location.path()).split(/[\?;]/);
        let pathSlices = [];
        if (queryParamSplit.length > 0) {
            pathSlices = queryParamSplit[0].split('/');
        }
        if (pathSlices.length > 1 && this.locales.indexOf(pathSlices[1]) !== -1) {
            return pathSlices[1];
        }
        if (pathSlices.length && this.locales.indexOf(pathSlices[0]) !== -1) {
            return pathSlices[0];
        }
        return null;
    }
    /**
     * Get user's language set in the browser
     */
    _getBrowserLang() {
        return this._returnIfInLocales(this.translate.getBrowserLang());
    }
    /**
     * Get language from local storage or cookie
     */
    get _cachedLang() {
        if (!this.settings.useCachedLang) {
            return;
        }
        if (this.settings.cacheMechanism === CacheMechanism.LocalStorage) {
            return this._cacheWithLocalStorage();
        }
        if (this.settings.cacheMechanism === CacheMechanism.SessionStorage) {
            return this._cacheWithSessionStorage();
        }
        if (this.settings.cacheMechanism === CacheMechanism.Cookie) {
            return this._cacheWithCookies();
        }
    }
    /**
     * Save language to local storage or cookie
     */
    set _cachedLang(value) {
        if (!this.settings.useCachedLang) {
            return;
        }
        if (this.settings.cacheMechanism === CacheMechanism.LocalStorage) {
            this._cacheWithLocalStorage(value);
        }
        if (this.settings.cacheMechanism === CacheMechanism.SessionStorage) {
            this._cacheWithSessionStorage(value);
        }
        if (this.settings.cacheMechanism === CacheMechanism.Cookie) {
            this._cacheWithCookies(value);
        }
    }
    /**
     * Cache value to local storage
     */
    _cacheWithLocalStorage(value) {
        try {
            if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
                return;
            }
            if (value) {
                window.localStorage.setItem(this.settings.cacheName, value);
                return;
            }
            return this._returnIfInLocales(window.localStorage.getItem(this.settings.cacheName));
        }
        catch (e) {
            // weird Safari issue in private mode, where LocalStorage is defined but throws error on access
            return;
        }
    }
    /**
     * Cache value to session storage
     */
    _cacheWithSessionStorage(value) {
        try {
            if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
                return;
            }
            if (value) {
                window.sessionStorage.setItem(this.settings.cacheName, value);
                return;
            }
            return this._returnIfInLocales(window.sessionStorage.getItem(this.settings.cacheName));
        }
        catch (e) {
            return;
        }
    }
    /**
     * Cache value via cookies
     */
    _cacheWithCookies(value) {
        try {
            if (typeof document === 'undefined' || typeof document.cookie === 'undefined') {
                return;
            }
            const name = encodeURIComponent(this.settings.cacheName);
            if (value) {
                let cookieTemplate = `${this.settings.cookieFormat}`;
                cookieTemplate = cookieTemplate
                    .replace('{{value}}', `${name}=${encodeURIComponent(value)}`)
                    .replace(/{{expires:?(\d+)?}}/g, (fullMatch, groupMatch) => {
                    const days = groupMatch === undefined ? COOKIE_EXPIRY : parseInt(groupMatch, 10);
                    const date = new Date();
                    date.setTime(date.getTime() + days * 86400000);
                    return `expires=${date.toUTCString()}`;
                });
                document.cookie = cookieTemplate;
                return;
            }
            const regexp = new RegExp('(?:^' + name + '|;\\s*' + name + ')=(.*?)(?:;|$)', 'g');
            const result = regexp.exec(document.cookie);
            return decodeURIComponent(result[1]);
        }
        catch (e) {
            return; // should not happen but better safe than sorry (can happen by using domino)
        }
    }
    /**
     * Check if value exists in locales list
     */
    _returnIfInLocales(value) {
        if (value && this.locales.indexOf(value) !== -1) {
            return value;
        }
        return null;
    }
    /**
     * Get translated value
     */
    translateText(key) {
        if (this.escapePrefix && key.startsWith(this.escapePrefix)) {
            return key.replace(this.escapePrefix, '');
        }
        else {
            if (!this._translationObject) {
                return key;
            }
            const fullKey = this.prefix + key;
            const res = this.translate.getParsedResult(this._translationObject, fullKey);
            return res !== fullKey ? res : key;
        }
    }
    /**
     * Strategy to choose between new or old queryParams
     * @param newExtras extras that containes new QueryParams
     * @param currentQueryParams current query params
     */
    chooseQueryParams(newExtras, currentQueryParams) {
        let queryParamsObj;
        if (newExtras && newExtras.queryParams) {
            queryParamsObj = newExtras.queryParams;
        }
        else if (currentQueryParams) {
            queryParamsObj = currentQueryParams;
        }
        return queryParamsObj;
    }
    /**
     * Format query params from object to string.
     * Exemple of result: `param=value&param2=value2`
     * @param params query params object
     */
    formatQueryParams(params) {
        return new HttpParams({ fromObject: params }).toString();
    }
    /**
     * Get translation key prefix from config
     */
    getPrefix() {
        return this.prefix;
    }
    /**
     * Get escape translation prefix from config
     */
    getEscapePrefix() {
        return this.escapePrefix;
    }
}
LocalizeParser.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeParser, deps: [{ token: TranslateService }, { token: Location }, { token: LocalizeRouterSettings }], target: i0.ɵɵFactoryTarget.Injectable });
LocalizeParser.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeParser });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeParser, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.TranslateService, decorators: [{
                    type: Inject,
                    args: [TranslateService]
                }] }, { type: i2.Location, decorators: [{
                    type: Inject,
                    args: [Location]
                }] }, { type: i3.LocalizeRouterSettings, decorators: [{
                    type: Inject,
                    args: [LocalizeRouterSettings]
                }] }]; } });
/**
 * Manually set configuration
 */
export class ManualParserLoader extends LocalizeParser {
    /**
     * CTOR
     */
    constructor(translate, location, settings, locales = ['en'], prefix = 'ROUTES.', escapePrefix = '') {
        super(translate, location, settings);
        this.locales = locales;
        this.prefix = prefix || '';
        this.escapePrefix = escapePrefix || '';
    }
    /**
     * Initialize or append routes
     */
    load(routes) {
        return new Promise((resolve) => {
            this.init(routes).then(resolve);
        });
    }
}
export class DummyLocalizeParser extends LocalizeParser {
    load(routes) {
        return new Promise((resolve) => {
            this.init(routes).then(resolve);
        });
    }
}
DummyLocalizeParser.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: DummyLocalizeParser, deps: null, target: i0.ɵɵFactoryTarget.Injectable });
DummyLocalizeParser.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: DummyLocalizeParser });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: DummyLocalizeParser, decorators: [{
            type: Injectable
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemUtcm91dGVyLnBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL25neC10cmFuc2xhdGUtcm91dGVyL3NyYy9saWIvbG9jYWxpemUtcm91dGVyLnBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBWSxNQUFNLE1BQU0sQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2xGLE9BQU8sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQzs7Ozs7QUFFbEQsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLENBQUMsVUFBVTtBQUVwQzs7R0FFRztBQUVILE1BQU0sT0FBZ0IsY0FBYztJQWFsQzs7T0FFRztJQUNILFlBQThDLFNBQTJCLEVBQzdDLFFBQWtCLEVBQ0osUUFBZ0M7UUFGNUIsY0FBUyxHQUFULFNBQVMsQ0FBa0I7UUFDN0MsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNKLGFBQVEsR0FBUixRQUFRLENBQXdCO0lBQzFFLENBQUM7SUFPRDs7O0tBR0M7SUFDRDs7Ozs7Ozs7Ozs7UUFXSTtJQUdKOztPQUVHO0lBQ08sSUFBSSxDQUFDLE1BQWM7UUFDM0IsSUFBSSxnQkFBd0IsQ0FBQztRQUU3QiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUN6QyxPQUFP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QztRQUMzQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksSUFBSSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxDQUFDLE1BQWM7UUFDakIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQVksRUFBRSxFQUFFO1lBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBR0QsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGNBQWM7SUFDckQsSUFBSSxDQUFDLE1BQWM7UUFDakIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQVksRUFBRSxFQUFFO1lBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7Z0hBTFUsbUJBQW1CO29IQUFuQixtQkFBbUI7MkZBQW5CLG1CQUFtQjtrQkFEL0IsVUFBVSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJvdXRlcywgUm91dGUsIE5hdmlnYXRpb25FeHRyYXMsIFBhcmFtcyB9IGZyb20gJ0Bhbmd1bGFyL3JvdXRlcic7XHJcbmltcG9ydCB7IFRyYW5zbGF0ZVNlcnZpY2UgfSBmcm9tICdAbmd4LXRyYW5zbGF0ZS9jb3JlJztcclxuaW1wb3J0IHsgZmlyc3RWYWx1ZUZyb20sIE9ic2VydmFibGUsIE9ic2VydmVyIH0gZnJvbSAncnhqcyc7XHJcbmltcG9ydCB7IExvY2F0aW9uIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcclxuaW1wb3J0IHsgQ2FjaGVNZWNoYW5pc20sIExvY2FsaXplUm91dGVyU2V0dGluZ3MgfSBmcm9tICcuL2xvY2FsaXplLXJvdXRlci5jb25maWcnO1xyXG5pbXBvcnQgeyBJbmplY3QsIEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgSHR0cFBhcmFtcyB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9odHRwJztcclxuXHJcbmNvbnN0IENPT0tJRV9FWFBJUlkgPSAzMDsgLy8gMSBtb250aFxyXG5cclxuLyoqXHJcbiAqIEFic3RyYWN0IGNsYXNzIGZvciBwYXJzaW5nIGxvY2FsaXphdGlvblxyXG4gKi9cclxuQEluamVjdGFibGUoKVxyXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTG9jYWxpemVQYXJzZXIge1xyXG4gIGxvY2FsZXM6IEFycmF5PHN0cmluZz47XHJcbiAgY3VycmVudExhbmc6IHN0cmluZztcclxuICByb3V0ZXM6IFJvdXRlcztcclxuICBkZWZhdWx0TGFuZzogc3RyaW5nO1xyXG5cclxuICBwcm90ZWN0ZWQgcHJlZml4OiBzdHJpbmc7XHJcbiAgcHJvdGVjdGVkIGVzY2FwZVByZWZpeDogc3RyaW5nO1xyXG5cclxuICBwcml2YXRlIF90cmFuc2xhdGlvbk9iamVjdDogYW55O1xyXG4gIHByaXZhdGUgX3dpbGRjYXJkUm91dGU6IFJvdXRlO1xyXG4gIHByaXZhdGUgX2xhbmd1YWdlUm91dGU6IFJvdXRlO1xyXG5cclxuICAvKipcclxuICAgKiBMb2FkZXIgY29uc3RydWN0b3JcclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihASW5qZWN0KFRyYW5zbGF0ZVNlcnZpY2UpIHByaXZhdGUgdHJhbnNsYXRlOiBUcmFuc2xhdGVTZXJ2aWNlLFxyXG4gICAgQEluamVjdChMb2NhdGlvbikgcHJpdmF0ZSBsb2NhdGlvbjogTG9jYXRpb24sXHJcbiAgICBASW5qZWN0KExvY2FsaXplUm91dGVyU2V0dGluZ3MpIHByaXZhdGUgc2V0dGluZ3M6IExvY2FsaXplUm91dGVyU2V0dGluZ3MpIHtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvYWQgcm91dGVzIGFuZCBmZXRjaCBuZWNlc3NhcnkgZGF0YVxyXG4gICAqL1xyXG4gIGFic3RyYWN0IGxvYWQocm91dGVzOiBSb3V0ZXMpOiBQcm9taXNlPGFueT47XHJcblxyXG4gIC8qKlxyXG4gKiBQcmVwYXJlIHJvdXRlcyB0byBiZSBmdWxseSB1c2FibGUgYnkgbmd4LXRyYW5zbGF0ZS1yb3V0ZXJcclxuICogQHBhcmFtIHJvdXRlc1xyXG4gKi9cclxuICAvKiBwcml2YXRlIGluaXRSb3V0ZXMocm91dGVzOiBSb3V0ZXMsIHByZWZpeCA9ICcnKSB7XHJcbiAgICByb3V0ZXMuZm9yRWFjaChyb3V0ZSA9PiB7XHJcbiAgICAgIGlmIChyb3V0ZS5wYXRoICE9PSAnKionKSB7XHJcbiAgICAgICAgY29uc3Qgcm91dGVEYXRhOiBhbnkgPSByb3V0ZS5kYXRhID0gcm91dGUuZGF0YSB8fCB7fTtcclxuICAgICAgICByb3V0ZURhdGEubG9jYWxpemVSb3V0ZXIgPSB7fTtcclxuICAgICAgICByb3V0ZURhdGEubG9jYWxpemVSb3V0ZXIuZnVsbFBhdGggPSBgJHtwcmVmaXh9LyR7cm91dGUucGF0aH1gO1xyXG4gICAgICAgIGlmIChyb3V0ZS5jaGlsZHJlbiAmJiByb3V0ZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICB0aGlzLmluaXRSb3V0ZXMocm91dGUuY2hpbGRyZW4sIHJvdXRlRGF0YS5sb2NhbGl6ZVJvdXRlci5mdWxsUGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9ICovXHJcblxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplIGxhbmd1YWdlIGFuZCByb3V0ZXNcclxuICAgKi9cclxuICBwcm90ZWN0ZWQgaW5pdChyb3V0ZXM6IFJvdXRlcyk6IFByb21pc2U8YW55PiB7XHJcbiAgICBsZXQgc2VsZWN0ZWRMYW5ndWFnZTogc3RyaW5nO1xyXG5cclxuICAgIC8vIHRoaXMuaW5pdFJvdXRlcyhyb3V0ZXMpO1xyXG4gICAgdGhpcy5yb3V0ZXMgPSByb3V0ZXM7XHJcblxyXG4gICAgaWYgKCF0aGlzLmxvY2FsZXMgfHwgIXRoaXMubG9jYWxlcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgfVxyXG4gICAgLyoqIGRldGVjdCBjdXJyZW50IGxhbmd1YWdlICovXHJcbiAgICBjb25zdCBsb2NhdGlvbkxhbmcgPSB0aGlzLmdldExvY2F0aW9uTGFuZygpO1xyXG4gICAgY29uc3QgYnJvd3NlckxhbmcgPSB0aGlzLl9nZXRCcm93c2VyTGFuZygpO1xyXG5cclxuICAgIGlmICh0aGlzLnNldHRpbmdzLmRlZmF1bHRMYW5nRnVuY3Rpb24pIHtcclxuICAgICAgdGhpcy5kZWZhdWx0TGFuZyA9IHRoaXMuc2V0dGluZ3MuZGVmYXVsdExhbmdGdW5jdGlvbih0aGlzLmxvY2FsZXMsIHRoaXMuX2NhY2hlZExhbmcsIGJyb3dzZXJMYW5nKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuZGVmYXVsdExhbmcgPSB0aGlzLl9jYWNoZWRMYW5nIHx8IGJyb3dzZXJMYW5nIHx8IHRoaXMubG9jYWxlc1swXTtcclxuICAgIH1cclxuICAgIHNlbGVjdGVkTGFuZ3VhZ2UgPSBsb2NhdGlvbkxhbmcgfHwgdGhpcy5kZWZhdWx0TGFuZztcclxuICAgIHRoaXMudHJhbnNsYXRlLnNldERlZmF1bHRMYW5nKHRoaXMuZGVmYXVsdExhbmcpO1xyXG5cclxuICAgIGxldCBjaGlsZHJlbjogUm91dGVzID0gW107XHJcbiAgICAvKiogaWYgc2V0IHByZWZpeCBpcyBlbmZvcmNlZCAqL1xyXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuYWx3YXlzU2V0UHJlZml4KSB7XHJcbiAgICAgIGNvbnN0IGJhc2VSb3V0ZTogUm91dGUgPSB7IHBhdGg6ICcnLCByZWRpcmVjdFRvOiB0aGlzLmRlZmF1bHRMYW5nLCBwYXRoTWF0Y2g6ICdmdWxsJyB9O1xyXG5cclxuICAgICAgLyoqIGV4dHJhY3QgcG90ZW50aWFsIHdpbGRjYXJkIHJvdXRlICovXHJcbiAgICAgIGNvbnN0IHdpbGRjYXJkSW5kZXggPSByb3V0ZXMuZmluZEluZGV4KChyb3V0ZTogUm91dGUpID0+IHJvdXRlLnBhdGggPT09ICcqKicpO1xyXG4gICAgICBpZiAod2lsZGNhcmRJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICB0aGlzLl93aWxkY2FyZFJvdXRlID0gcm91dGVzLnNwbGljZSh3aWxkY2FyZEluZGV4LCAxKVswXTtcclxuICAgICAgfVxyXG4gICAgICBjaGlsZHJlbiA9IHRoaXMucm91dGVzLnNwbGljZSgwLCB0aGlzLnJvdXRlcy5sZW5ndGgsIGJhc2VSb3V0ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjaGlsZHJlbiA9IFsuLi50aGlzLnJvdXRlc107IC8vIHNoYWxsb3cgY29weSBvZiByb3V0ZXNcclxuICAgIH1cclxuXHJcbiAgICAvKiogZXhjbHVkZSBjZXJ0YWluIHJvdXRlcyAqL1xyXG4gICAgZm9yIChsZXQgaSA9IGNoaWxkcmVuLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICAgIGlmIChjaGlsZHJlbltpXS5kYXRhICYmIGNoaWxkcmVuW2ldLmRhdGFbJ3NraXBSb3V0ZUxvY2FsaXphdGlvbiddKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYWx3YXlzU2V0UHJlZml4KSB7XHJcbiAgICAgICAgICAvLyBhZGQgZGlyZWN0bHkgdG8gcm91dGVzXHJcbiAgICAgICAgICB0aGlzLnJvdXRlcy5wdXNoKGNoaWxkcmVuW2ldKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gcmVtb3ZlIGZyb20gcm91dGVzIHRvIHRyYW5zbGF0ZSBvbmx5IGlmIGRvZXNuJ3QgaGF2ZSB0byB0cmFuc2xhdGUgYHJlZGlyZWN0VG9gIHByb3BlcnR5XHJcbiAgICAgICAgaWYgKGNoaWxkcmVuW2ldLnJlZGlyZWN0VG8gPT09IHVuZGVmaW5lZCB8fCAhKGNoaWxkcmVuW2ldLmRhdGFbJ3NraXBSb3V0ZUxvY2FsaXphdGlvbiddWydsb2NhbGl6ZVJlZGlyZWN0VG8nXSkpIHtcclxuICAgICAgICAgIGNoaWxkcmVuLnNwbGljZShpLCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogYXBwZW5kIGNoaWxkcmVuIHJvdXRlcyAqL1xyXG4gICAgaWYgKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkge1xyXG4gICAgICBpZiAodGhpcy5sb2NhbGVzLmxlbmd0aCA+IDEgfHwgdGhpcy5zZXR0aW5ncy5hbHdheXNTZXRQcmVmaXgpIHtcclxuICAgICAgICB0aGlzLl9sYW5ndWFnZVJvdXRlID0geyBjaGlsZHJlbjogY2hpbGRyZW4gfTtcclxuICAgICAgICB0aGlzLnJvdXRlcy51bnNoaWZ0KHRoaXMuX2xhbmd1YWdlUm91dGUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIC4uLmFuZCBwb3RlbnRpYWwgd2lsZGNhcmQgcm91dGUgKi9cclxuICAgIGlmICh0aGlzLl93aWxkY2FyZFJvdXRlICYmIHRoaXMuc2V0dGluZ3MuYWx3YXlzU2V0UHJlZml4KSB7XHJcbiAgICAgIHRoaXMucm91dGVzLnB1c2godGhpcy5fd2lsZGNhcmRSb3V0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIHRyYW5zbGF0ZSByb3V0ZXMgKi9cclxuICAgIHJldHVybiBmaXJzdFZhbHVlRnJvbShcclxuICAgICAgdGhpcy50cmFuc2xhdGVSb3V0ZXMoc2VsZWN0ZWRMYW5ndWFnZSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBpbml0Q2hpbGRSb3V0ZXMocm91dGVzOiBSb3V0ZXMpIHtcclxuICAgIHRoaXMuX3RyYW5zbGF0ZVJvdXRlVHJlZShyb3V0ZXMpO1xyXG4gICAgcmV0dXJuIHJvdXRlcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRyYW5zbGF0ZSByb3V0ZXMgdG8gc2VsZWN0ZWQgbGFuZ3VhZ2VcclxuICAgKi9cclxuICB0cmFuc2xhdGVSb3V0ZXMobGFuZ3VhZ2U6IHN0cmluZyk6IE9ic2VydmFibGU8YW55PiB7XHJcbiAgICByZXR1cm4gbmV3IE9ic2VydmFibGU8YW55Pigob2JzZXJ2ZXI6IE9ic2VydmVyPGFueT4pID0+IHtcclxuICAgICAgdGhpcy5fY2FjaGVkTGFuZyA9IGxhbmd1YWdlO1xyXG4gICAgICBpZiAodGhpcy5fbGFuZ3VhZ2VSb3V0ZSkge1xyXG4gICAgICAgIHRoaXMuX2xhbmd1YWdlUm91dGUucGF0aCA9IGxhbmd1YWdlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnRyYW5zbGF0ZS51c2UobGFuZ3VhZ2UpLnN1YnNjcmliZSgodHJhbnNsYXRpb25zOiBhbnkpID0+IHtcclxuICAgICAgICB0aGlzLl90cmFuc2xhdGlvbk9iamVjdCA9IHRyYW5zbGF0aW9ucztcclxuICAgICAgICB0aGlzLmN1cnJlbnRMYW5nID0gbGFuZ3VhZ2U7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9sYW5ndWFnZVJvdXRlKSB7XHJcbiAgICAgICAgICB0aGlzLl90cmFuc2xhdGVSb3V0ZVRyZWUodGhpcy5fbGFuZ3VhZ2VSb3V0ZS5jaGlsZHJlbiwgdHJ1ZSk7XHJcbiAgICAgICAgICAvLyBpZiB0aGVyZSBpcyB3aWxkY2FyZCByb3V0ZVxyXG4gICAgICAgICAgaWYgKHRoaXMuX3dpbGRjYXJkUm91dGUgJiYgdGhpcy5fd2lsZGNhcmRSb3V0ZS5yZWRpcmVjdFRvKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3RyYW5zbGF0ZVByb3BlcnR5KHRoaXMuX3dpbGRjYXJkUm91dGUsICdyZWRpcmVjdFRvJywgdHJ1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuX3RyYW5zbGF0ZVJvdXRlVHJlZSh0aGlzLnJvdXRlcywgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvYnNlcnZlci5uZXh0KHZvaWQgMCk7XHJcbiAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRyYW5zbGF0ZSB0aGUgcm91dGUgbm9kZSBhbmQgcmVjdXJzaXZlbHkgY2FsbCBmb3IgYWxsIGl0J3MgY2hpbGRyZW5cclxuICAgKi9cclxuICBwcml2YXRlIF90cmFuc2xhdGVSb3V0ZVRyZWUocm91dGVzOiBSb3V0ZXMsIGlzUm9vdFRyZWU/OiBib29sZWFuKTogdm9pZCB7XHJcbiAgICByb3V0ZXMuZm9yRWFjaCgocm91dGU6IFJvdXRlKSA9PiB7XHJcbiAgICAgIGNvbnN0IHNraXBSb3V0ZUxvY2FsaXphdGlvbiA9IChyb3V0ZS5kYXRhICYmIHJvdXRlLmRhdGFbJ3NraXBSb3V0ZUxvY2FsaXphdGlvbiddKTtcclxuICAgICAgY29uc3QgbG9jYWxpemVSZWRpcmVjdGlvbiA9ICFza2lwUm91dGVMb2NhbGl6YXRpb24gfHwgc2tpcFJvdXRlTG9jYWxpemF0aW9uWydsb2NhbGl6ZVJlZGlyZWN0VG8nXTtcclxuXHJcbiAgICAgIGlmIChyb3V0ZS5yZWRpcmVjdFRvICYmIGxvY2FsaXplUmVkaXJlY3Rpb24pIHtcclxuICAgICAgICBjb25zdCBwcmVmaXhMYW5nID0gcm91dGUucmVkaXJlY3RUby5pbmRleE9mKCcvJykgPT09IDAgfHwgaXNSb290VHJlZTtcclxuICAgICAgICB0aGlzLl90cmFuc2xhdGVQcm9wZXJ0eShyb3V0ZSwgJ3JlZGlyZWN0VG8nLCBwcmVmaXhMYW5nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNraXBSb3V0ZUxvY2FsaXphdGlvbikge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHJvdXRlLnBhdGggIT09IG51bGwgJiYgcm91dGUucGF0aCAhPT0gdW5kZWZpbmVkLyogJiYgcm91dGUucGF0aCAhPT0gJyoqJyovKSB7XHJcbiAgICAgICAgdGhpcy5fdHJhbnNsYXRlUHJvcGVydHkocm91dGUsICdwYXRoJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgdGhpcy5fdHJhbnNsYXRlUm91dGVUcmVlKHJvdXRlLmNoaWxkcmVuKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAocm91dGUubG9hZENoaWxkcmVuICYmICg8YW55PnJvdXRlKS5fbG9hZGVkUm91dGVzPy5sZW5ndGgpIHtcclxuICAgICAgICB0aGlzLl90cmFuc2xhdGVSb3V0ZVRyZWUoKDxhbnk+cm91dGUpLl9sb2FkZWRSb3V0ZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRyYW5zbGF0ZSBwcm9wZXJ0eVxyXG4gICAqIElmIGZpcnN0IHRpbWUgdHJhbnNsYXRpb24gdGhlbiBhZGQgb3JpZ2luYWwgdG8gcm91dGUgZGF0YSBvYmplY3RcclxuICAgKi9cclxuICBwcml2YXRlIF90cmFuc2xhdGVQcm9wZXJ0eShyb3V0ZTogUm91dGUsIHByb3BlcnR5OiBzdHJpbmcsIHByZWZpeExhbmc/OiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAvLyBzZXQgcHJvcGVydHkgdG8gZGF0YSBpZiBub3QgdGhlcmUgeWV0XHJcbiAgICBjb25zdCByb3V0ZURhdGE6IGFueSA9IHJvdXRlLmRhdGEgPSByb3V0ZS5kYXRhIHx8IHt9O1xyXG4gICAgaWYgKCFyb3V0ZURhdGEubG9jYWxpemVSb3V0ZXIpIHtcclxuICAgICAgcm91dGVEYXRhLmxvY2FsaXplUm91dGVyID0ge307XHJcbiAgICB9XHJcbiAgICBpZiAoIXJvdXRlRGF0YS5sb2NhbGl6ZVJvdXRlcltwcm9wZXJ0eV0pIHtcclxuICAgICAgcm91dGVEYXRhLmxvY2FsaXplUm91dGVyID0geyAuLi5yb3V0ZURhdGEubG9jYWxpemVSb3V0ZXIsIFtwcm9wZXJ0eV06IHJvdXRlW3Byb3BlcnR5XSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMudHJhbnNsYXRlUm91dGUocm91dGVEYXRhLmxvY2FsaXplUm91dGVyW3Byb3BlcnR5XSk7XHJcbiAgICAoPGFueT5yb3V0ZSlbcHJvcGVydHldID0gcHJlZml4TGFuZyA/IHRoaXMuYWRkUHJlZml4VG9VcmwocmVzdWx0KSA6IHJlc3VsdDtcclxuICB9XHJcblxyXG4gIGdldCB1cmxQcmVmaXgoKSB7XHJcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5hbHdheXNTZXRQcmVmaXggfHwgdGhpcy5jdXJyZW50TGFuZyAhPT0gdGhpcy5kZWZhdWx0TGFuZykge1xyXG4gICAgICByZXR1cm4gdGhpcy5jdXJyZW50TGFuZyA/IHRoaXMuY3VycmVudExhbmcgOiB0aGlzLmRlZmF1bHRMYW5nO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkIGN1cnJlbnQgbGFuZyBhcyBwcmVmaXggdG8gZ2l2ZW4gdXJsLlxyXG4gICAqL1xyXG4gIGFkZFByZWZpeFRvVXJsKHVybDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHNwbGl0VXJsID0gdXJsLnNwbGl0KCc/Jyk7XHJcbiAgICBzcGxpdFVybFswXSA9IHNwbGl0VXJsWzBdLnJlcGxhY2UoL1xcLyQvLCAnJyk7XHJcblxyXG4gICAgY29uc3Qgam9pbmVkVXJsID0gc3BsaXRVcmwuam9pbignPycpO1xyXG4gICAgaWYgKHRoaXMudXJsUHJlZml4ID09PSAnJykge1xyXG4gICAgICByZXR1cm4gam9pbmVkVXJsO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICgham9pbmVkVXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xyXG4gICAgICByZXR1cm4gYCR7dGhpcy51cmxQcmVmaXh9LyR7am9pbmVkVXJsfWA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYC8ke3RoaXMudXJsUHJlZml4fSR7am9pbmVkVXJsfWA7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUcmFuc2xhdGUgcm91dGUgYW5kIHJldHVybiBvYnNlcnZhYmxlXHJcbiAgICovXHJcbiAgdHJhbnNsYXRlUm91dGUocGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHF1ZXJ5UGFydHMgPSBwYXRoLnNwbGl0KCc/Jyk7XHJcbiAgICBpZiAocXVlcnlQYXJ0cy5sZW5ndGggPiAyKSB7XHJcbiAgICAgIHRocm93IEVycm9yKCdUaGVyZSBzaG91bGQgYmUgb25seSBvbmUgcXVlcnkgcGFyYW1ldGVyIGJsb2NrIGluIHRoZSBVUkwnKTtcclxuICAgIH1cclxuICAgIGNvbnN0IHBhdGhTZWdtZW50cyA9IHF1ZXJ5UGFydHNbMF0uc3BsaXQoJy8nKTtcclxuXHJcbiAgICAvKiogY29sbGVjdCBvYnNlcnZhYmxlcyAgKi9cclxuICAgIHJldHVybiBwYXRoU2VnbWVudHNcclxuICAgICAgLm1hcCgocGFydDogc3RyaW5nKSA9PiBwYXJ0Lmxlbmd0aCA/IHRoaXMudHJhbnNsYXRlVGV4dChwYXJ0KSA6IHBhcnQpXHJcbiAgICAgIC5qb2luKCcvJykgK1xyXG4gICAgICAocXVlcnlQYXJ0cy5sZW5ndGggPiAxID8gYD8ke3F1ZXJ5UGFydHNbMV19YCA6ICcnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBsYW5ndWFnZSBmcm9tIHVybFxyXG4gICAqL1xyXG4gIGdldExvY2F0aW9uTGFuZyh1cmw/OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgcXVlcnlQYXJhbVNwbGl0ID0gKHVybCB8fCB0aGlzLmxvY2F0aW9uLnBhdGgoKSkuc3BsaXQoL1tcXD87XS8pO1xyXG4gICAgbGV0IHBhdGhTbGljZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBpZiAocXVlcnlQYXJhbVNwbGl0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgcGF0aFNsaWNlcyA9IHF1ZXJ5UGFyYW1TcGxpdFswXS5zcGxpdCgnLycpO1xyXG4gICAgfVxyXG4gICAgaWYgKHBhdGhTbGljZXMubGVuZ3RoID4gMSAmJiB0aGlzLmxvY2FsZXMuaW5kZXhPZihwYXRoU2xpY2VzWzFdKSAhPT0gLTEpIHtcclxuICAgICAgcmV0dXJuIHBhdGhTbGljZXNbMV07XHJcbiAgICB9XHJcbiAgICBpZiAocGF0aFNsaWNlcy5sZW5ndGggJiYgdGhpcy5sb2NhbGVzLmluZGV4T2YocGF0aFNsaWNlc1swXSkgIT09IC0xKSB7XHJcbiAgICAgIHJldHVybiBwYXRoU2xpY2VzWzBdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdXNlcidzIGxhbmd1YWdlIHNldCBpbiB0aGUgYnJvd3NlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgX2dldEJyb3dzZXJMYW5nKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5fcmV0dXJuSWZJbkxvY2FsZXModGhpcy50cmFuc2xhdGUuZ2V0QnJvd3NlckxhbmcoKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgbGFuZ3VhZ2UgZnJvbSBsb2NhbCBzdG9yYWdlIG9yIGNvb2tpZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2V0IF9jYWNoZWRMYW5nKCk6IHN0cmluZyB7XHJcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MudXNlQ2FjaGVkTGFuZykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5jYWNoZU1lY2hhbmlzbSA9PT0gQ2FjaGVNZWNoYW5pc20uTG9jYWxTdG9yYWdlKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLl9jYWNoZVdpdGhMb2NhbFN0b3JhZ2UoKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLnNldHRpbmdzLmNhY2hlTWVjaGFuaXNtID09PSBDYWNoZU1lY2hhbmlzbS5TZXNzaW9uU3RvcmFnZSkge1xyXG4gICAgICByZXR1cm4gdGhpcy5fY2FjaGVXaXRoU2Vzc2lvblN0b3JhZ2UoKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLnNldHRpbmdzLmNhY2hlTWVjaGFuaXNtID09PSBDYWNoZU1lY2hhbmlzbS5Db29raWUpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuX2NhY2hlV2l0aENvb2tpZXMoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNhdmUgbGFuZ3VhZ2UgdG8gbG9jYWwgc3RvcmFnZSBvciBjb29raWVcclxuICAgKi9cclxuICBwcml2YXRlIHNldCBfY2FjaGVkTGFuZyh2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MudXNlQ2FjaGVkTGFuZykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5jYWNoZU1lY2hhbmlzbSA9PT0gQ2FjaGVNZWNoYW5pc20uTG9jYWxTdG9yYWdlKSB7XHJcbiAgICAgIHRoaXMuX2NhY2hlV2l0aExvY2FsU3RvcmFnZSh2YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5jYWNoZU1lY2hhbmlzbSA9PT0gQ2FjaGVNZWNoYW5pc20uU2Vzc2lvblN0b3JhZ2UpIHtcclxuICAgICAgdGhpcy5fY2FjaGVXaXRoU2Vzc2lvblN0b3JhZ2UodmFsdWUpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MuY2FjaGVNZWNoYW5pc20gPT09IENhY2hlTWVjaGFuaXNtLkNvb2tpZSkge1xyXG4gICAgICB0aGlzLl9jYWNoZVdpdGhDb29raWVzKHZhbHVlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhY2hlIHZhbHVlIHRvIGxvY2FsIHN0b3JhZ2VcclxuICAgKi9cclxuICBwcml2YXRlIF9jYWNoZVdpdGhMb2NhbFN0b3JhZ2UodmFsdWU/OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiB3aW5kb3cubG9jYWxTdG9yYWdlID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBpZiAodmFsdWUpIHtcclxuICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5zZXR0aW5ncy5jYWNoZU5hbWUsIHZhbHVlKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXMuX3JldHVybklmSW5Mb2NhbGVzKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSh0aGlzLnNldHRpbmdzLmNhY2hlTmFtZSkpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAvLyB3ZWlyZCBTYWZhcmkgaXNzdWUgaW4gcHJpdmF0ZSBtb2RlLCB3aGVyZSBMb2NhbFN0b3JhZ2UgaXMgZGVmaW5lZCBidXQgdGhyb3dzIGVycm9yIG9uIGFjY2Vzc1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWNoZSB2YWx1ZSB0byBzZXNzaW9uIHN0b3JhZ2VcclxuICAgKi9cclxuICBwcml2YXRlIF9jYWNoZVdpdGhTZXNzaW9uU3RvcmFnZSh2YWx1ZT86IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIHdpbmRvdy5zZXNzaW9uU3RvcmFnZSA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgd2luZG93LnNlc3Npb25TdG9yYWdlLnNldEl0ZW0odGhpcy5zZXR0aW5ncy5jYWNoZU5hbWUsIHZhbHVlKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRoaXMuX3JldHVybklmSW5Mb2NhbGVzKHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5nZXRJdGVtKHRoaXMuc2V0dGluZ3MuY2FjaGVOYW1lKSk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhY2hlIHZhbHVlIHZpYSBjb29raWVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfY2FjaGVXaXRoQ29va2llcyh2YWx1ZT86IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgZG9jdW1lbnQuY29va2llID09PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBuYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuc2V0dGluZ3MuY2FjaGVOYW1lKTtcclxuICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgbGV0IGNvb2tpZVRlbXBsYXRlID0gYCR7dGhpcy5zZXR0aW5ncy5jb29raWVGb3JtYXR9YDtcclxuICAgICAgICBjb29raWVUZW1wbGF0ZSA9IGNvb2tpZVRlbXBsYXRlXHJcbiAgICAgICAgICAucmVwbGFjZSgne3t2YWx1ZX19JywgYCR7bmFtZX09JHtlbmNvZGVVUklDb21wb25lbnQodmFsdWUpfWApXHJcbiAgICAgICAgICAucmVwbGFjZSgve3tleHBpcmVzOj8oXFxkKyk/fX0vZywgKGZ1bGxNYXRjaCwgZ3JvdXBNYXRjaCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBkYXlzID0gZ3JvdXBNYXRjaCA9PT0gdW5kZWZpbmVkID8gQ09PS0lFX0VYUElSWSA6IHBhcnNlSW50KGdyb3VwTWF0Y2gsIDEwKTtcclxuICAgICAgICAgICAgY29uc3QgZGF0ZTogRGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgIGRhdGUuc2V0VGltZShkYXRlLmdldFRpbWUoKSArIGRheXMgKiA4NjQwMDAwMCk7XHJcbiAgICAgICAgICAgIHJldHVybiBgZXhwaXJlcz0ke2RhdGUudG9VVENTdHJpbmcoKX1gO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZVRlbXBsYXRlO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCByZWdleHAgPSBuZXcgUmVnRXhwKCcoPzpeJyArIG5hbWUgKyAnfDtcXFxccyonICsgbmFtZSArICcpPSguKj8pKD86O3wkKScsICdnJyk7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJlZ2V4cC5leGVjKGRvY3VtZW50LmNvb2tpZSk7XHJcbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0WzFdKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgcmV0dXJuOyAvLyBzaG91bGQgbm90IGhhcHBlbiBidXQgYmV0dGVyIHNhZmUgdGhhbiBzb3JyeSAoY2FuIGhhcHBlbiBieSB1c2luZyBkb21pbm8pXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB2YWx1ZSBleGlzdHMgaW4gbG9jYWxlcyBsaXN0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfcmV0dXJuSWZJbkxvY2FsZXModmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBpZiAodmFsdWUgJiYgdGhpcy5sb2NhbGVzLmluZGV4T2YodmFsdWUpICE9PSAtMSkge1xyXG4gICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0cmFuc2xhdGVkIHZhbHVlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSB0cmFuc2xhdGVUZXh0KGtleTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGlmICh0aGlzLmVzY2FwZVByZWZpeCAmJiBrZXkuc3RhcnRzV2l0aCh0aGlzLmVzY2FwZVByZWZpeCkpIHtcclxuICAgICAgcmV0dXJuIGtleS5yZXBsYWNlKHRoaXMuZXNjYXBlUHJlZml4LCAnJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoIXRoaXMuX3RyYW5zbGF0aW9uT2JqZWN0KSB7XHJcbiAgICAgICAgcmV0dXJuIGtleTtcclxuICAgICAgfVxyXG4gICAgICBjb25zdCBmdWxsS2V5ID0gdGhpcy5wcmVmaXggKyBrZXk7XHJcbiAgICAgIGNvbnN0IHJlcyA9IHRoaXMudHJhbnNsYXRlLmdldFBhcnNlZFJlc3VsdCh0aGlzLl90cmFuc2xhdGlvbk9iamVjdCwgZnVsbEtleSk7XHJcbiAgICAgIHJldHVybiByZXMgIT09IGZ1bGxLZXkgPyByZXMgOiBrZXk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdHJhdGVneSB0byBjaG9vc2UgYmV0d2VlbiBuZXcgb3Igb2xkIHF1ZXJ5UGFyYW1zXHJcbiAgICogQHBhcmFtIG5ld0V4dHJhcyBleHRyYXMgdGhhdCBjb250YWluZXMgbmV3IFF1ZXJ5UGFyYW1zXHJcbiAgICogQHBhcmFtIGN1cnJlbnRRdWVyeVBhcmFtcyBjdXJyZW50IHF1ZXJ5IHBhcmFtc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBjaG9vc2VRdWVyeVBhcmFtcyhuZXdFeHRyYXM6IE5hdmlnYXRpb25FeHRyYXMsIGN1cnJlbnRRdWVyeVBhcmFtczogUGFyYW1zKSB7XHJcbiAgICBsZXQgcXVlcnlQYXJhbXNPYmo6IFBhcmFtcztcclxuICAgIGlmIChuZXdFeHRyYXMgJiYgbmV3RXh0cmFzLnF1ZXJ5UGFyYW1zKSB7XHJcbiAgICAgIHF1ZXJ5UGFyYW1zT2JqID0gbmV3RXh0cmFzLnF1ZXJ5UGFyYW1zO1xyXG4gICAgfSBlbHNlIGlmIChjdXJyZW50UXVlcnlQYXJhbXMpIHtcclxuICAgICAgcXVlcnlQYXJhbXNPYmogPSBjdXJyZW50UXVlcnlQYXJhbXM7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcXVlcnlQYXJhbXNPYmo7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGb3JtYXQgcXVlcnkgcGFyYW1zIGZyb20gb2JqZWN0IHRvIHN0cmluZy5cclxuICAgKiBFeGVtcGxlIG9mIHJlc3VsdDogYHBhcmFtPXZhbHVlJnBhcmFtMj12YWx1ZTJgXHJcbiAgICogQHBhcmFtIHBhcmFtcyBxdWVyeSBwYXJhbXMgb2JqZWN0XHJcbiAgICovXHJcbiAgcHVibGljIGZvcm1hdFF1ZXJ5UGFyYW1zKHBhcmFtczogUGFyYW1zKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBuZXcgSHR0cFBhcmFtcyh7IGZyb21PYmplY3Q6IHBhcmFtcyB9KS50b1N0cmluZygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHRyYW5zbGF0aW9uIGtleSBwcmVmaXggZnJvbSBjb25maWdcclxuICAgKi9cclxuICBwdWJsaWMgZ2V0UHJlZml4KCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5wcmVmaXg7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZXNjYXBlIHRyYW5zbGF0aW9uIHByZWZpeCBmcm9tIGNvbmZpZ1xyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRFc2NhcGVQcmVmaXgoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLmVzY2FwZVByZWZpeDtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNYW51YWxseSBzZXQgY29uZmlndXJhdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1hbnVhbFBhcnNlckxvYWRlciBleHRlbmRzIExvY2FsaXplUGFyc2VyIHtcclxuXHJcbiAgLyoqXHJcbiAgICogQ1RPUlxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKHRyYW5zbGF0ZTogVHJhbnNsYXRlU2VydmljZSwgbG9jYXRpb246IExvY2F0aW9uLCBzZXR0aW5nczogTG9jYWxpemVSb3V0ZXJTZXR0aW5ncyxcclxuICAgIGxvY2FsZXM6IHN0cmluZ1tdID0gWydlbiddLCBwcmVmaXg6IHN0cmluZyA9ICdST1VURVMuJywgZXNjYXBlUHJlZml4OiBzdHJpbmcgPSAnJykge1xyXG4gICAgc3VwZXIodHJhbnNsYXRlLCBsb2NhdGlvbiwgc2V0dGluZ3MpO1xyXG4gICAgdGhpcy5sb2NhbGVzID0gbG9jYWxlcztcclxuICAgIHRoaXMucHJlZml4ID0gcHJlZml4IHx8ICcnO1xyXG4gICAgdGhpcy5lc2NhcGVQcmVmaXggPSBlc2NhcGVQcmVmaXggfHwgJyc7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplIG9yIGFwcGVuZCByb3V0ZXNcclxuICAgKi9cclxuICBsb2FkKHJvdXRlczogUm91dGVzKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZTogYW55KSA9PiB7XHJcbiAgICAgIHRoaXMuaW5pdChyb3V0ZXMpLnRoZW4ocmVzb2x2ZSk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbkBJbmplY3RhYmxlKClcclxuZXhwb3J0IGNsYXNzIER1bW15TG9jYWxpemVQYXJzZXIgZXh0ZW5kcyBMb2NhbGl6ZVBhcnNlciB7XHJcbiAgbG9hZChyb3V0ZXM6IFJvdXRlcyk6IFByb21pc2U8YW55PiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmU6IGFueSkgPT4ge1xyXG4gICAgICB0aGlzLmluaXQocm91dGVzKS50aGVuKHJlc29sdmUpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==
import * as i0 from '@angular/core';
import { InjectionToken, Injectable, Inject, Pipe, PLATFORM_ID, NgModuleFactory, ApplicationRef, Injector, Compiler, Optional, SkipSelf, APP_INITIALIZER, NgModule } from '@angular/core';
import * as i3 from '@angular/router';
import { NavigationStart, NavigationCancel, Router, ActivatedRoute, ROUTES, UrlSerializer, ChildrenOutletContexts, ROUTER_CONFIGURATION, DefaultTitleStrategy, TitleStrategy, UrlHandlingStrategy, RouteReuseStrategy, RouterModule } from '@angular/router';
import { firstValueFrom, Observable, Subject, ReplaySubject, of, from, isObservable } from 'rxjs';
import { filter, pairwise, mergeMap, map } from 'rxjs/operators';
import * as i1 from '@ngx-translate/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import * as i2 from '@angular/common';
import { Location, isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';

/**
 * Guard to make sure we have single initialization of forRoot
 */
const LOCALIZE_ROUTER_FORROOT_GUARD = new InjectionToken('LOCALIZE_ROUTER_FORROOT_GUARD');
/**
 * Static provider for keeping track of routes
 */
const RAW_ROUTES = new InjectionToken('RAW_ROUTES');
/**
 * Type for Caching of default language
 */
// export type CacheMechanism = 'LocalStorage' | 'Cookie';
/**
 * Namespace for fail proof access of CacheMechanism
 */
var CacheMechanism;
(function (CacheMechanism) {
    CacheMechanism["LocalStorage"] = "LocalStorage";
    CacheMechanism["SessionStorage"] = "SessionStorage";
    CacheMechanism["Cookie"] = "Cookie";
})(CacheMechanism || (CacheMechanism = {}));
/**
 * Boolean to indicate whether to use cached language value
 */
const USE_CACHED_LANG = new InjectionToken('USE_CACHED_LANG');
/**
 * Cache mechanism type
 */
const CACHE_MECHANISM = new InjectionToken('CACHE_MECHANISM');
/**
 * Cache name
 */
const CACHE_NAME = new InjectionToken('CACHE_NAME');
/**
 * Cookie cache format
 */
const COOKIE_FORMAT = new InjectionToken('COOKIE_FORMAT');
/**
 * Cookie cache format
 */
const INITIAL_NAVIGATION = new InjectionToken('INITIAL_NAVIGATION');
/**
 * Function for calculating default language
 */
const DEFAULT_LANG_FUNCTION = new InjectionToken('DEFAULT_LANG_FUNCTION');
/**
 * Boolean to indicate whether prefix should be set for single language scenarios
 */
const ALWAYS_SET_PREFIX = new InjectionToken('ALWAYS_SET_PREFIX');
const LOCALIZE_CACHE_NAME = 'LOCALIZE_DEFAULT_LANGUAGE';
const DEFAULT_COOKIE_FORMAT = '{{value}};{{expires}}';
const DEFAULT_INITIAL_NAVIGATION = false;
class LocalizeRouterSettings {
    /**
     * Settings for localize router
     */
    constructor(useCachedLang = true, alwaysSetPrefix = true, cacheMechanism = CacheMechanism.LocalStorage, cacheName = LOCALIZE_CACHE_NAME, defaultLangFunction = void 0, cookieFormat = DEFAULT_COOKIE_FORMAT, initialNavigation = DEFAULT_INITIAL_NAVIGATION) {
        this.useCachedLang = useCachedLang;
        this.alwaysSetPrefix = alwaysSetPrefix;
        this.cacheName = cacheName;
        this.cookieFormat = cookieFormat;
        this.initialNavigation = initialNavigation;
        this.cacheMechanism = cacheMechanism;
        this.defaultLangFunction = defaultLangFunction;
    }
}
LocalizeRouterSettings.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterSettings, deps: [{ token: USE_CACHED_LANG }, { token: ALWAYS_SET_PREFIX }, { token: CACHE_MECHANISM }, { token: CACHE_NAME }, { token: DEFAULT_LANG_FUNCTION }, { token: COOKIE_FORMAT }, { token: INITIAL_NAVIGATION }], target: i0.ɵɵFactoryTarget.Injectable });
LocalizeRouterSettings.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterSettings });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterSettings, decorators: [{
            type: Injectable
        }], ctorParameters: function () {
        return [{ type: undefined, decorators: [{
                        type: Inject,
                        args: [USE_CACHED_LANG]
                    }] }, { type: undefined, decorators: [{
                        type: Inject,
                        args: [ALWAYS_SET_PREFIX]
                    }] }, { type: undefined, decorators: [{
                        type: Inject,
                        args: [CACHE_MECHANISM]
                    }] }, { type: undefined, decorators: [{
                        type: Inject,
                        args: [CACHE_NAME]
                    }] }, { type: undefined, decorators: [{
                        type: Inject,
                        args: [DEFAULT_LANG_FUNCTION]
                    }] }, { type: undefined, decorators: [{
                        type: Inject,
                        args: [COOKIE_FORMAT]
                    }] }, { type: undefined, decorators: [{
                        type: Inject,
                        args: [INITIAL_NAVIGATION]
                    }] }];
    } });

const COOKIE_EXPIRY = 30; // 1 month
/**
 * Abstract class for parsing localization
 */
class LocalizeParser {
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
            var _a;
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
            if (route.loadChildren && ((_a = route._loadedRoutes) === null || _a === void 0 ? void 0 : _a.length)) {
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
            routeData.localizeRouter = Object.assign(Object.assign({}, routeData.localizeRouter), { [property]: route[property] });
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
        }], ctorParameters: function () {
        return [{ type: i1.TranslateService, decorators: [{
                        type: Inject,
                        args: [TranslateService]
                    }] }, { type: i2.Location, decorators: [{
                        type: Inject,
                        args: [Location]
                    }] }, { type: LocalizeRouterSettings, decorators: [{
                        type: Inject,
                        args: [LocalizeRouterSettings]
                    }] }];
    } });
/**
 * Manually set configuration
 */
class ManualParserLoader extends LocalizeParser {
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
class DummyLocalizeParser extends LocalizeParser {
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

/**
 * Compare if two objects are same
 */
function equals(o1, o2) {
    if (o1 === o2) {
        return true;
    }
    if (o1 === null || o2 === null) {
        return false;
    }
    if (o1 !== o1 && o2 !== o2) {
        return true; // NaN === NaN
    }
    const t1 = typeof o1, t2 = typeof o2;
    let length, key, keySet;
    if (t1 === t2 && t1 === 'object') {
        if (Array.isArray(o1)) {
            if (!Array.isArray(o2)) {
                return false;
            }
            if ((length = o1.length) === o2.length) {
                for (key = 0; key < length; key++) {
                    if (!equals(o1[key], o2[key])) {
                        return false;
                    }
                }
                return true;
            }
        }
        else {
            if (Array.isArray(o2)) {
                return false;
            }
            keySet = Object.create(null);
            for (key in o1) {
                if (o1.hasOwnProperty(key)) {
                    if (!equals(o1[key], o2[key])) {
                        return false;
                    }
                    keySet[key] = true;
                }
            }
            for (key in o2) {
                if (o2.hasOwnProperty(key)) {
                    if (!(key in keySet) && typeof o2[key] !== 'undefined') {
                        return false;
                    }
                }
            }
            return true;
        }
    }
    return false;
}
/**
 * Determine if the argument is shaped like a Promise
 */
function isPromise(obj) {
    // allow any Promise/A+ compliant thenable.
    // It's up to the caller to ensure that obj.then conforms to the spec
    return !!obj && typeof obj.then === 'function';
}
/**
 * Deep copy of object and array
 */
function deepCopy(object) {
    const output = Array.isArray(object) ? [] : {};
    for (const data in object) {
        if (data) {
            const value = object[data];
            output[data] = (typeof value === 'object') ? deepCopy(value) : value;
        }
    }
    return output;
}
function flatten(list) {
    return list.reduce((flat, item) => {
        const flatItem = Array.isArray(item) ? flatten(item) : item;
        return flat.concat(flatItem);
    }, []);
}

/**
 * Localization service
 * modifyRoutes
 */
class LocalizeRouterService {
    /**
     * CTOR
     */
    constructor(parser, settings, router, route /*,
    @Inject(Location) private location: Location*/) {
        this.parser = parser;
        this.settings = settings;
        this.router = router;
        this.route = route;
        this.routerEvents = new Subject();
        const initializedSubject = new ReplaySubject(1);
        this.hooks = {
            _initializedSubject: initializedSubject,
            initialized: initializedSubject.asObservable()
        };
    }
    /**
     * Start up the service
     */
    init() {
        this.applyConfigToRouter(this.parser.routes);
        // subscribe to router events
        this.router.events
            .pipe(filter(event => event instanceof NavigationStart), pairwise())
            .subscribe(this._routeChanged());
        if (this.settings.initialNavigation) {
            this.router.initialNavigation();
        }
    }
    /**
     * Change language and navigate to translated route
     */
    changeLanguage(lang, extras, useNavigateMethod) {
        if (lang !== this.parser.currentLang) {
            const rootSnapshot = this.router.routerState.snapshot.root;
            this.parser.translateRoutes(lang).subscribe(() => {
                let url = this.traverseRouteSnapshot(rootSnapshot);
                url = this.translateRoute(url);
                if (!this.settings.alwaysSetPrefix) {
                    let urlSegments = url.split('/');
                    const languageSegmentIndex = urlSegments.indexOf(this.parser.currentLang);
                    // If the default language has no prefix make sure to remove and add it when necessary
                    if (this.parser.currentLang === this.parser.defaultLang) {
                        // Remove the language prefix from url when current language is the default language
                        if (languageSegmentIndex === 0 || (languageSegmentIndex === 1 && urlSegments[0] === '')) {
                            // Remove the current aka default language prefix from the url
                            urlSegments = urlSegments.slice(0, languageSegmentIndex).concat(urlSegments.slice(languageSegmentIndex + 1));
                        }
                    }
                    else {
                        // When coming from a default language it's possible that the url doesn't contain the language, make sure it does.
                        if (languageSegmentIndex === -1) {
                            // If the url starts with a slash make sure to keep it.
                            const injectionIndex = urlSegments[0] === '' ? 1 : 0;
                            urlSegments = urlSegments.slice(0, injectionIndex).concat(this.parser.currentLang, urlSegments.slice(injectionIndex));
                        }
                    }
                    url = urlSegments.join('/');
                }
                // Prevent multiple "/" character
                url = url.replace(/\/+/g, '/');
                const lastSlashIndex = url.lastIndexOf('/');
                if (lastSlashIndex > 0 && lastSlashIndex === url.length - 1) {
                    url = url.slice(0, -1);
                }
                const queryParamsObj = this.parser.chooseQueryParams(extras, this.route.snapshot.queryParams);
                this.applyConfigToRouter(this.parser.routes);
                this.lastExtras = extras;
                if (useNavigateMethod) {
                    const extrasToApply = extras ? Object.assign({}, extras) : {};
                    if (queryParamsObj) {
                        extrasToApply.queryParams = queryParamsObj;
                    }
                    this.router.navigate([url], extrasToApply);
                }
                else {
                    let queryParams = this.parser.formatQueryParams(queryParamsObj);
                    queryParams = queryParams ? `?${queryParams}` : '';
                    this.router.navigateByUrl(`${url}${queryParams}`, extras);
                }
            });
        }
    }
    /**
     * Traverses through the tree to assemble new translated url
     */
    traverseRouteSnapshot(snapshot) {
        if (snapshot.firstChild && snapshot.routeConfig) {
            return `${this.parseSegmentValue(snapshot)}/${this.traverseRouteSnapshot(snapshot.firstChild)}`;
        }
        else if (snapshot.firstChild) {
            return this.traverseRouteSnapshot(snapshot.firstChild);
        }
        else {
            return this.parseSegmentValue(snapshot);
        }
        /* if (snapshot.firstChild && snapshot.firstChild.routeConfig && snapshot.firstChild.routeConfig.path) {
          if (snapshot.firstChild.routeConfig.path !== '**') {
            return this.parseSegmentValue(snapshot) + '/' + this.traverseRouteSnapshot(snapshot.firstChild);
          } else {
            return this.parseSegmentValue(snapshot.firstChild);
          }
        }
        return this.parseSegmentValue(snapshot); */
    }
    /**
     * Build URL from segments and snapshot (for params)
     */
    buildUrlFromSegments(snapshot, segments) {
        return segments.map((s, i) => s.indexOf(':') === 0 ? snapshot.url[i].path : s).join('/');
    }
    /**
     * Extracts new segment value based on routeConfig and url
     */
    parseSegmentValue(snapshot) {
        if (snapshot.routeConfig && snapshot.routeConfig.matcher) {
            const subPathMatchedSegments = this.parseSegmentValueMatcher(snapshot);
            return this.buildUrlFromSegments(snapshot, subPathMatchedSegments);
        }
        else if (snapshot.data.localizeRouter) {
            const path = snapshot.data.localizeRouter.path;
            const subPathSegments = path.split('/');
            return this.buildUrlFromSegments(snapshot, subPathSegments);
        }
        else if (snapshot.parent && snapshot.parent.parent) { // Not lang route and no localizeRouter data = excluded path
            const path = snapshot.routeConfig.path;
            const subPathSegments = path.split('/');
            return this.buildUrlFromSegments(snapshot, subPathSegments);
        }
        else {
            return '';
        }
        /* if (snapshot.routeConfig) {
          if (snapshot.routeConfig.path === '**') {
            return snapshot.url.filter((segment: UrlSegment) => segment.path).map((segment: UrlSegment) => segment.path).join('/');
          } else {
            const subPathSegments = snapshot.routeConfig.path.split('/');
            return subPathSegments.map((s: string, i: number) => s.indexOf(':') === 0 ? snapshot.url[i].path : s).join('/');
          }
        }
        return ''; */
    }
    parseSegmentValueMatcher(snapshot) {
        const localizeMatcherParams = snapshot.data && snapshot.data.localizeMatcher && snapshot.data.localizeMatcher.params || {};
        const subPathSegments = snapshot.url
            .map((segment) => {
            const currentPath = segment.path;
            const matchedParamName = segment.localizedParamName;
            const val = (matchedParamName && localizeMatcherParams[matchedParamName]) ?
                localizeMatcherParams[matchedParamName](currentPath) : null;
            return val || `${this.parser.getEscapePrefix()}${currentPath}`;
        });
        return subPathSegments;
    }
    /**
     * Translate route to current language
     * If new language is explicitly provided then replace language part in url with new language
     */
    translateRoute(path) {
        if (typeof path === 'string') {
            const url = this.parser.translateRoute(path);
            return !path.indexOf('/') ? this.parser.addPrefixToUrl(url) : url;
        }
        // it's an array
        const result = [];
        path.forEach((segment, index) => {
            if (typeof segment === 'string') {
                const res = this.parser.translateRoute(segment);
                if (!index && !segment.indexOf('/')) {
                    result.push(this.parser.addPrefixToUrl(res));
                }
                else {
                    result.push(res);
                }
            }
            else {
                result.push(segment);
            }
        });
        return result;
    }
    /**
     * Event handler to react on route change
     */
    _routeChanged() {
        return ([previousEvent, currentEvent]) => {
            const previousLang = this.parser.getLocationLang(previousEvent.url) || this.parser.defaultLang;
            const currentLang = this.parser.getLocationLang(currentEvent.url) || this.parser.defaultLang;
            const lastExtras = this.lastExtras;
            if (currentLang !== previousLang && this.latestUrl !== currentEvent.url) {
                this.latestUrl = currentEvent.url;
                this.cancelCurrentNavigation();
                this.parser.translateRoutes(currentLang)
                    .subscribe(() => {
                    // Reset routes again once they are all translated
                    this.applyConfigToRouter(this.parser.routes);
                    // Clear global extras
                    this.lastExtras = undefined;
                    // Init new navigation with same url to take new config in consideration
                    this.router.navigateByUrl(currentEvent.url, lastExtras);
                    // Fire route change event
                    this.routerEvents.next(currentLang);
                });
            }
            this.latestUrl = currentEvent.url;
        };
    }
    /**
     * Drop the current Navigation
     */
    cancelCurrentNavigation() {
        const currentNavigation = this.router.getCurrentNavigation();
        const url = this.router.serializeUrl(currentNavigation.extractedUrl);
        this.router.events.next(new NavigationCancel(currentNavigation.id, url, ''));
        this.router.transitions.next(Object.assign(Object.assign({}, this.router.transitions.getValue()), { id: 0 }));
    }
    /**
     * Apply config to Angular RouterModule
     * @param config routes to apply
     */
    applyConfigToRouter(config) {
        this.router.resetConfig(deepCopy(config));
    }
}
LocalizeRouterService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterService, deps: [{ token: LocalizeParser }, { token: LocalizeRouterSettings }, { token: Router }, { token: ActivatedRoute }], target: i0.ɵɵFactoryTarget.Injectable });
LocalizeRouterService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterService, decorators: [{
            type: Injectable
        }], ctorParameters: function () {
        return [{ type: LocalizeParser, decorators: [{
                        type: Inject,
                        args: [LocalizeParser]
                    }] }, { type: LocalizeRouterSettings, decorators: [{
                        type: Inject,
                        args: [LocalizeRouterSettings]
                    }] }, { type: i3.Router, decorators: [{
                        type: Inject,
                        args: [Router]
                    }] }, { type: i3.ActivatedRoute, decorators: [{
                        type: Inject,
                        args: [ActivatedRoute]
                    }] }];
    } });

const VIEW_DESTROYED_STATE = 128;
class LocalizeRouterPipe {
    /**
     * CTOR
     */
    constructor(localize, _ref) {
        this.localize = localize;
        this._ref = _ref;
        this.value = '';
        this.subscription = this.localize.routerEvents.subscribe(() => {
            this.transform(this.lastKey);
        });
    }
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
    /**
     * Transform current url to localized one
     */
    transform(query) {
        if (!query || query.length === 0 || !this.localize.parser.currentLang) {
            return query;
        }
        if (equals(query, this.lastKey) && equals(this.lastLanguage, this.localize.parser.currentLang)) {
            return this.value;
        }
        this.lastKey = query;
        this.lastLanguage = this.localize.parser.currentLang;
        /** translate key and update values */
        this.value = this.localize.translateRoute(query);
        this.lastKey = query;
        // if view is already destroyed, ignore firing change detection
        const view = this._ref._view;
        if (view && (view.state & VIEW_DESTROYED_STATE)) {
            return this.value;
        }
        setTimeout(() => {
            this._ref.detectChanges();
        }, 0);
        return this.value;
    }
}
LocalizeRouterPipe.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterPipe, deps: [{ token: LocalizeRouterService }, { token: i0.ChangeDetectorRef }], target: i0.ɵɵFactoryTarget.Pipe });
LocalizeRouterPipe.ɵpipe = i0.ɵɵngDeclarePipe({ minVersion: "14.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterPipe, name: "localize", pure: false });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "14.2.1", ngImport: i0, type: LocalizeRouterPipe, decorators: [{
            type: Pipe,
            args: [{
                    name: 'localize',
                    pure: false // required to update the value when the promise is resolved
                }]
        }], ctorParameters: function () { return [{ type: LocalizeRouterService }, { type: i0.ChangeDetectorRef }]; } });

class GilsdavReuseStrategy {
    // private handlers: {[key: string]: DetachedRouteHandle} = {};
    constructor() {
    }
    shouldDetach(route) {
        // console.log('shouldDetach', route);
        return false;
    }
    store(route, handle) {
        // console.log('store', route, handle);
        // console.log('store url', this.getKey(route));
        // this.handlers[this.getKey(route)] = handle;
    }
    shouldAttach(route) {
        // console.log('shouldAttach', route, this.getKey(route));
        // return !!this.handlers[this.getKey(route)];
        return false;
    }
    retrieve(route) {
        // console.log('retrieve', route);
        // console.log('retrieve url', this.getKey(route));
        // const result = this.handlers[this.getKey(route)];
        // delete this.handlers[this.getKey(route)];
        // return result;
        return null;
    }
    shouldReuseRoute(future, curr) {
        // console.log('shouldReuseRoute', future, curr, this.getKey(future) === this.getKey(curr));
        // console.log('shouldReuseRoute', future && curr ? this.getKey(future) === this.getKey(curr) : false);
        return future && curr ? this.getKey(future) === this.getKey(curr) : false;
    }
    getKey(route) {
        // console.log(route.parent.component.toString());
        if (route.firstChild && route.firstChild.routeConfig && route.firstChild.routeConfig.path &&
            route.firstChild.routeConfig.path.indexOf('**') !== -1) { // WildCard
            return 'WILDCARD';
        }
        else if (!route.data.localizeRouter && (!route.parent || !route.parent.parent) && !route.data.skipRouteLocalization) { // Lang route
            return 'LANG';
        }
        else if (route.routeConfig.matcher) {
            let keyM = `${this.getKey(route.parent)}/${route.routeConfig.matcher.name}`;
            if (route.data.discriminantPathKey) {
                keyM = `${keyM}-${route.data.discriminantPathKey}`;
            }
            return keyM;
        }
        else if (route.data.localizeRouter) {
            let key = `${this.getKey(route.parent)}/${route.data.localizeRouter.path}`;
            if (route.data.discriminantPathKey) {
                key = `${key}-${route.data.discriminantPathKey}`;
            }
            return key;
        }
        else {
            let key = route.routeConfig.path;
            if (route.parent) {
                key = `${this.getKey(route.parent)}/${route.routeConfig.path}`;
            }
            if (route.data.discriminantPathKey) {
                key = `${key}-${route.data.discriminantPathKey}`;
            }
            return key;
        }
    }
}

class LocalizedRouter extends Router {
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
function setupRouter(ref, urlSerializer, contexts, location, injector, compiler, config, localize, opts = {}, defaultTitleStrategy, titleStrategy, urlHandlingStrategy, routeReuseStrategy) {
    const router = new LocalizedRouter(null, urlSerializer, contexts, location, injector, compiler, flatten(config), localize);
    if (urlHandlingStrategy) {
        router.urlHandlingStrategy = urlHandlingStrategy;
    }
    if (routeReuseStrategy) {
        router.routeReuseStrategy = routeReuseStrategy;
    }
    router.titleStrategy = titleStrategy !== null && titleStrategy !== void 0 ? titleStrategy : defaultTitleStrategy;
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
function wrapIntoObservable(value) {
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

class ParserInitializer {
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
function getAppInitializer(p, parser, routes) {
    // DeepCopy needed to prevent RAW_ROUTES mutation
    const routesCopy = deepCopy(routes);
    return p.generateInitializer(parser, routesCopy).bind(p);
}
class LocalizeRouterModule {
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
function provideForRootGuard(localizeRouterModule) {
    if (localizeRouterModule) {
        throw new Error(`LocalizeRouterModule.forRoot() called twice. Lazy loaded modules should use LocalizeRouterModule.forChild() instead.`);
    }
    return 'guarded';
}

class LocalizeNgModuleFactory extends NgModuleFactory {
    constructor(moduleType) {
        super();
        this.moduleType = moduleType;
        this.create = (parentInjector) => {
            const compiler = parentInjector.get(Compiler);
            const localize = parentInjector.get(LocalizeParser);
            const compiled = compiler.compileModuleAndAllComponentsSync(this.moduleType);
            const moduleRef = compiled.ngModuleFactory.create(parentInjector);
            const getMethod = moduleRef.injector.get.bind(moduleRef.injector);
            moduleRef.injector['get'] = (token, notFoundValue) => {
                const getResult = getMethod(token, notFoundValue);
                if (token === ROUTES) {
                    // translate lazy routes
                    return localize.initChildRoutes([].concat(...getResult));
                }
                else {
                    return getResult;
                }
            };
            return moduleRef;
        };
    }
}
function translateModule(moduleType) {
    return new LocalizeNgModuleFactory(moduleType);
}

/*
 * Public API Surface of ngx-translate-router
 */

/**
 * Generated bundle index. Do not edit.
 */

export { ALWAYS_SET_PREFIX, CACHE_MECHANISM, CACHE_NAME, COOKIE_FORMAT, CacheMechanism, DEFAULT_LANG_FUNCTION, DummyLocalizeParser, GilsdavReuseStrategy, INITIAL_NAVIGATION, LOCALIZE_ROUTER_FORROOT_GUARD, LocalizeNgModuleFactory, LocalizeParser, LocalizeRouterModule, LocalizeRouterPipe, LocalizeRouterService, LocalizeRouterSettings, LocalizedRouter, ManualParserLoader, ParserInitializer, RAW_ROUTES, USE_CACHED_LANG, getAppInitializer, provideForRootGuard, setupRouter, translateModule, wrapIntoObservable };
//# sourceMappingURL=gilsdav-ngx-translate-router.mjs.map

import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import getAbsoluteUri from "./getAbsoluteUri.js";
import Resource from "./Resource.js";

/*global CESIUM_BASE_URL,define,require*/

const cesiumScriptRegex = /((?:.*\/)|^)Cesium\.js(?:\?|\#|$)/;
function getBaseUrlFromCesiumScript() {
  const scripts = document.getElementsByTagName("script");
  for (let i = 0, len = scripts.length; i < len; ++i) {
    const src = scripts[i].getAttribute("src");
    const result = cesiumScriptRegex.exec(src);
    if (result !== null) {
      return result[1];
    }
  }
  return undefined;
}

let a;
function tryMakeAbsolute(url) {
  if (typeof document === "undefined") {
    // Node.js and Web Workers. In both cases, the URL will already be absolute.
    return url;
  }

  if (!defined(a)) {
    a = document.createElement("a");
  }
  a.href = url;
  return a.href;
}

let baseResource;
function getCesiumBaseUrl() {
  if (defined(baseResource)) {
    return baseResource;
  }

  let baseUrlString;
  if (typeof CESIUM_BASE_URL !== "undefined") {
    baseUrlString = CESIUM_BASE_URL;
  } else if (defined(import.meta?.url)) {
    // ESM
    baseUrlString = getAbsoluteUri(".", import.meta.url);
  } else if (
    typeof define === "object" &&
    defined(define.amd) &&
    !define.amd.toUrlUndefined &&
    defined(require.toUrl)
  ) {
    // RequireJS
    baseUrlString = getAbsoluteUri(
      "..",
      buildModuleUrl("Core/buildModuleUrl.js")
    );
    // } else if (!FeatureDetection.isInternetExplorer() && /\/buildModuleUrl\.js$/.test(import.meta.url)) {
    //     baseUrlString = getAbsoluteUri('..', import.meta.url);
  } else {
    // IIFE
    baseUrlString = getBaseUrlFromCesiumScript();
  }

  if (baseUrlString === "") {
    baseUrlString = ".";
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(baseUrlString)) {
    throw new DeveloperError(
      "Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL."
    );
  }
  //>>includeEnd('debug');

  baseResource = new Resource({
    url: tryMakeAbsolute(baseUrlString),
  });
  baseResource.appendForwardSlash();

  return baseResource;
}

function buildModuleUrlFromRequireToUrl(moduleID) {
  //moduleID will be non-relative, so require it relative to this module, in Core.
  return tryMakeAbsolute(require.toUrl(`../${moduleID}`));
}

function buildModuleUrlFromBaseUrl(moduleID) {
  const resource = getCesiumBaseUrl().getDerivedResource({
    url: moduleID,
  });
  return resource.url;
}

let implementation;

/**
 * Given a relative URL under the Cesium base URL, returns an absolute URL.
 * @function
 *
 * @param {string} relativeUrl The relative path.
 * @returns {string} The absolutely URL representation of the provided path.
 *
 * @example
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   baseLayer: Cesium.ImageryLayer.fromProviderAsync(
 *     Cesium.TileMapServiceImageryProvider.fromUrl(
 *       Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
 *     )),
 *   baseLayerPicker: false,
 * });
 */
function buildModuleUrl(relativeUrl) {
  if (!defined(implementation)) {
    //select implementation
    if (
      typeof define === "object" &&
      defined(define.amd) &&
      !define.amd.toUrlUndefined &&
      defined(require.toUrl)
    ) {
      implementation = buildModuleUrlFromRequireToUrl;
    } else {
      implementation = buildModuleUrlFromBaseUrl;
    }
  }

  const url = implementation(relativeUrl);
  return url;
}

// exposed for testing
buildModuleUrl._cesiumScriptRegex = cesiumScriptRegex;
buildModuleUrl._buildModuleUrlFromBaseUrl = buildModuleUrlFromBaseUrl;
buildModuleUrl._clearBaseResource = function () {
  baseResource = undefined;
};

/**
 * Sets the base URL for resolving modules.
 * @param {string} value The new base URL.
 */
buildModuleUrl.setBaseUrl = function (value) {
  baseResource = Resource.DEFAULT.getDerivedResource({
    url: value,
  });
};

/**
 * Gets the base URL for resolving modules.
 *
 * @function
 * @returns {string} The configured base URL
 */
buildModuleUrl.getCesiumBaseUrl = getCesiumBaseUrl;

export default buildModuleUrl;

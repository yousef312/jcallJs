function isObjectLiteral(obj) {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Object.prototype.toString.call(obj) === "[object Object]"
  );
}

const METHODS = ["put", "delete", "post", "get", "patch"];
const local_noop = () => { }; // no operation fn
const FETCH_SUPPORT = typeof fetch === "function";

class FetchError extends Error {
  constructor(message, status, statusText, response) {
    super(message); // Pass the message to the parent (Error) constructor
    this.name = this.constructor.name;
    this.status = status || null;
    this.statusText = statusText || null;
    this.stack = new Error().stack;
    this.response = response;
  }
}

function getHeaders(object) {
  const headers = {};
  if (typeof object === "string") {
    // Split headers into an object
    object
      .trim()
      .split(/[\r\n]+/)
      .forEach((line) => {
        const parts = line.split(": ");
        const header = parts.shift();
        const value = parts.join(": ");
        headers[header.toLowerCase()] = value;
      });
  } else if (object.entries) {
    for (let [key, value] of object.entries()) {
      headers[key] = value;
    }
  }
  return headers;
}

/**
 * @typedef {Object} Headers
 * @property {String} cache Optionally identify caching mechanisme, must be one of these:
 * ```
 * const cacheValue = ["no-cache", "no-store", "public", "private", "max-age=*"]
 * ```
 * @property {String} accept Optionally identify the type of response you are expecting
 * @property {String} contentType Optionally define the contentType, if data provided not the same as contentType the program will adjust it value!
 * @property {String} referer the referer of the request
 * @property {String} origin the origin of the request
 * @property {String} lang the language of the request
 * @property {String} authorize the authorization token to be sent with the request
 * @property {Boolean} frame the frame options of the request
 * @property {String} cookie the cookie to be sent with the request
 * @property {Boolean} nosniff the nosniff options of the request
 * @property {Boolean} credentials the credentials to be sent with the request
 */

/**
 * @typedef {Object} jcallMapControl
 * @property {String} type the request type, either `XHR` or `FETCH` depending on supported mechanism
 * @property {XMLHttpRequest} xhr the actual xmlHttpRequest used if any
 * @property {(msg: String) => jcallMapControl} abort abort the request
 * @property {(headers: Headers) => jcallMapControl} setHeaders Optionally add some headers
 * @property {function} progress progress callback
 * @property {function(): Promise} launch send the request
 * @readonly
 */

/**
 * Send a synchronized request for a server backend, allowing you to create user-friendly interaction
 * with your different `data sources`.
 * @param {Object} options Request different options, please read about jcall requests
 * @param {String} options.method The method used in the request one of <`POST`,`GET`,`PUT`,`DELETE`, `PATCH`>
 * @param {String} options.api the url of the request
 * @param {Object|String} options.data the data to be sent with the request
 * @param {Object} [options.headers] Optionally provide some headers for the request, example:
 * ```
 * const headers = {
 * 'Content-Type': 'application/json',
 * 'Accept': 'application/json',
 * }
 * jcall({
 *  method: 'post',
 *  api: '/api',
 *  data: {name: 'john'},
 *  headers
 * })
 * ```
 * @param {true} [options.async] Optionally set the request to be asynchronous or not
 * @param {String} [options.contentType] Optionally provide the content type of the request
 * @param {Number} [options.timeout] Optionally limit the request execution time, you can catch timeout errors using:
 *  ```
 * jcall(..)
 * .then(..)
 * .catch((errType,error) => {
 * if(errType == 'timeout')
 * console.error('timeout error',error)
 * })
 * ```
 * @param {String} [options.csrf] the csrf token to be sent with the request
 * @param {Function} [options.progress] the progress of the request
 * @param {Function} [options.floaded] the function to be called when the request is loaded
 * @returns {control}
 */
function jcall(api, options) {
  if (!api)
    throw new Error("An api/url must be defined to send an jcall request!");

  options = options || {};
  let method = (options.method || "post").toLowerCase();
  let timeout = options.timeout || null;
  let credentials = options.credentials || false;
  let csrf = options.csrf || jcall.csrf;
  let useXHR = options.useXHR || false;

  // credentials are required to send cookies for csrf protections
  // so let's activate them
  if (csrf) {
    credentials = true;
  }

  // auto create preventer
  if (jcall.preventer === true) {
    let div = document.createElement('div');
    // applying some style
    div.style.backgroundColor = "rgba(0,0,0,.2)";
    div.style.position = "fixed";
    div.style.zIndex = "10000";
    div.style.left =
      div.style.top = 0;
    div.style.width =
      div.style.height = "100%";
    div.style.display = "none";
    div.open = function () {
      this.style.display = "inline";
    };
    div.close = function () {
      this.style.display = "none";
    };
    jcall.preventer = div;
  }

  // preparing the outline of the request
  let abortController = new AbortController();
  let request = {
    api,
    method: method && METHODS.indexOf(method) != -1 ? method : "post",
    credentials: typeof credentials == "boolean" ? credentials : false,
    timeout: timeout
      ? timeout < 10
        ? timeout * 1000
        : timeout < 100
          ? timeout * 100
          : timeout < 1000
            ? timeout * 10
            : timeout
      : 0,
    headers: {
      signal: abortController.signal,
    },
    csrf,
  };
  if (jcall.authorization) request.headers["authorize"] = jcall.authorization;

  function endStatus(status, statusText, response, reject, resolve) {
    switch (status) {
      case 400:
        reject(
          new FetchError(
            400 + " - Bad Request: The server couldn't understand the request.",
            400,
            statusText,
            response
          )
        );
        break;
      case 401:
        reject(
          new FetchError(
            401 +
            " - Unauthorized: Authentication is required, or the provided credentials are incorrect.",
            401,
            statusText,
            response
          )
        );
        break;
      case 403:
        reject(
          new FetchError(
            403 +
            " - Forbidden: The server understood the request, but the user doesn't have permission to perform the action.",
            403,
            statusText,
            response
          )
        );
        break;
      case 404:
        reject(
          new FetchError(
            404 +
            " - Not Found: The requested resource could not be found on the server.",
            404,
            statusText,
            response
          )
        );
        break;
      case 500:
        reject(
          new FetchError(
            500 +
            " - Internal Server Error: The server encountered an unexpected condition.",
            500,
            statusText,
            response
          )
        );
        break;
      case 502:
        reject(
          new FetchError(
            502 +
            " - Bad Gateway: The server, while acting as a gateway or proxy, received an invalid response from the upstream server.",
            502,
            statusText,
            response
          )
        );
        break;
      case 503:
        reject(
          new FetchError(
            503 +
            " - Service Unavailable: The server is currently unavailable, often due to maintenance or overloading.",
            503,
            statusText,
            response
          )
        );
    }
  }

  /**
   * jcall request chaining mechanisme
   * @type {jcallMapControl}
   */
  let control = {
    type: useXHR === true ? "XHR" : FETCH_SUPPORT === true ? "FETCH" : "XHR",
    progress: function () { },
    setHeaders: function (headers) {
      let res = {};

      // setting some values
      if (
        headers.accept &&
        [
          "application/json",
          "application/xml",
          "text/html",
          "text/plain",
          "*/*",
        ].indexOf(headers.accept) != -1
      )
        res.accept = headers.accept;
      if (headers.cache) {
        if (typeof headers.cache === "boolean")
          if (this.type == "XHR")
            res.cache = headers.cache == true ? "public" : "no-cache";
          else res.cache = headers.cache == true ? "force-cache" : "no-cache";
        else if (typeof headers.cache == "string")
          if (
            this.type == "XHR" &&
            (["no-cache", "no-store", "public", "private"].indexOf(
              headers.cache
            ) != -1 ||
              headers.cache.indexOf("max-age=") == 0)
          )
            res.cache = headers.cache;
          else if (
            this.type == "FETCH" &&
            [
              "default",
              "no-store",
              "no-cache",
              "reload",
              "force-cache",
              "only-if-cached",
            ].indexOf(headers.cache) != -1
          )
            res.cache = headers.cache;
          else
            console.warn(
              "You are using inproperiate values for ``cache`` attribute!"
            );
      }

      if (headers.cookie) res.cookie = headers.cookie;
      if (headers.referer) res.referer = headers.referer;
      if (headers.origin) res.origin = headers.origin;
      if (headers.lang) res.lang = headers.lang;
      if (headers.authorize) res.authorize = headers.authorize;
      if (typeof headers.frame === "boolean")
        res.frame = headers.frame === true ? "SAMEORIGIN" : "DENY";
      if (headers.nosniff === true) res.nosniff = headers.nosniff;
      if (headers.contentType) res.contentType = headers.contentType;
      request.headers = res;
      return this;
    },
    launch: function (data, dontUsePreventer) {
      const { headers } = request;
      let contentType = request.headers.contentType;
      let result = {
        result: null,
        response: null,
        headers: null,
        contentType: null,
      };

      if (dontUsePreventer !== true && jcall.preventer) jcall.preventer.open();
      return new Promise((res, rej) => {
        let _this = this;
        // deciding the way to send data
        if (!(data instanceof FormData)) {
          if (typeof data === "string") contentType = "text/plain";
          else if (isObjectLiteral(data) === true) {
            contentType = "application/json";
            data = JSON.stringify(data);
          } else ;
        }

        if (this.type === "XHR") {
          // ---------- SENDING XMLHttpRequest
          let xhr = new XMLHttpRequest();
          this.xhr = xhr;
          xhr.open(request.method || "post", request.api);
          xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

          xhr.upload.onprogress = function (e) {
            e.percent = (e.loaded / e.total) * 100;
            if (typeof _this.progress == "function") _this.progress(e);
          };
          // some properties
          if (typeof request.credentials == "boolean")
            xhr.withCredentials = request.credentials;
          xhr.timeout = request.timeout;
          xhr.responseType = "json";

          // some headers
          if (request.csrf) xhr.setRequestHeader("X-CSRF-TOKEN", request.csrf);
          if (contentType) xhr.setRequestHeader("Content-Type", contentType);
          if (headers.accept) xhr.setRequestHeader("Accept", headers.accept);
          if (headers.cache)
            xhr.setRequestHeader("Cache-Control", headers.cache);
          if (headers.cookie) xhr.setRequestHeader("Cookie", headers.cookie);
          if (headers.referer) xhr.setRequestHeader("Referer", headers.referer);
          if (headers.origin) xhr.setRequestHeader("Origin", headers.origin);
          if (headers.lang)
            xhr.setRequestHeader("Accept-Language", headers.lang);
          if (headers.authorize)
            xhr.setRequestHeader("Authorization", headers.authorize);
          if (headers.frame)
            xhr.setRequestHeader("X-Frame-Options", headers.frame);
          if (headers.nosniff === true)
            xhr.setRequestHeader("X-Content-Type-Options", "nosniff");

          xhr.onreadystatechange = function (e) {
            if (this.readyState == 4) {
              result.headers = getHeaders(this.getAllResponseHeaders());
              if (jcall.preventer) jcall.preventer.close();
              if (this.status == 200)
                try {
                  result.result = JSON.parse(this.response);
                  result.response = this.response;
                  res(result);
                } catch (e) {
                  rej("ServerSide Error", this.responseText, this, e);
                }
              else {
                endStatus(
                  this.status,
                  this.statusText,
                  this.response,
                  rej);
              }
            }
          };
          xhr.onerror = function (e) {
            if (jcall.preventer) jcall.preventer.close();
            rej("error", e, this);
          };
          xhr.ontimeout = function (e) {
            if (jcall.preventer) jcall.preventer.close();
            rej("timeout", e, this);
          };
          xhr.onabort = function (e) {
            if (jcall.preventer) jcall.preventer.close();
            rej("abort", e, this);
          };
          xhr.onprogress = function (e) {
            e.percent = (e.loaded / e.total) * 100;
            if (typeof _this.progress == "function") _this.progress(e);
          };

          xhr.send(data);
        } else {
          // ---------- FETCH request
          let timeoutId;
          if (request.timeout != 0 && request.timeout != 0) {
            timeoutId = setTimeout(function () {
              if (jcall.preventer) jcall.preventer.close();
              _this.abort();
            }, request.timeout);
          }
          request.body = data;
          request.signal = abortController.signal;
          request.credentials =
            request.credentials === true ? "include" : "omit";
          if (contentType) request.headers["Content-Type"] = contentType;
          if (request.headers.authorize)
            request.headers["Authorization"] = request.headers.authorize;
          if (request.csrf) request.headers["X-CSRF-TOKEN"] = request.csrf;

          request.cache = fetch(request.api, request)
            .then(async (response) => {
              const { ok, status, statusText, type, headers } = response;
              // clearing timeout
              clearTimeout(timeoutId);
              if (jcall.preventer) jcall.preventer.close();
              if (!ok) {
                endStatus(status, statusText, await response.json(), rej);
                return;
              }
              let contentType = headers.get("Content-Type").split(";")[0];
              result["headers"] = getHeaders(headers);
              result["contentType"] = contentType;
              result["response"] = response;

              if (contentType.includes("application/json")) {
                result["result"] = await response.json();
                return res(result);
              } else if (
                contentType.includes("text/html") ||
                contentType.includes("text/plain")
              ) {
                result["result"] = await response.text();
                return res(result);
              } else if (
                contentType.includes("image") ||
                contentType.includes("application/pdf")
              )
                return response.blob();
              else return response.arrayBuffer();
            })
            .then(async (data) => {
              if (data instanceof Blob) {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                  res(reader.result);
                };
              }
            })
            .catch((e) => {
              if (jcall.preventer) jcall.preventer.close();
              clearTimeout(timeoutId);
              // internet connection or CORS error
              if (e.name === "AbortError") return rej("timeout");

              rej("error", e);
            });
        }
      }).finally((res) => {
        if (jcall.after) jcall.after(res);
      });
    },
    abort: function (msg) {
      if (this.request.type == "XHR") {
        this.xhr.abort();
      } else abortController.abort(msg);
    },
  };

  // sealing so no modifications or adding any attributes is possible anymore
  control = Object.seal(control);

  return control;
}

/**
 * Cross-Site Request Forgery token used to avoid the danger of this attack.
 * If defined will be included within each request.
 * @type {String}
 */
jcall.csrf = null; // used in each jcall call if defined

/**
 * Authorization token used to allow access for your API, when secured within
 * login system. Read more about it!
 * If defined will be included within each request.
 * @type {String}
 */
jcall.authorization = null; // used in each jcall call if defined

/**
 * An after callback will be executed after all requests.
 * you can use this to automate csrf cycle configuration!
 */
jcall.after = local_noop;

/**
 * Used to prevent user interactions while request is being handled
 * server side. the prevent element must contain this functions
 *  - .open() : to open/display the preventer
 *  - .close() : to close/hide the preventer
 * @type {HTMLDivElement}
 */
jcall.preventer = null;

/**
 * Powerfull function allows you to convert a regular submitable form into an jcall based
 * call, offering a customizable interface for maximum creativity and flex control!
 *
 * @param {HTMLFormElement} form the form to jcallify
 * @param {Object} options [Optional] options
 */
jcall.jcallify = function (form, options) {
  let getAPI = null,
    getDATA = null,
    errorCb = local_noop,
    successCb = local_noop;
  let handle = {
    /**
     * Define a function that get a custom API/url(of the request) trick for more customized experience
     * @param {() => (form: HTMLFormElement, api: String)} cb
     */
    api: function (cb) {
      getAPI = cb;
      return this;
    },
    /**
     * Define a function that get a custom data object
     * @param {() => (form: HTMLFormElement, data: FormData)} cb
     */
    data: function (cb) {
      getDATA = cb;
      return this;
    },
    /**
     * Define a handler function
     * @param {function} cb
     */
    success: function (cb) {
      successCb = cb;
      return this;
    },
    /**
     * Define error handler function
     * @param {function} cb
     */
    error: function (cb) {
      errorCb = cb;
      return this;
    },
  };
  if (form instanceof HTMLFormElement) {
    // let's make sure the form is setup well

    form.addEventListener("submit", function (e) {
      e.preventDefault(); // preventing default behavior
      let method = form.getAttribute("method") || "post";

      // preparing the API
      let api = this.getAttribute("action");
      if (getAPI != null) api = getAPI(this, api);
      if (!api)
        throw new Error(
          "Bad setup!\nplease include the action attribute in the form"
        );

      // preparing the Data
      let data = new FormData(this);
      if (getDATA != null) data = getDATA(this, data);

      jcall(api, {
        method,
      })
        .launch(data)
        .then((res) => {
          successCb(res);
        })
        .catch((e) => errorCb(e));
    });
  }

  return handle;
};

// globally exposed
window.jcall = jcall;

export { jcall as default };
//# sourceMappingURL=jcall.esm.js.map

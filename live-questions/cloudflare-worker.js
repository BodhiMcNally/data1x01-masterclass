// src/server/cloudflare/worker.ts
import { DurableObject } from "cloudflare:workers";

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var stripPathPrefix = (rawPath, decodedPath, prefixLength) => {
  if (rawPath.at(-1) === "/" && decodedPath.at(-1) !== "/") rawPath = rawPath.slice(0, -1);
  let index = 0;
  for (let i = decodedPath.indexOf("/"); i !== -1 && i < prefixLength; i = decodedPath.indexOf("/", i + 1)) {
    index = rawPath.indexOf("/", index + 1);
    if (index === -1) return "/";
  }
  return rawPath.slice(index) || "/";
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    const queryIndex = url.indexOf("?", 8);
    let keyIndex2 = queryIndex;
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61 || trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
        if (keyIndex2 > queryIndex && /(?:^|&)[^=&]*[%+]/.test(url.slice(queryIndex + 1, keyIndex2))) break;
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url.indexOf("&", valueIndex);
          return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
        }
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  };
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = (layout) => this.#layout = layout;
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = () => this.#layout;
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = (name, value, options) => {
    if (this.finalized && !this.#res.bodyUsed) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  };
  status = (status) => {
    this.#status = status;
  };
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  };
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = (object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  };
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/utils/mount.js
var getPathPrefixLength = (c, pathPrefix, routePath) => {
  if (!/[:*]/.test(pathPrefix)) return pathPrefix.length;
  const path = c.req.path;
  const matchResult = c.req[GET_MATCH_RESULT];
  const paramNames = /* @__PURE__ */ new Set();
  let length = 0;
  for (const part of splitRoutingPath(pathPrefix)) {
    const pattern = getPattern(part);
    if (pattern && pattern !== "*") {
      const name = pattern[1];
      if (paramNames.has(name)) throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath}".`);
      paramNames.add(name);
    }
    if (pattern && pattern !== "*" && pattern[2] !== true) {
      const value = matchResult.length === 2 ? matchResult[1][matchResult[0][c.req.routeIndex][1][pattern[1]]] : matchResult[0][c.req.routeIndex][1][pattern[1]];
      length += value.length + 1;
    } else if (pattern || part.endsWith("*")) {
      const end = path.indexOf("/", length + 1);
      length = end === -1 ? path.length : end;
    } else length += part.length + 1;
  }
  return length;
};
var createMountedRequest = (c, pathPrefix, routePath) => {
  if (/[^/]\*$/.test(routePath)) throw new Error(`mount(): Wildcard must follow "/" in "${routePath}".`);
  const url = new URL(c.req.raw.url);
  url.pathname = stripPathPrefix(url.pathname, c.req.path, getPathPrefixLength(c, pathPrefix, routePath));
  return new Request(url, c.req.raw);
};

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class Hono2 {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = (request) => request;
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    const mergedPath = mergePath(this._basePath, path);
    const defaultReplaceRequest = (c) => createMountedRequest(c, mergedPath.replace(/\/$/, ""), mergePath(mergedPath, "*"));
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest ? replaceRequest(c.req.raw) : defaultReplaceRequest(c), ...getOptions(c));
      if (res) return res;
      await next();
    };
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = "[^]*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/[^]*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === "[^]*" || a === "(?:|/[^]*)") return b === "[^]*" ? -1 : 1;
  else if (b === "[^]*" || b === "(?:|/[^]*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class Node2 {
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, keys) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ONLY_WILDCARD_REG_EXP_STR
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (new RegExp(regexpStr).test("")) throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        keys.push(regexpStr);
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== "[^]*" && regexpStr !== "(?:|/[^]*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        keys.push(token);
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    const keys = [];
    if (isStatic) {
      this.#root.insert(path.split(""), -1, [], this.#context, keys);
      this.paths[path] = [
        -1,
        [],
        keys
      ];
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{(?:\{[\d,]+\}|[^}])+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./gs) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, keys);
    this.paths[path] = [
      this.#index++,
      paramAssoc,
      keys
    ];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
function endsWithWildcard(keys) {
  const tail = keys[keys.length - 1];
  return tail === "[^]*" || tail === "(?:|/[^]*)";
}
function covers(wildcard, target) {
  const last = wildcard.length - 1;
  for (let i = 0; i < last; i++) if (wildcard[i] !== target[i]) return false;
  return wildcard[last] === "[^]*" || target.length === last || target[last] === "/";
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #handlers;
  #tries;
  constructor() {
    this.#handlers = { ["ALL"]: [] };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const handlers = this.#handlers;
    if (!handlers) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    const tries = this.#tries;
    if (!handlers[method]) {
      tries[method] = new Trie();
      handlers[method] = [...handlers["ALL"]];
      for (const p in tries["ALL"].paths) this.#insertPath(method, p);
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(handlers) : [method];
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!tries[m].paths[path2]) this.#insertPath(m, path2);
      handlers[m].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#handlers)) matchers[method] = this.#buildMatcher(method);
    this.#handlers = this.#tries = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const handlers = this.#handlers[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    const own = createNullObject();
    const entries = handlers.map(([h, p], i) => {
      (own[p] ??= []).push(i);
      return [h, trie.paths[p][1].reduceRight((map, [key, varIndex]) => {
        map[key] = paramReplacementMap[varIndex];
        return map;
      }, createNullObject())];
    });
    const wildcards = Object.keys(own).filter((p) => endsWithWildcard(trie.paths[p][2]));
    for (const path in trie.paths) {
      const [index, , keys] = trie.paths[path];
      const indexes = [...own[path]];
      for (const p of wildcards) if (p !== path && covers(trie.paths[p][2], keys)) indexes.push(...own[p]);
      const data = indexes.sort((a, b) => a - b).map((i) => entries[i]);
      if (index === -1) {
        const last = Math.max(-1, ...data.flatMap(([, map]) => Object.values(map)));
        staticMap[path] = [data, last === -1 ? emptyParam : path.match(regexp).slice(0, last + 1)];
      } else handlerData[index] = data;
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              if (!Object.hasOwn(params, name)) params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            if (!Object.hasOwn(params, name)) params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// src/server/auth.ts
var encoder = new TextEncoder();
function keyMatches(given, expected) {
  if (!expected || typeof given !== "string") return false;
  const a = encoder.encode(given);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
function bearerMatches(header, expected) {
  const m = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return keyMatches(m?.[1]?.trim(), expected);
}

// src/shared/protocol.ts
var PROTOCOL_VERSION = 1;
var LIMITS = {
  /** Session names: also the Durable Object name and part of the audience URL. */
  sessionPattern: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
  /** Question ids: the fenced div's id, or a generated one. */
  questionIdPattern: /^[A-Za-z0-9][A-Za-z0-9_:.-]{0,63}$/,
  promptChars: 500,
  pollOptions: 26,
  optionChars: 200,
  /** Raw answer text accepted from a phone, before normalization. */
  answerInputChars: 200,
  /** A normalized word-cloud entry is cut to this many characters. */
  answerChars: 40,
  maxWordsCeiling: 10,
  maxAnswersCeiling: 10,
  /** Word-cloud entries included in broadcast results (most frequent first). */
  cloudWords: 100,
  /** Statements in one likert question. */
  likertStatements: 6,
  likertStatementChars: 200,
  /** Points on a likert scale: at least 2, at most this many. */
  likertPoints: 11,
  /** One scale label, and one numeric-scale anchor. */
  likertLabelChars: 40
};
var DEFAULTS = {
  maxWords: 3,
  maxAnswers: 3
};

// src/server/validate.ts
var VOTER_PATTERN = /^[\x21-\x7e]{1,64}$/;
var MAX_KEY_CHARS = 256;
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isInt = (v) => typeof v === "number" && Number.isInteger(v);
var isId = (v) => typeof v === "string" && LIMITS.questionIdPattern.test(v);
var isText = (v, max) => typeof v === "string" && v.length <= max;
var isSession = (v) => typeof v === "string" && LIMITS.sessionPattern.test(v);
function validateQuestion(v) {
  if (!isObj(v)) return "question must be an object";
  if (!isId(v.id)) return "invalid question id";
  if (!isText(v.prompt, LIMITS.promptChars)) return `prompt must be a string of at most ${LIMITS.promptChars} characters`;
  if (v.type === "poll") {
    const options = v.options;
    if (!Array.isArray(options) || options.length < 1 || options.length > LIMITS.pollOptions) {
      return `a poll needs 1 to ${LIMITS.pollOptions} options`;
    }
    if (!options.every((o) => isText(o, LIMITS.optionChars))) {
      return `options must be strings of at most ${LIMITS.optionChars} characters`;
    }
    const q = { type: "poll", id: v.id, prompt: v.prompt, options: [...options] };
    if (v.confidence === true) q.confidence = true;
    if (v.revision !== void 0) {
      const r = v.revision;
      if (!isObj(r) || !isText(r.topic, 160) || !Array.isArray(r.outcomes) || r.outcomes.length > 10 || !Array.isArray(r.resources) || r.resources.length > 6) return "invalid revision metadata";
      if (!r.outcomes.every((o) => isObj(o) && isText(o.id, 10) && isText(o.text, 500))) return "invalid learning outcomes";
      if (!r.resources.every((a) => isObj(a) && isText(a.label, 160) && isText(a.url, 500) && /^https:\/\/canvas\.sydney\.edu\.au\//.test(a.url))) return "invalid revision resource";
      q.revision = { topic: r.topic, outcomes: r.outcomes.map((o) => ({ id: o.id, text: o.text })), resources: r.resources.map((a) => ({ label: a.label, url: a.url })) };
    }
    return q;
  }
  if (v.type === "wordcloud") {
    const maxWords = v.maxWords ?? DEFAULTS.maxWords;
    const maxAnswers = v.maxAnswers ?? DEFAULTS.maxAnswers;
    if (!isInt(maxWords) || maxWords < 1 || maxWords > LIMITS.maxWordsCeiling) {
      return `maxWords must be an integer from 1 to ${LIMITS.maxWordsCeiling}`;
    }
    if (!isInt(maxAnswers) || maxAnswers < 1 || maxAnswers > LIMITS.maxAnswersCeiling) {
      return `maxAnswers must be an integer from 1 to ${LIMITS.maxAnswersCeiling}`;
    }
    return { type: "wordcloud", id: v.id, prompt: v.prompt, maxWords, maxAnswers };
  }
  if (v.type === "likert") return validateLikert(v, v.id, v.prompt);
  return "question type must be 'poll', 'wordcloud' or 'likert'";
}
function consecutiveIntegers(labels) {
  return labels.every((l, i) => /^-?\d{1,6}$/.test(l) && Number(l) === Number(labels[0]) + i);
}
function validateLikert(v, id, prompt) {
  const { statements, labels } = v;
  if (!Array.isArray(statements) || statements.length < 1 || statements.length > LIMITS.likertStatements) {
    return `a likert question needs 1 to ${LIMITS.likertStatements} statements`;
  }
  if (!statements.every((s) => isText(s, LIMITS.likertStatementChars))) {
    return `statements must be strings of at most ${LIMITS.likertStatementChars} characters`;
  }
  if (!Array.isArray(labels) || labels.length < 2 || labels.length > LIMITS.likertPoints) {
    return `a likert scale needs 2 to ${LIMITS.likertPoints} points`;
  }
  if (!labels.every((l) => isText(l, LIMITS.likertLabelChars))) {
    return `scale labels must be strings of at most ${LIMITS.likertLabelChars} characters`;
  }
  const numeric = v.numeric ?? false;
  if (typeof numeric !== "boolean") return "numeric must be a boolean";
  if (numeric && !consecutiveIntegers(labels)) {
    return "a numeric scale's labels must be consecutive integers, low to high";
  }
  let anchors = null;
  if (numeric && v.anchors !== void 0 && v.anchors !== null) {
    const a = v.anchors;
    if (!Array.isArray(a) || a.length !== 2 || !a.every((x) => isText(x, LIMITS.likertLabelChars))) {
      return `anchors must be two strings of at most ${LIMITS.likertLabelChars} characters`;
    }
    anchors = [a[0], a[1]];
  }
  return {
    type: "likert",
    id,
    prompt,
    statements: [...statements],
    labels: [...labels],
    numeric,
    anchors
  };
}
function validateMessage(v) {
  const bad = (message) => ({ ok: false, message });
  const good = (msg) => ({ ok: true, msg });
  if (!isObj(v)) return bad("message must be a JSON object");
  switch (v.t) {
    case "hello": {
      if (typeof v.v !== "number") return bad("hello.v must be a number");
      if (v.role !== "deck" && v.role !== "audience") return bad("hello.role must be 'deck' or 'audience'");
      if (typeof v.voter !== "string" || !VOTER_PATTERN.test(v.voter)) return bad("invalid voter id");
      if (v.key !== void 0 && !isText(v.key, MAX_KEY_CHARS)) return bad("invalid key");
      const msg = { t: "hello", v: v.v, role: v.role, voter: v.voter };
      if (typeof v.key === "string") msg.key = v.key;
      return good(msg);
    }
    case "open": {
      const question = validateQuestion(v.question);
      return typeof question === "string" ? bad(question) : good({ t: "open", question });
    }
    case "close":
      return isId(v.id) ? good({ t: "close", id: v.id }) : bad("invalid question id");
    case "reveal": {
      if (!isId(v.id)) return bad("invalid question id");
      const c = v.correct;
      if (!Array.isArray(c) || c.length > LIMITS.pollOptions || !c.every((i) => isInt(i) && i >= 0)) {
        return bad("correct must be an array of option indices");
      }
      return good({ t: "reveal", id: v.id, correct: [...c] });
    }
    case "reset":
      if (v.id === void 0 || v.id === null) return good({ t: "reset" });
      return isId(v.id) ? good({ t: "reset", id: v.id }) : bad("invalid question id");
    case "hide":
      if (!isId(v.id)) return bad("invalid question id");
      if (!isText(v.text, LIMITS.answerInputChars)) return bad("invalid text");
      if (typeof v.hidden !== "boolean") return bad("hidden must be a boolean");
      return good({ t: "hide", id: v.id, text: v.text, hidden: v.hidden });
    case "confidence":
      if (!isId(v.id)) return bad("invalid question id");
      if (!isInt(v.choice) || v.choice < 0 || v.choice > 2) return bad("invalid confidence");
      return good({ t: "confidence", id: v.id, choice: v.choice });
    case "vote":
      if (!isId(v.id)) return bad("invalid question id");
      if (!isInt(v.choice)) return bad("choice must be an integer");
      return good({ t: "vote", id: v.id, choice: v.choice });
    case "answer":
      if (!isId(v.id)) return bad("invalid question id");
      if (!isText(v.text, LIMITS.answerInputChars)) {
        return bad(`answers are at most ${LIMITS.answerInputChars} characters`);
      }
      return good({ t: "answer", id: v.id, text: v.text });
    case "rate":
      if (!isId(v.id)) return bad("invalid question id");
      if (!isInt(v.statement)) return bad("statement must be an integer");
      if (!isInt(v.choice)) return bad("choice must be an integer");
      return good({ t: "rate", id: v.id, statement: v.statement, choice: v.choice });
    case "ping":
      return good({ t: "ping" });
    default:
      return bad("unknown message type");
  }
}
function parseMessage(raw2) {
  let value;
  try {
    value = JSON.parse(raw2);
  } catch {
    return { ok: false, message: "message is not valid JSON" };
  }
  return validateMessage(value);
}

// src/server/app.ts
var PAGE_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-cache"
};
async function page(deps, c, path, status = 200) {
  const res = await deps.asset(c, path);
  const out = new Response(res.body, { status: res.ok ? status : res.status, headers: res.headers });
  for (const [k, v] of Object.entries(PAGE_HEADERS)) out.headers.set(k, v);
  return out;
}
function createApp(deps) {
  const app2 = new Hono3();
  app2.get("/feedback/", (c) => page(deps, c, "/feedback/index.html"));
  app2.get("/feedback", (c) => c.redirect("/feedback/", 302));
  app2.get("/healthz", (c) => c.text("ok"));
  app2.get("/", (c) => page(deps, c, "/index.html"));
  app2.get("/s/:session", async (c) => {
    const session = c.req.param("session");
    if (!isSession(session)) return c.text("Not a valid session name.", 404);
    return page(deps, c, "/vote.html");
  });
  app2.get("/s/:session/", (c) => c.redirect(`/s/${encodeURIComponent(c.req.param("session"))}`, 301));
  app2.get("/api/s/:session/ws", async (c) => {
    const session = c.req.param("session");
    if (!isSession(session)) return c.text("Not a valid session name.", 404);
    if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
      return c.text("Expected a WebSocket upgrade.", 426);
    }
    return deps.socket(c, session);
  });
  app2.options("/api/s/:session/export", (c) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Headers", "Authorization");
    c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    c.header("Access-Control-Max-Age", "86400");
    return c.body(null, 204);
  });
  app2.get("/api/s/:session/export", async (c) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Cache-Control", "no-store");
    const session = c.req.param("session");
    if (!isSession(session)) return c.json({ error: "invalid session name" }, 404);
    if (!bearerMatches(c.req.header("authorization"), deps.presenterKey(c))) {
      c.header("WWW-Authenticate", 'Bearer realm="live-questions"');
      return c.json({ error: "presenter key required" }, 401);
    }
    return c.json(await deps.exportRoom(c, session));
  });
  app2.get("*", async (c) => deps.asset(c, c.req.path));
  app2.notFound((c) => c.text("Not found.", 404));
  app2.onError((err, c) => {
    console.error("live-questions:", err);
    return c.text("Internal error.", 500);
  });
  return app2;
}

// src/server/ratelimit.ts
var AUDIENCE_LIMIT = { burst: 20, refillPerSecond: 5 };
var TokenBucket = class {
  constructor(config, now) {
    this.config = config;
    this.tokens = config.burst;
    this.last = now;
  }
  tokens;
  last;
  /** Spend one token if available. `now` is in milliseconds. */
  take(now) {
    const elapsed = Math.max(0, now - this.last) / 1e3;
    this.tokens = Math.min(this.config.burst, this.tokens + elapsed * this.config.refillPerSecond);
    this.last = Math.max(this.last, now);
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
};

// src/server/hub.ts
var PING = '{"t":"ping"}';
var PONG = '{"t":"pong"}';
var MAX_BYTES = { audience: 4 * 1024, deck: 32 * 1024 };
var BROADCAST_INTERVAL_MS = 200;
var CLOSE_VERSION = 4e3;
var encoder2 = new TextEncoder();
function byteLength(s) {
  return s.length * 3 <= MAX_BYTES.audience ? s.length : encoder2.encode(s).length;
}
var Hub = class {
  constructor(room, host) {
    this.room = room;
    this.host = host;
  }
  buckets = /* @__PURE__ */ new WeakMap();
  scheduled = false;
  lastFlush = Number.NEGATIVE_INFINITY;
  dirtyRoom = false;
  dirtyMineAll = false;
  /** Last broadcast payloads, so unchanged states are not re-sent. */
  sent = {};
  /** voter → their audience sockets, so `you` doesn't scan every socket. Built on first use. */
  byVoter = null;
  /** Handle one incoming frame. */
  message(peer, data) {
    if (typeof data !== "string") return this.error(peer, "bad-message", "binary frames are not supported");
    if (data === PING) return this.send(peer, PONG);
    const info = this.host.info(peer);
    const role = info?.role ?? "audience";
    if (data.length > MAX_BYTES[role] || byteLength(data) > MAX_BYTES[role]) {
      return this.error(peer, "bad-message", `messages are limited to ${MAX_BYTES[role]} bytes`);
    }
    if (role !== "deck") {
      let bucket = this.buckets.get(peer);
      if (!bucket) this.buckets.set(peer, bucket = new TokenBucket(AUDIENCE_LIMIT, this.host.now()));
      if (!bucket.take(this.host.now())) return this.error(peer, "limit", "too many messages; slow down");
    }
    const parsed = parseMessage(data);
    if (!parsed.ok) return this.error(peer, "bad-message", parsed.message);
    const msg = parsed.msg;
    if (msg.t === "ping") return this.send(peer, PONG);
    if (msg.t === "hello") {
      if (info) return this.error(peer, "bad-message", "hello was already sent on this socket");
      if (msg.v !== PROTOCOL_VERSION) {
        this.error(peer, "version", `server speaks protocol version ${PROTOCOL_VERSION}`);
        try {
          this.host.close(peer, CLOSE_VERSION, "unsupported protocol version");
        } catch {
        }
        return;
      }
      const presenter = msg.role === "deck" && keyMatches(msg.key, this.host.presenterKey);
      const next = { role: msg.role, voter: msg.voter, presenter };
      this.host.setInfo(peer, next);
      if (next.role === "audience") this.addVoter(peer, next.voter);
      this.send(peer, JSON.stringify({ t: "welcome", v: PROTOCOL_VERSION, presenter }));
      if (next.role === "deck") {
        this.send(peer, this.deckPayload(presenter, this.audienceCount()));
      } else {
        this.send(peer, this.audiencePayload());
        this.send(peer, this.minePayload(next.voter));
        this.schedule();
      }
      return;
    }
    if (!info) return this.error(peer, "not-hello", "send hello first");
    const outcome = this.room.apply(info, msg);
    if (!outcome.ok) return this.error(peer, outcome.code, outcome.message);
    if (outcome.mineChanged && info.role === "audience") this.sendMine(info.voter);
    if (outcome.allMineChanged) this.dirtyMineAll = true;
    if (outcome.changed) {
      this.dirtyRoom = true;
      this.schedule();
    }
  }
  /** A socket closed. Decks get a new audience count. */
  disconnected(peer) {
    const info = this.host.info(peer);
    if (info?.role !== "audience") return;
    const sockets = this.byVoter?.get(info.voter);
    if (sockets?.delete(peer) && sockets.size === 0) this.byVoter.delete(info.voter);
    this.schedule();
  }
  /** Broadcast changed states and persist. Normally called by the scheduler. */
  flush() {
    this.scheduled = false;
    this.lastFlush = this.host.now();
    if (this.dirtyRoom) {
      this.dirtyRoom = false;
      this.host.persist(this.room);
    }
    const decks = [];
    const phones = [];
    for (const peer of this.host.peers()) {
      const info = this.host.info(peer);
      if (info?.role === "deck") decks.push([peer, info]);
      else if (info?.role === "audience") phones.push([peer, info]);
    }
    const viewer = this.deckPayload(false, phones.length);
    const presenter = this.deckPayload(true, phones.length);
    const audience = this.audiencePayload();
    const sendDeck = viewer !== this.sent.deck;
    const sendPresenter = presenter !== this.sent.presenter;
    const sendAudience = audience !== this.sent.audience;
    this.sent = { deck: viewer, presenter, audience };
    for (const [peer, info] of decks) {
      if (info.presenter ? sendPresenter : sendDeck) this.send(peer, info.presenter ? presenter : viewer);
    }
    const mine = /* @__PURE__ */ new Map();
    const sendMineAll = this.dirtyMineAll;
    this.dirtyMineAll = false;
    for (const [peer, info] of phones) {
      if (sendAudience) this.send(peer, audience);
      if (sendMineAll) {
        let payload = mine.get(info.voter);
        if (payload === void 0) mine.set(info.voter, payload = this.minePayload(info.voter));
        this.send(peer, payload);
      }
    }
  }
  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    const wait = Math.max(0, this.lastFlush + BROADCAST_INTERVAL_MS - this.host.now());
    this.host.schedule(() => this.flush(), wait);
  }
  audienceCount() {
    let n = 0;
    for (const peer of this.host.peers()) if (this.host.info(peer)?.role === "audience") n++;
    return n;
  }
  deckPayload(presenter, audience) {
    return JSON.stringify({ t: "deck", state: this.room.deckState(presenter, audience) });
  }
  audiencePayload() {
    return JSON.stringify({ t: "audience", state: this.room.audienceState() });
  }
  minePayload(voter) {
    return JSON.stringify({ t: "you", mine: this.room.mine(voter) });
  }
  sendMine(voter) {
    const sockets = this.voters().get(voter);
    if (!sockets) return;
    const payload = this.minePayload(voter);
    for (const peer of sockets) this.send(peer, payload);
  }
  /**
   * The voter index. Built from `peers()` the first time, because a Durable
   * Object waking from hibernation gets a new Hub with sockets that already
   * said hello; `hello` and `disconnected` keep it current after that.
   */
  voters() {
    if (!this.byVoter) {
      this.byVoter = /* @__PURE__ */ new Map();
      for (const peer of this.host.peers()) {
        const info = this.host.info(peer);
        if (info?.role === "audience") this.addVoter(peer, info.voter);
      }
    }
    return this.byVoter;
  }
  addVoter(peer, voter) {
    const index = this.voters();
    let sockets = index.get(voter);
    if (!sockets) index.set(voter, sockets = /* @__PURE__ */ new Set());
    sockets.add(peer);
  }
  error(peer, code, message) {
    this.send(peer, JSON.stringify({ t: "error", code, message }));
  }
  send(peer, data) {
    try {
      this.host.send(peer, data);
    } catch {
    }
  }
};

// src/shared/normalize.ts
var EDGE_CHARS = `.,;:!?"'()[]{}\u2026\u201C\u201D\u2018\u2019\u201E\u201A\xAB\xBB\u2039\u203A`;
var EDGE = new RegExp(
  `^[\\s${escapeClass(EDGE_CHARS)}]+|[\\s${escapeClass(EDGE_CHARS)}]+$`,
  "gu"
);
var INVISIBLE = /[\p{Cc}​‌⁠﻿]/gu;
var WHITESPACE = /\s+/gu;
function escapeClass(chars) {
  return chars.replace(/[\\\]\[^-]/g, "\\$&");
}
function strip(text) {
  return text.replace(INVISIBLE, "").replace(WHITESPACE, " ").replace(EDGE, "");
}
function normalizeAnswer(raw2, maxWords) {
  let text = strip(raw2.normalize("NFKC").replace(WHITESPACE, " "));
  if (!text) return null;
  text = text.split(" ").slice(0, Math.max(1, maxWords)).join(" ");
  const chars = Array.from(text);
  if (chars.length > LIMITS.answerChars) text = chars.slice(0, LIMITS.answerChars).join("");
  text = strip(text);
  if (!text) return null;
  return { text, key: text.toLowerCase() };
}

// src/server/room.ts
var ok = (changed, mineChanged = false, allMineChanged = false) => ({
  ok: true,
  changed,
  mineChanged,
  allMineChanged
});
var fail = (code, message) => ({ ok: false, code, message });
var PRESENTER_ONLY = /* @__PURE__ */ new Set(["open", "close", "reveal", "reset", "hide"]);
function sameQuestion(a, b) {
  if (a.type !== b.type || a.id !== b.id || a.prompt !== b.prompt) return false;
  if (a.type === "poll" && b.type === "poll") {
    return a.options.length === b.options.length && a.options.every((o, i) => o === b.options[i]) && a.confidence === b.confidence && JSON.stringify(a.revision) === JSON.stringify(b.revision);
  }
  if (a.type === "wordcloud" && b.type === "wordcloud") {
    return a.maxWords === b.maxWords && a.maxAnswers === b.maxAnswers;
  }
  if (a.type === "likert" && b.type === "likert") {
    return a.numeric === b.numeric && sameStrings(a.statements, b.statements) && sameStrings(a.labels, b.labels) && (a.anchors === null ? b.anchors === null : b.anchors !== null && sameStrings(a.anchors, b.anchors));
  }
  return false;
}
function sameStrings(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
function newEntry(question) {
  return {
    question,
    status: "open",
    revealed: null,
    votes: /* @__PURE__ */ new Map(),
    confidence: /* @__PURE__ */ new Map(),
    answers: /* @__PURE__ */ new Map(),
    ratings: /* @__PURE__ */ new Map(),
    display: /* @__PURE__ */ new Map(),
    hidden: /* @__PURE__ */ new Map()
  };
}
function clearResults(e) {
  e.revealed = null;
  e.votes.clear();
  e.confidence.clear();
  e.answers.clear();
  e.ratings.clear();
  e.display.clear();
  e.hidden.clear();
}
var Room = class _Room {
  session;
  live = null;
  questions = /* @__PURE__ */ new Map();
  /** Change tracking for `takeChanges()`. */
  dirty = /* @__PURE__ */ new Set();
  indexDirty = false;
  stored = /* @__PURE__ */ new Set();
  constructor(session) {
    this.session = session;
  }
  /** An empty room for `session`. */
  static create(session) {
    return new _Room(session);
  }
  /**
   * Rebuild a room from `dump()` output. Tolerates missing or malformed data
   * (skipping bad entries) so a damaged file never takes a session down.
   */
  static restore(session, data) {
    const room = new _Room(session);
    if (!data || typeof data !== "object") return room;
    const d = data;
    for (const q of Array.isArray(d.questions) ? d.questions : []) {
      const question = validateQuestion(q?.question);
      if (typeof question === "string") continue;
      const e = newEntry(question);
      e.status = q.status === "closed" ? "closed" : "open";
      if (question.type === "poll") {
        const n = question.options.length;
        if (Array.isArray(q.revealed)) {
          e.revealed = q.revealed.filter((i) => Number.isInteger(i) && i >= 0 && i < n);
        }
        for (const [voter, choice] of pairs(q.votes)) {
          if (typeof voter === "string" && typeof choice === "number" && Number.isInteger(choice) && choice >= 0 && choice < n) {
            e.votes.set(voter, choice);
            e.confidence.delete(voter);
          }
        }
        if (question.confidence) for (const [voter, choice] of pairs(q.confidence)) {
          if (typeof voter === "string" && e.votes.has(voter) && Number.isInteger(choice) && Number(choice) >= 0 && Number(choice) <= 2)
            e.confidence.set(voter, choice);
        }
      } else if (question.type === "likert") {
        const n = question.labels.length;
        const valid = (r) => r === null || typeof r === "number" && Number.isInteger(r) && r >= 0 && r < n;
        for (const [voter, list] of pairs(q.ratings)) {
          if (typeof voter !== "string" || !Array.isArray(list) || list.length !== question.statements.length) continue;
          if (!list.every(valid) || list.every((r) => r === null)) continue;
          e.ratings.set(voter, list);
        }
      } else {
        for (const [key, text] of pairs(q.display)) {
          if (typeof key === "string" && typeof text === "string") e.display.set(key, text);
        }
        for (const [key, text] of pairs(q.hidden)) {
          if (typeof key === "string" && typeof text === "string") e.hidden.set(key, text);
        }
        for (const [voter, list] of pairs(q.answers)) {
          if (typeof voter !== "string" || !Array.isArray(list)) continue;
          const answers = list.filter((a) => typeof a?.key === "string" && typeof a?.text === "string").slice(0, question.maxAnswers);
          if (answers.length) e.answers.set(voter, answers);
          for (const a of answers) if (!e.display.has(a.key)) e.display.set(a.key, a.text);
        }
      }
      room.questions.set(question.id, e);
    }
    if (typeof d.live === "string" && room.questions.has(d.live)) room.live = d.live;
    room.stored = new Set(room.questions.keys());
    return room;
  }
  /** Serialize for storage. `Room.restore(session, room.dump())` round-trips. */
  dump() {
    return {
      v: 1,
      session: this.session,
      live: this.live,
      questions: [...this.questions.values()].map(dumpEntry)
    };
  }
  /**
   * The changes since the last call (or since `restore`/`create`), then
   * forget them. Only an adapter that stores questions separately calls it.
   */
  takeChanges() {
    const questions = [];
    for (const id of this.dirty) {
      const e = this.questions.get(id);
      if (e) questions.push(dumpEntry(e));
    }
    const removed = [...this.stored].filter((id) => !this.questions.has(id));
    const index = this.indexDirty ? { live: this.live, order: [...this.questions.keys()] } : null;
    this.dirty.clear();
    this.indexDirty = false;
    this.stored = new Set(this.questions.keys());
    return { index, questions, removed };
  }
  /** Apply one validated message from `sender`. Never throws. */
  apply(sender, msg) {
    if (PRESENTER_ONLY.has(msg.t)) {
      if (!sender.presenter || sender.role !== "deck") {
        return fail("forbidden", `'${msg.t}' requires the presenter key`);
      }
    } else if (sender.role !== "audience") {
      return fail("forbidden", `'${msg.t}' is for audience sockets only`);
    }
    const previousLive = this.live;
    const outcome = this.dispatch(sender, msg);
    if (outcome.ok && outcome.changed) this.track(msg, previousLive);
    return outcome;
  }
  /** Record which stored parts a change touched. */
  track(msg, previousLive) {
    if (msg.t === "open") {
      this.dirty.add(msg.question.id);
      if (previousLive !== null) this.dirty.add(previousLive);
      this.indexDirty = true;
    } else if (msg.id === void 0) {
      this.dirty.clear();
      this.indexDirty = true;
    } else {
      this.dirty.add(msg.id);
    }
  }
  dispatch(sender, msg) {
    switch (msg.t) {
      case "open":
        return this.open(msg.question);
      case "close":
        return this.close(msg.id);
      case "reveal":
        return this.reveal(msg.id, msg.correct);
      case "reset":
        return this.reset(msg.id);
      case "hide":
        return this.hide(msg.id, msg.text, msg.hidden);
      case "confidence":
        return this.confidence(sender.voter, msg.id, msg.choice);
      case "vote":
        return this.vote(sender.voter, msg.id, msg.choice);
      case "answer":
        return this.answer(sender.voter, msg.id, msg.text);
      case "rate":
        return this.rate(sender.voter, msg.id, msg.statement, msg.choice);
    }
  }
  open(question) {
    const existing = this.questions.get(question.id);
    let changed = false;
    let cleared = false;
    if (!existing) {
      this.questions.set(question.id, newEntry(question));
      changed = true;
    } else if (!sameQuestion(existing.question, question)) {
      cleared = hasResponses(existing);
      clearResults(existing);
      existing.question = question;
      changed = true;
    }
    const entry = this.questions.get(question.id);
    if (this.live !== null && this.live !== question.id) {
      const previous = this.questions.get(this.live);
      if (previous && previous.status === "open") previous.status = "closed";
      changed = true;
    }
    const nextStatus = entry.revealed !== null ? "closed" : "open";
    if (entry.status !== nextStatus || this.live !== question.id) changed = true;
    entry.status = nextStatus;
    this.live = question.id;
    return ok(changed, cleared, cleared);
  }
  close(id) {
    const e = this.questions.get(id);
    if (!e) return fail("unknown-question", `no question '${id}'`);
    if (e.status === "closed") return ok(false);
    e.status = "closed";
    return ok(true);
  }
  reveal(id, correct) {
    const e = this.questions.get(id);
    if (!e) return fail("unknown-question", `no question '${id}'`);
    if (e.question.type !== "poll") return fail("bad-message", "only polls can be revealed");
    const n = e.question.options.length;
    if (correct.some((i) => i < 0 || i >= n)) return fail("bad-message", "correct index out of range");
    const revealed = [...new Set(correct)].sort((a, b) => a - b);
    const same = e.status === "closed" && e.revealed !== null && e.revealed.length === revealed.length && e.revealed.every((v, i) => v === revealed[i]);
    e.revealed = revealed;
    e.status = "closed";
    return ok(!same, false, !same);
  }
  reset(id) {
    if (id === void 0) {
      const changed = this.questions.size > 0 || this.live !== null;
      this.questions.clear();
      this.live = null;
      return ok(changed, changed, changed);
    }
    const e = this.questions.get(id);
    if (!e) return fail("unknown-question", `no question '${id}'`);
    const hadVotes = hasResponses(e);
    clearResults(e);
    return ok(true, hadVotes, hadVotes);
  }
  hide(id, text, hidden) {
    const e = this.questions.get(id);
    if (!e) return fail("unknown-question", `no question '${id}'`);
    if (e.question.type !== "wordcloud") return fail("bad-message", "only word-cloud entries can be hidden");
    const n = normalizeAnswer(text, e.question.maxWords);
    if (!n) return fail("bad-message", "empty text");
    if (hidden) {
      if (e.hidden.has(n.key)) return ok(false);
      e.hidden.set(n.key, e.display.get(n.key) ?? n.text);
    } else if (!e.hidden.delete(n.key)) {
      return ok(false);
    }
    return ok(true);
  }
  /** The live, open entry `id`, or the error to send. */
  votable(id) {
    const e = this.questions.get(id);
    if (!e) return fail("unknown-question", `no question '${id}'`);
    if (this.live !== id || e.status !== "open") return fail("closed", "voting is closed for this question");
    return e;
  }
  vote(voter, id, choice) {
    const e = this.votable(id);
    if (!("question" in e)) return e;
    if (e.question.type !== "poll") return fail("bad-message", "not a poll");
    if (choice < 0 || choice >= e.question.options.length) return fail("bad-message", "choice out of range");
    if (e.votes.get(voter) === choice) return ok(false);
    e.votes.set(voter, choice);
    e.confidence.delete(voter);
    return ok(true, true);
  }
  confidence(voter, id, choice) {
    const e = this.votable(id);
    if (!("question" in e)) return e;
    if (e.question.type !== "poll" || !e.question.confidence) return fail("bad-message", "confidence is not enabled");
    if (!e.votes.has(voter)) return fail("bad-message", "choose an answer first");
    if (![0, 1, 2].includes(choice)) return fail("bad-message", "invalid confidence");
    if (e.confidence.get(voter) === choice) return ok(false);
    e.confidence.set(voter, choice);
    return ok(true, true);
  }
  answer(voter, id, text) {
    const e = this.votable(id);
    if (!("question" in e)) return e;
    if (e.question.type !== "wordcloud") return fail("bad-message", "not a word cloud");
    const n = normalizeAnswer(text, e.question.maxWords);
    if (!n) return fail("bad-message", "empty answer");
    const mine = e.answers.get(voter) ?? [];
    if (mine.some((a) => a.key === n.key)) return ok(false);
    if (mine.length >= e.question.maxAnswers) {
      return fail("limit", `at most ${e.question.maxAnswers} answers per person`);
    }
    mine.push(n);
    e.answers.set(voter, mine);
    if (!e.display.has(n.key)) e.display.set(n.key, n.text);
    return ok(true, true);
  }
  rate(voter, id, statement, choice) {
    const e = this.votable(id);
    if (!("question" in e)) return e;
    if (e.question.type !== "likert") return fail("bad-message", "not a rating scale");
    const q = e.question;
    if (statement < 0 || statement >= q.statements.length) return fail("bad-message", "statement out of range");
    if (choice < 0 || choice >= q.labels.length) return fail("bad-message", "choice out of range");
    const mine = e.ratings.get(voter) ?? q.statements.map(() => null);
    if (mine[statement] === choice) return ok(false);
    mine[statement] = choice;
    e.ratings.set(voter, mine);
    return ok(true, true);
  }
  results(e, presenter) {
    const q = e.question;
    if (q.type === "poll") {
      const counts = q.options.map(() => 0);
      for (const choice of e.votes.values()) counts[choice] = (counts[choice] ?? 0) + 1;
      const r = { type: "poll", counts, voters: e.votes.size };
      if (q.confidence) {
        const c = [0, 0, 0];
        let wrong = 0;
        for (const [voter, confidence] of e.confidence) {
          c[confidence]++;
          if (confidence === 2 && e.revealed !== null && !e.revealed.includes(e.votes.get(voter))) wrong++;
        }
        r.confidence = { counts: c, answered: e.confidence.size, confidentlyIncorrect: e.revealed === null ? null : wrong };
      }
      return r;
    }
    if (q.type === "likert") {
      const counts = q.statements.map(() => q.labels.map(() => 0));
      for (const list of e.ratings.values()) {
        list.forEach((choice, s) => {
          if (choice !== null) counts[s][choice]++;
        });
      }
      return { type: "likert", counts, voters: e.ratings.size };
    }
    const tally = /* @__PURE__ */ new Map();
    for (const list of e.answers.values()) {
      for (const a of list) tally.set(a.key, (tally.get(a.key) ?? 0) + 1);
    }
    const order2 = [...e.display.keys()];
    const rank = new Map(order2.map((k, i) => [k, i]));
    const words = [...tally].filter(([key]) => !e.hidden.has(key)).sort(([ka, a], [kb, b]) => b - a || (rank.get(ka) ?? 0) - (rank.get(kb) ?? 0)).slice(0, LIMITS.cloudWords).map(([key, count]) => ({ text: e.display.get(key) ?? key, count }));
    const results = { type: "wordcloud", words, voters: e.answers.size };
    if (presenter) results.hidden = [...e.hidden.values()];
    return results;
  }
  questionState(e, presenter) {
    return {
      question: e.question,
      status: e.status,
      results: this.results(e, presenter),
      revealed: e.revealed
    };
  }
  /** The `deck` payload. Only the presenter variant includes hidden words. */
  deckState(presenter, audience) {
    const questions = {};
    for (const [id, e] of this.questions) questions[id] = this.questionState(e, presenter);
    return { session: this.session, live: this.live, questions, audience };
  }
  /**
   * The `audience` payload: only the live question. Results and the revealed
   * answer are withheld while it is open.
   */
  audienceState() {
    const e = this.live === null ? void 0 : this.questions.get(this.live);
    if (!e) return { session: this.session, live: null };
    const open = e.status === "open";
    return {
      session: this.session,
      live: {
        question: e.question,
        status: e.status,
        results: open ? null : this.results(e, false),
        revealed: open ? null : e.revealed
      }
    };
  }
  /** One voter's own votes and answers across the session. */
  mine(voter) {
    const mine = { votes: {}, answers: {}, ratings: {} };
    for (const [id, e] of this.questions) {
      const vote = e.votes.get(voter);
      if (vote !== void 0) mine.votes[id] = vote;
      const answers = e.answers.get(voter);
      if (answers?.length) mine.answers[id] = answers.map((a) => a.text);
      const ratings = e.ratings.get(voter);
      if (ratings) mine.ratings[id] = [...ratings];
    }
    const confidence = {};
    const review = [];
    for (const [id, e] of this.questions) {
      const c = e.confidence.get(voter);
      if (c !== void 0) confidence[id] = c;
      if (e.question.type === "poll" && e.question.revision && e.revealed !== null) {
        const choice = e.votes.get(voter) ?? null;
        review.push({
          id,
          prompt: e.question.prompt,
          revision: e.question.revision,
          choice,
          correct: choice !== null && e.revealed.includes(choice),
          confidence: c ?? null
        });
      }
    }
    if (Object.keys(confidence).length) mine.confidence = confidence;
    if (review.length) mine.review = review;
    return mine;
  }
  /** Full state for `GET /api/s/:session/export`. */
  export() {
    const { session, live, questions } = this.deckState(true, 0);
    return { session, live, questions };
  }
};
function dumpEntry(e) {
  return {
    question: e.question,
    status: e.status,
    revealed: e.revealed,
    votes: [...e.votes],
    ...e.confidence.size ? { confidence: [...e.confidence] } : {},
    answers: [...e.answers],
    ratings: [...e.ratings],
    display: [...e.display],
    hidden: [...e.hidden]
  };
}
function hasResponses(e) {
  return e.votes.size > 0 || e.answers.size > 0 || e.ratings.size > 0;
}
function pairs(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((p) => Array.isArray(p) && p.length === 2);
}

// src/server/cloudflare/worker.ts
var SESSION_HEADER = "x-live-questions-session";
var INDEX_KEY = "index";
var QUESTION_PREFIX = "q:";
var LEGACY_KEY = "room";
var MAX_KEYS = 128;
var questionKey = (id) => QUESTION_PREFIX + id;
function chunks(items) {
  const out = [];
  for (let i = 0; i < items.length; i += MAX_KEYS) out.push(items.slice(i, i + MAX_KEYS));
  return out;
}
function toRoom(env, session, path, init) {
  const headers = new Headers(init?.headers);
  headers.set(SESSION_HEADER, session);
  return env.ROOMS.getByName(session).fetch(new Request(`https://room${path}`, { ...init, headers }));
}
var app = createApp({
  presenterKey: (c) => c.env.PRESENTER_KEY || void 0,
  socket: (c, session) => toRoom(c.env, session, "/ws", { headers: c.req.raw.headers }),
  exportRoom: async (c, session) => (await toRoom(c.env, session, "/export")).json(),
  asset: (c, path) => c.env.ASSETS.fetch(new URL(path, c.req.url))
});
var worker_default = {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx)
};
var SessionRoom = class extends DurableObject {
  /** What `load` read, for `Room.restore`. */
  stored;
  hub;
  /** Decoded attachments, so broadcasts don't deserialize every socket each time. */
  attachments = /* @__PURE__ */ new Map();
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
    void ctx.blockConcurrencyWhile(async () => {
      this.stored = await this.load();
    });
  }
  /** Read the room in the shape `Room.restore` accepts, migrating the legacy layout. */
  async load() {
    const storage = this.ctx.storage;
    const index = await storage.get(INDEX_KEY);
    if (index) {
      const stored = await storage.list({ prefix: QUESTION_PREFIX });
      const order2 = Array.isArray(index.order) ? index.order : [];
      return { live: index.live, questions: order2.map((id) => stored.get(questionKey(id))) };
    }
    const legacy = await storage.get(LEGACY_KEY);
    if (legacy) await this.migrate(legacy);
    return legacy;
  }
  /** Rewrite a legacy whole-room value as index plus questions. */
  async migrate(legacy) {
    const questions = Array.isArray(legacy.questions) ? legacy.questions : [];
    const entries = [];
    const order2 = [];
    for (const q of questions) {
      const id = q?.question?.id;
      if (typeof id !== "string") continue;
      order2.push(id);
      entries.push([questionKey(id), q]);
    }
    const index = { v: 2, live: legacy.live ?? null, order: order2 };
    entries.push([INDEX_KEY, index]);
    const writes = chunks(entries).map((c) => this.ctx.storage.put(Object.fromEntries(c)));
    writes.push(this.ctx.storage.delete(LEGACY_KEY).then(() => void 0));
    await Promise.all(writes);
  }
  get presenterKey() {
    return this.env.PRESENTER_KEY || void 0;
  }
  hubFor(session) {
    this.hub ??= new Hub(Room.restore(session, this.stored), this);
    return this.hub;
  }
  async fetch(request) {
    const session = request.headers.get(SESSION_HEADER);
    if (!isSession(session)) return new Response("missing session", { status: 400 });
    const { pathname } = new URL(request.url);
    if (pathname === "/export") return Response.json(this.hubFor(session).room.export());
    if (pathname !== "/ws" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("not found", { status: 404 });
    }
    if (!this.presenterKey && !this.hub) console.warn("live-questions: PRESENTER_KEY is not set, so nobody can present.");
    this.hubFor(session);
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    this.setAttachment(server, { session, info: null });
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, message) {
    const a = this.attachment(ws);
    if (a) this.hubFor(a.session).message(ws, message);
  }
  webSocketClose(ws, code, reason) {
    this.closed(ws);
    try {
      ws.close(code, reason);
    } catch {
    }
  }
  webSocketError(ws) {
    this.closed(ws);
  }
  closed(ws) {
    const a = this.attachment(ws);
    if (a) this.hubFor(a.session).disconnected(ws);
    this.attachments.delete(ws);
  }
  attachment(ws) {
    let a = this.attachments.get(ws);
    if (!a) {
      const raw2 = ws.deserializeAttachment();
      if (!raw2 || !isSession(raw2.session)) return null;
      a = raw2;
      this.attachments.set(ws, a);
    }
    return a;
  }
  setAttachment(ws, a) {
    ws.serializeAttachment(a);
    this.attachments.set(ws, a);
  }
  // HubHost
  peers() {
    return this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.OPEN);
  }
  info(ws) {
    return this.attachment(ws)?.info ?? null;
  }
  setInfo(ws, info) {
    const a = this.attachment(ws);
    if (a) this.setAttachment(ws, { ...a, info });
  }
  send(ws, data) {
    ws.send(data);
  }
  close(ws, code, reason) {
    ws.close(code, reason);
  }
  persist(room) {
    const { index, questions, removed } = room.takeChanges();
    const entries = questions.map((q) => [questionKey(q.question.id), q]);
    if (index) entries.push([INDEX_KEY, { v: 2, ...index }]);
    const storage = this.ctx.storage;
    const writes = chunks(entries).map((c) => storage.put(Object.fromEntries(c)));
    for (const keys of chunks(removed.map(questionKey))) writes.push(storage.delete(keys));
    Promise.all(writes).catch((err) => {
      console.error(`live-questions: failed to save session ${room.session}:`, err);
    });
  }
  schedule(fn, ms) {
    setTimeout(fn, ms);
  }
  now() {
    return Date.now();
  }
};
export {
  SessionRoom,
  worker_default as default
};

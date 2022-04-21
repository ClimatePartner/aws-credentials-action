var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// node_modules/wildcard-match/build/index.es.mjs
function escapeRegExpChar(char) {
  if (char === "-" || char === "^" || char === "$" || char === "+" || char === "." || char === "(" || char === ")" || char === "|" || char === "[" || char === "]" || char === "{" || char === "}" || char === "*" || char === "?" || char === "\\") {
    return "\\" + char;
  } else {
    return char;
  }
}
function escapeRegExpString(str) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    result += escapeRegExpChar(str[i]);
  }
  return result;
}
function transform(pattern, separator) {
  if (separator === void 0) {
    separator = true;
  }
  if (Array.isArray(pattern)) {
    var regExpPatterns = pattern.map(function(p) {
      return "^" + transform(p, separator) + "$";
    });
    return "(?:" + regExpPatterns.join("|") + ")";
  }
  var separatorSplitter = "";
  var separatorMatcher = "";
  var wildcard = ".";
  if (separator === true) {
    separatorSplitter = "/";
    separatorMatcher = "[/\\\\]";
    wildcard = "[^/\\\\]";
  } else if (separator) {
    separatorSplitter = separator;
    separatorMatcher = escapeRegExpString(separatorSplitter);
    if (separatorMatcher.length > 1) {
      separatorMatcher = "(?:" + separatorMatcher + ")";
      wildcard = "((?!" + separatorMatcher + ").)";
    } else {
      wildcard = "[^" + separatorMatcher + "]";
    }
  }
  var requiredSeparator = separator ? separatorMatcher + "+?" : "";
  var optionalSeparator = separator ? separatorMatcher + "*?" : "";
  var segments = separator ? pattern.split(separatorSplitter) : [pattern];
  var result = "";
  for (var s = 0; s < segments.length; s++) {
    var segment = segments[s];
    var nextSegment = segments[s + 1];
    var currentSeparator = "";
    if (!segment && s > 0) {
      continue;
    }
    if (separator) {
      if (s === segments.length - 1) {
        currentSeparator = optionalSeparator;
      } else if (nextSegment !== "**") {
        currentSeparator = requiredSeparator;
      } else {
        currentSeparator = "";
      }
    }
    if (separator && segment === "**") {
      if (currentSeparator) {
        result += s === 0 ? "" : currentSeparator;
        result += "(?:" + wildcard + "*?" + currentSeparator + ")*?";
      }
      continue;
    }
    for (var c = 0; c < segment.length; c++) {
      var char = segment[c];
      if (char === "\\") {
        if (c < segment.length - 1) {
          result += escapeRegExpChar(segment[c + 1]);
          c++;
        }
      } else if (char === "?") {
        result += wildcard;
      } else if (char === "*") {
        result += wildcard + "*?";
      } else {
        result += escapeRegExpChar(char);
      }
    }
    result += currentSeparator;
  }
  return result;
}
function isMatch(regexp, sample) {
  if (typeof sample !== "string") {
    throw new TypeError("Sample must be a string, but " + typeof sample + " given");
  }
  return regexp.test(sample);
}
function wildcardMatch(pattern, options) {
  if (typeof pattern !== "string" && !Array.isArray(pattern)) {
    throw new TypeError("The first argument must be a single pattern string or an array of patterns, but " + typeof pattern + " given");
  }
  if (typeof options === "string" || typeof options === "boolean") {
    options = { separator: options };
  }
  if (arguments.length === 2 && !(typeof options === "undefined" || typeof options === "object" && options !== null && !Array.isArray(options))) {
    throw new TypeError("The second argument must be an options object or a string/boolean separator, but " + typeof options + " given");
  }
  options = options || {};
  if (options.separator === "\\") {
    throw new Error("\\ is not a valid separator because it is used for escaping. Try setting the separator to `true` instead");
  }
  var regexpPattern = transform(pattern, options.separator);
  var regexp = new RegExp("^" + regexpPattern + "$", options.flags);
  var fn = isMatch.bind(null, regexp);
  fn.options = options;
  fn.pattern = pattern;
  fn.regexp = regexp;
  return fn;
}
var index_es_default = wildcardMatch;

// a.ts
var getRepositoryMappings = () => ({
  pipeline: {
    crossAccountRole: "arn:aws:iam::686887603722:role/gh-cross-account_climate-service_pipeline",
    refs: ["feature/refactor-auth-and-pipeline"],
    roles: {
      build: "arn:aws:iam::100422486906:role/gh-pipeline_climate-service_pipeline",
      staging: "arn:aws:iam::761049481526:role/gh-pipeline_climate-service_pipeline"
    }
  }
});
var context = {
  ref: "feature/refactor-auth-and-pipeline"
};
var mappings = Object.entries(getRepositoryMappings()).reduce((acc, [mappingName, mapping]) => mapping.refs.some((pattern) => index_es_default(pattern, { separator: false })(context.ref)) ? __spreadProps(__spreadValues({}, acc), { [mappingName]: mapping }) : acc, {});
console.log(mappings);

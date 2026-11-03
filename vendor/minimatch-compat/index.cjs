// Legacy ESLint plugins call the CommonJS export as a function. Delegate all
// matching to the patched implementation while retaining that public API.
const modern = require("minimatch-modern");
module.exports = Object.assign(
  (path, pattern, options) => modern.minimatch(path, pattern, options),
  modern,
);

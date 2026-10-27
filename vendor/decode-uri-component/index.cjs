// Preserve query-string 7's CommonJS function contract while using the maintained decoder.
const decoder = require("safe-uri-decoder");
module.exports = decoder.default || decoder;

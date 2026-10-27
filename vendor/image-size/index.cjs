// Metro 0.83 uses the v1 filename/Buffer API; the maintained v2 parser accepts bytes only.
const fs = require("node:fs");
const parser = require("safe-image-size");
let disableFilesystem = false;
function imageSize(input, callback) {
  if (typeof input === "string") {
    if (disableFilesystem) throw new TypeError("Filesystem access disabled");
    if (typeof callback === "function") {
      fs.readFile(input, (error, bytes) => {
        if (error) return callback(error);
        let dimensions;
        try { dimensions = parser.imageSize(bytes); } catch (error) { return callback(error); }
        callback(null, dimensions);
      });
      return;
    }
    input = fs.readFileSync(input);
  }
  return parser.imageSize(input);
}
imageSize.imageSize = imageSize;
imageSize.default = imageSize;
imageSize.types = parser.types;
imageSize.disableTypes = parser.disableTypes;
imageSize.disableFS = (value) => { disableFilesystem = Boolean(value); };
module.exports = imageSize;

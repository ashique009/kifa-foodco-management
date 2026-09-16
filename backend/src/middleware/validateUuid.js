const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value) => {
  if (typeof value !== "string") return false;
  return UUID_REGEX.test(value.trim());
};

const validateUuidParam = (...paramNames) => {
  return (req, res, next) => {
    for (const name of paramNames) {
      const val = req.params[name];
      if (val !== undefined && val !== null) {
        if (!isValidUuid(val)) {
          return res.status(400).json({
            message: `Invalid UUID format for parameter '${name}'`,
            parameter: name,
            value: val,
          });
        }
      }
    }
    next();
  };
};

module.exports = {
  isValidUuid,
  validateUuidParam,
};

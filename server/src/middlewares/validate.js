import ApiError from '../utils/ApiError.js';

export const validate = (schema) => {
  return (req, res, next) => {
    const schemaKeys = Object.keys(schema.describe().keys || {});
    const dataToValidate = {};
    if (schemaKeys.includes('body')) dataToValidate.body = req.body;
    if (schemaKeys.includes('query')) dataToValidate.query = req.query;
    if (schemaKeys.includes('params')) dataToValidate.params = req.params;

    const { error, value } = schema.validate(dataToValidate, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path[detail.path.length - 1],
        message: detail.message.replace(/"/g, ''),
      }));
      return next(new ApiError(400, 'Validation failed', errors));
    }

    // Replace req properties with validated values
    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;

    next();
  };
};
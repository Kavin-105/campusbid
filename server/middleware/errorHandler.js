const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode
    || (err.name === 'ValidationError' || err.name === 'CastError' || err.name === 'MulterError' ? 400 : 500);
  const resolvedStatus = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.code === 11000 ? 409 : statusCode;
  const message = err.message || 'Something went wrong';
  console.error(err);
  res.status(resolvedStatus).json({ message });
};

module.exports = { errorHandler };

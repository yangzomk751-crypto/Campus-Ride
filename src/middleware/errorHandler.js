/**
 * Central Error Handling Middleware
 */

function notFoundHandler(req, res, next) {
  res.status(404).render('404', {
    title: '404 - Page Not Found',
    path: req.originalUrl,
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('SERVER ERROR:', err.stack || err);
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).render('500', {
    title: '500 - Server Error',
    error: isDev ? err : {},
    message: isDev ? err.message : 'An unexpected error occurred. Please try again later.',
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};

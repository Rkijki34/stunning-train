module.exports.requireLogin = function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
};
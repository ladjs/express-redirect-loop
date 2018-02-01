const deprecate = require('depd')('express');

module.exports = opts => {
  opts = Object.assign(
    {
      defaultPath: '/',
      maxRedirects: 5
    },
    opts
  );
  const { defaultPath, maxRedirects } = opts;
  return (req, res, next) => {
    if (!req.session)
      return next(new Error('Sessions required for `express-redirect-loop`'));

    const end = res.end;

    res.end = function(chunk, encoding) {
      if (!req.xhr) {
        req.session.prevPrevPath = req.session.prevPath;
        req.session.prevPath = req.path;
        // if it was a redirect then store how many times
        // so that we can limit the max number of redirects
        if ([301, 302].includes(res.statusCode))
          req.session.maxRedirects =
            typeof req.session.maxRedirects === 'number'
              ? req.session.maxRedirects + 1
              : 1;
        else req.session.maxRedirects = 0;
      }
      end.call(res, chunk, encoding);
    };

    const redirect = res.redirect;
    res.redirect = function(url) {
      let address = url;
      let status = 302;

      // allow status/url
      const args = [].slice.call(arguments);
      if (args.length === 2) {
        if (typeof args[0] === 'number') {
          status = args[0];
          address = args[1];
        } else {
          deprecate(
            'res.redirect(url, status): Use res.redirect(status, url) instead'
          );
          status = args[1];
        }
      }

      address = this.location(address).get('Location');

      req.prevPrevPath = req.session.prevPrevPath || defaultPath;
      req.prevPath = req.session.prevPath || defaultPath;
      req.maxRedirects = req.session.maxRedirects || 1;

      if (req.prevPath && address === req.prevPath) {
        address =
          req.prevPrevPath &&
          address !== req.prevPrevPath &&
          req.maxRedirects <= maxRedirects
            ? req.prevPrevPath
            : '/';
      }

      redirect.call(res, status, address);
    };
    next();
  };
};

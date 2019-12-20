const Url = require('url-parse');
const deprecate = require('depd')('express');

module.exports = opts => {
  opts = {
    defaultPath: '/',
    maxRedirects: 5,
    ...opts
  };
  const { defaultPath, maxRedirects } = opts;
  return (req, res, next) => {
    if (!req.session)
      return next(new Error('Sessions required for `express-redirect-loop`'));

    const { redirect, end } = res;

    res.end = function(chunk, encoding) {
      if (!req.xhr) {
        req.session.prevPrevPath = req.session.prevPath;
        req.session.prevPrevMethod = req.session.prevMethod;
        req.session.prevPath = req.originalUrl;
        req.session.prevMethod = req.method;
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

    res.redirect = function(url, ...args) {
      let address = url;
      let status = 302;

      // allow status/url
      args = [url].concat(args);
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
      req.prevPrevMethod = req.session.prevPrevMethod || 'GET';
      req.prevPath = req.session.prevPath || defaultPath;
      req.prevMethod = req.session.prevMethod || req.method;
      req.maxRedirects = req.session.maxRedirects || 1;

      if (
        req.prevPath &&
        address === req.prevPath &&
        req.method === req.prevMethod
      ) {
        if (
          req.prevPrevPath &&
          address !== req.prevPrevPath &&
          req.maxRedirects <= maxRedirects
        ) {
          address = req.prevPrevPath;
        } else {
          // if the prevPrevPath w/o querystring is !== prevPrevPath
          // then redirect then to prevPrevPath w/o querystring
          const { pathname } = new Url(req.prevPrevPath, {});
          if (pathname === req.prevPrevPath) address = '/';
          else address = pathname;
        }
      }

      redirect.call(res, status, address);
    };

    next();
  };
};

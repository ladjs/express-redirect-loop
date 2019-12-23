const Url = require('url-parse');
const deprecate = require('depd')('express');

module.exports = opts => {
  opts = {
    defaultPath: '/',
    maxRedirects: 5,
    ...opts
  };
  return (req, res, next) => {
    if (!req.session)
      return next(new Error('Sessions required for `express-redirect-loop`'));

    const { redirect, end } = res;

    res.end = function(chunk, encoding) {
      // instead of `!req.xhr` we need to use !accepts HTML
      // because Fetch does not provide XMLHttpRequest
      if (req.accepts('html')) {
        req.session.prevPrevPath = req.session.prevPath;
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

      const prevPrevPath = req.session.prevPrevPath || opts.defaultPath;
      const prevPath = req.session.prevPath || opts.defaultPath;
      const prevMethod = req.session.prevMethod || req.method;
      const maxRedirects = req.session.maxRedirects || 1;

      if (prevPath && address === prevPath && req.method === prevMethod) {
        if (
          prevPrevPath &&
          address !== prevPrevPath &&
          maxRedirects <= opts.maxRedirects
        ) {
          address = prevPrevPath;
        } else {
          // if the prevPrevPath w/o querystring is !== prevPrevPath
          // then redirect then to prevPrevPath w/o querystring
          const { pathname } = new Url(prevPrevPath, {});
          if (pathname === prevPrevPath) address = '/';
          else address = pathname;
        }
      } else if (maxRedirects > opts.maxRedirects) {
        address = opts.defaultPath;
      }

      redirect.call(res, status, address);
    };

    next();
  };
};

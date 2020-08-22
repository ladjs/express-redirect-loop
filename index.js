const Url = require('url-parse');
const deprecate = require('depd')('express');

module.exports = (options) => {
  options = {
    defaultPath: '/',
    maxRedirects: 5,
    ...options
  };
  return (request, res, next) => {
    if (!request.session)
      return next(new Error('Sessions required for `express-redirect-loop`'));

    const { redirect, end } = res;

    res.end = function (chunk, encoding) {
      // instead of `!req.xhr` we need to use !accepts HTML
      // because Fetch does not provide XMLHttpRequest
      if (request.accepts('html')) {
        request.session.prevPrevPath = request.session.prevPath;
        request.session.prevPath = request.originalUrl;
        request.session.prevMethod = request.method;
        // if it was a redirect then store how many times
        // so that we can limit the max number of redirects
        if ([301, 302].includes(res.statusCode))
          request.session.maxRedirects =
            typeof request.session.maxRedirects === 'number'
              ? request.session.maxRedirects + 1
              : 1;
        else request.session.maxRedirects = 0;
      }

      end.call(res, chunk, encoding);
    };

    res.redirect = function (url, ...args) {
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

      const previousPreviousPath =
        request.session.prevPrevPath || options.defaultPath;
      const previousPath = request.session.prevPath || options.defaultPath;
      const previousMethod = request.session.prevMethod || request.method;
      const maxRedirects = request.session.maxRedirects || 1;

      if (
        previousPath &&
        address === previousPath &&
        request.method === previousMethod
      ) {
        if (
          previousPreviousPath &&
          address !== previousPreviousPath &&
          maxRedirects <= options.maxRedirects
        ) {
          address = previousPreviousPath;
        } else {
          // if the prevPrevPath w/o querystring is !== prevPrevPath
          // then redirect then to prevPrevPath w/o querystring
          const { pathname } = new Url(previousPreviousPath, {});
          if (pathname === previousPreviousPath) address = '/';
          else address = pathname;
        }
      } else if (maxRedirects > options.maxRedirects) {
        address = options.defaultPath;
      }

      redirect.call(res, status, address);
    };

    next();
  };
};

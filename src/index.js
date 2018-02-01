const deprecate = require('depd')('express');

module.exports = (defaultPath = '/') => {
  return (req, res, next) => {
    if (!req.session)
      return next(new Error('Sessions required for `express-redirect-loop`'));

    const end = res.end;

    res.end = function(chunk, encoding) {
      req.session.prevPrevPath = req.session.prevPath;
      req.session.prevPath = req.path;
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

      if (req.prevPath && address === req.prevPath) {
        address =
          req.prevPrevPath && address !== req.prevPrevPath
            ? req.prevPrevPath
            : '/';
      }

      redirect.call(res, status, address);
    };
    next();
  };
};

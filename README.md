# express-redirect-loop

[![build status](https://img.shields.io/travis/niftylettuce/express-redirect-loop.svg)](https://travis-ci.org/niftylettuce/express-redirect-loop)
[![code coverage](https://img.shields.io/codecov/c/github/niftylettuce/express-redirect-loop.svg)](https://codecov.io/gh/niftylettuce/express-redirect-loop)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/niftylettuce/express-redirect-loop.svg)](LICENSE)

> Prevent redirect loops with sessions since HTTP referrer header is unreliable


## Table of Contents

* [Install](#install)
* [Usage](#usage)
* [Contributors](#contributors)
* [License](#license)


## Install

[npm][]:

```sh
npm install express-redirect-loop
```

[yarn][]:

```sh
yarn add express-redirect-loop
```


## Usage

```js
const express = require('express');
const session = require('express-session');
const redirectLoop = require('express-redirect-loop');

const app = express();

app.use(
  session({
    secret: 'test',
    resave: false,
    saveUninitialized: true
  })
);

app.use(redirectLoop({
  defaultPath: '/',
  maxRedirects: 5
}));

app.get('/', (req, res) => res.sendStatus(200));
app.get('/bar', (req, res) => res.redirect('/foo'));
app.get('/foo', (req, res) => res.redirect('/foo'));
app.get('/baz', (req, res) => res.redirect('/bar'));

app.listen(3000);
```


## Contributors

| Name           | Website                    |
| -------------- | -------------------------- |
| **Nick Baugh** | <http://niftylettuce.com/> |


## License

[MIT](LICENSE) © [Nick Baugh](http://niftylettuce.com/)


## 

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/

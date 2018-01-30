const test = require('ava');
const express = require('express');
const fetch = require('fetch-cookie/node-fetch')(require('node-fetch'));
const session = require('express-session');

const redirectLoop = require('../');

test.beforeEach(t => {
  const app = express();
  app.use(
    session({
      secret: 'test',
      resave: false,
      saveUninitialized: true
    })
  );
  app.use(redirectLoop());
  app.get('/', (req, res) => res.sendStatus(200));
  app.get('/bar', (req, res) => res.redirect('/foo'));
  app.get('/foo', (req, res) => res.redirect('/foo'));
  app.get('/baz', (req, res) => res.redirect('/bar'));
  const server = app.listen();
  t.context.url = `http://localhost:${server.address().port}/`;
});

test('/bar => /foo => /', async t => {
  const res = await fetch(`${t.context.url}bar`, { credentials: 'include' });
  t.is(res.url, t.context.url);
  t.is(res.status, 200);
  t.pass();
});

test('/foo => /', async t => {
  const res = await fetch(`${t.context.url}foo`, { credentials: 'include' });
  t.is(res.url, t.context.url);
  t.is(res.status, 200);
  t.pass();
});

test('/baz => /bar => /foo => /', async t => {
  const res = await fetch(`${t.context.url}baz`, { credentials: 'include' });
  t.is(res.url, t.context.url);
  t.is(res.status, 200);
  t.pass();
});

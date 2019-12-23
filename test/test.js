const Cabin = require('cabin');
const express = require('express');
const fetch = require('fetch-cookie/node-fetch')(require('node-fetch'));
const session = require('express-session');
const test = require('ava');

const redirectLoop = require('..');

const cabin = new Cabin();

test.beforeEach(t => {
  const app = express();
  app.use(
    session({
      secret: 'test',
      resave: false,
      saveUninitialized: true
    })
  );
  app.use(cabin.middleware);
  app.use(redirectLoop());
  app.get('/', (req, res) => res.sendStatus(200));
  app.get('/bar', (req, res) => res.redirect('/foo'));
  app.get('/foo', (req, res) => res.redirect('/foo'));
  app.get('/baz', (req, res) => res.redirect('/bar'));
  app.get('/beep', (req, res) => res.sendStatus(200));
  app.get('/boop', (req, res) => res.redirect('/boop'));
  app.get('/1', (req, res) => res.redirect('/2')); // 1
  app.get('/2', (req, res) => res.redirect('/3')); // 2
  app.get('/3', (req, res) => res.redirect('/4')); // 3
  app.get('/4', (req, res) => res.redirect('/5')); // 4
  app.get('/5', (req, res) => res.redirect('/6')); // 5
  app.get('/6', (req, res) => res.redirect('/7')); // 6 <-- redirects to /
  app.get('/7', (req, res) => res.redirect('/8'));
  app.get('/form', (req, res) => res.sendStatus(200));
  app.post('/form', (req, res) => res.redirect('/form'));
  app.use((err, req, res, next) => {
    console.log('err', err);
    next(err, req, res, next);
  });
  const server = app.listen();
  t.context.url = `http://localhost:${server.address().port}/`;
});

test('caps at max of 5 redirects', async t => {
  const res = await fetch(`${t.context.url}1`, {
    credentials: 'include'
  });
  t.is(res.status, 200);
  t.is(res.url, `${t.context.url}`);
  t.pass();
});

test('/beep => 200 => /boop => /beep', async t => {
  let res = await fetch(`${t.context.url}beep`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, `${t.context.url}beep`);
  res = await fetch(`${t.context.url}boop`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, `${t.context.url}beep`);
  t.pass();
});

test('/bar => /foo => /', async t => {
  const res = await fetch(`${t.context.url}bar`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, t.context.url);
  t.pass();
});

test('/foo => /', async t => {
  const res = await fetch(`${t.context.url}foo`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, t.context.url);
  t.pass();
});

test('/baz => /bar => /foo => /', async t => {
  const res = await fetch(`${t.context.url}baz`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, t.context.url);
  t.pass();
});

test('prevents incorrect redirect to earlier path', async t => {
  // GET / -> GET /form -> POST /form -> GET /form
  let res = await fetch(t.context.url, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, t.context.url);
  res = await fetch(`${t.context.url}form`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, `${t.context.url}form`);
  res = await fetch(`${t.context.url}form`, {
    method: 'POST',
    credentials: 'include',
    redirect: 'manual'
  });
  t.is(res.status, 302);
  t.is(res.headers.get('location'), `${t.context.url}form`);

  // GET /form -> POST /form -> GET /form -> POST /form
  res = await fetch(`${t.context.url}form`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, `${t.context.url}form`);
  res = await fetch(`${t.context.url}form`, {
    method: 'POST',
    credentials: 'include',
    redirect: 'manual'
  });
  t.is(res.status, 302);
  t.is(res.headers.get('location'), `${t.context.url}form`);
  res = await fetch(`${t.context.url}form`, { credentials: 'include' });
  t.is(res.status, 200);
  t.is(res.url, `${t.context.url}form`);
  res = await fetch(`${t.context.url}form`, {
    method: 'POST',
    credentials: 'include',
    redirect: 'manual'
  });
  t.is(res.status, 302);
  t.is(res.headers.get('location'), `${t.context.url}form`);

  t.pass();
});

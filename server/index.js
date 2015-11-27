/*jshint node:true */
'use strict';

var config = require('config');
var express = require('express');
var session = require('express-session');
var engines = require('consolidate');
var bodyParser = require('body-parser');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var r = require('./db');
var clientConfigParser = require('./clientConfigParser');

var auth = require('./auth');
var authRouter = require('./auth/auth-router');

server.listen(config.get('ports').http);

// Middleware
app
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(session({
    secret: 'zfnzkwjehgweghw',
    resave: false,
    saveUninitialized: true
  }))
  .use(auth.initialize())
  .use(auth.session());

// Views
app
  .set('views', __dirname + '/views')
  .engine('html', engines.mustache)
  .set('view engine', 'html');

// Routes
app
  .use('/auth', authRouter)
  .post('/message', function (req, res) {
    console.log(req.params, req.body);
    return r.table('messages').insert({
      text: req.body.text,
      email: req.body.email,
      created: (new Date()).getTime()
    }).run(r.conn);
  })
  .get('/message', function (req, res) {
    return r.table('messages')
     .orderBy({ index: 'created'})
     .coerceTo('array')
     .run(r.conn)
     .then(function (messages) {
       res.json(messages);
     });
   })
  .use('/config.js', clientConfigParser)
  .get('/', function (req, res) {
    res.render('index.html', { user: req.user });
  })
  .use(express.static(__dirname + '/../client'))
  .use('*', function (req, res) {
    res.send('404 Not Found');
  });

io.on('connection', function (socket) {

  r.connect(config.get('rethinkdb'))
    .then(function (conn) {
      r.table('messages')
       .changes().run(conn)
       .then(function (cursor) {
         cursor.each(function (err, row) {
           socket.emit('message', row.new_val);
         });
       });
    });
});

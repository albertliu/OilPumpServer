var createError = require('http-errors');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
const cors = require('cors');
const schedule = require('node-schedule');
require('events').EventEmitter.defaultMaxListeners = 0;
var indexRouter = require('./routes/index');
var publicRouter = require('./routes/public');

var app = express();

let checkMsg = '长时间未登录，已退出。';
let backStatus = 401;

app.use(express.static('users'))

//console.log("origin:",orig);
var corsOptions = {
  // origin: ['http://localhost:806', 'http://localhost'],
  origin: "*",
  //origin: orig,
  credentials: false,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions));  //跨域访问

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


//验证用户session
app.use(function(req, res, next) {
  // console.log("url:",req.url, "req.session.user:",req.session.user)
  next();//如果已经登录，则可以进入
});
app.disable('etag');
app.use('/', indexRouter);
app.use('/public', publicRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log("error",err.message)
  res.render('error');
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection:', reason)
  // 在这里处理
})


module.exports = app;

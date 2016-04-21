var restify = require('restify');
var cors = require('cors');
var redis = require('redis');
var client = redis.createClient();

client.on('connect', function(){
    console.log('Redis Connected');
});

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

var channels = [''];

var server = restify.createServer();
server.use(cors());

server.get('/templates/:id', function(req, res, next){
    
});

server.post('/templates/:channel', function(req, res, next){
});

server.listen(1375, function() {
  console.log('%s listening at %s', server.name, server.url);
});

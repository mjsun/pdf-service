var restify = require('restify');
var redis = require('redis');
var client = redis.createClient();
var pdfFiller = require('pdffiller');
var Promise = require('bluebird');
var fs = require('fs');
client.on('connect', function(){
    console.log('Redis Connected');
});

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

function generateId() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

var channels = ['snapp', 'haven'];

var server = restify.createServer();

server.use(restify.bodyParser());
server.pre(restify.CORS()); //turn on CORS

server.get('/', function(req, res, next){
    res.send('Try /template/snapp');
});

server.post('/templates/:channel', function(req, res, next){
    var channel = req.params.channel;
    var body = req.body,
        file = body.file,
        fileName = body.name;

    var path = './pdf/' + channel + '/';

    if(!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }

    var fileId = generateId();
    fs.writeFileSync(path + fileName, file);
    pdfFiller.generateFieldJson(path + fileName, null, function(err, fdfData){
        if(err){
            res.status(501);
        }
        else {
            client.set(fileId, JSON.stringify(fdfData));
            res.send(fdfData);
        }
    });

});

server.post('/mergefill/:channel', function(req, res, next){
    var channel = req.params.channel;
});

server.listen(1375, function() {
  console.log('%s listening at %s', server.name, server.url);
});

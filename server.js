var restify = require('restify');
var redis = require('redis');
var client = redis.createClient();
var pdfFiller = require('pdffiller');
var Promise = require('bluebird');

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

var channels = ['snapp', 'haven'];

var server = restify.createServer();

server.use(restify.bodyParser());
server.use(
    function crossOrigin(req,res,next){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        return next();
    }
); //turn on CORS

server.get('/', function(req, res, next){
    res.send('Try /template/snapp');
});

server.post('/templates/:channel', function(req, res, next){
    var channel = req.params.channel;
    var body = req.body;

    /**
     * This is just a mock
     * */
    var sourcePdf = '/pdf/template_1.pdf';
    pdfFiller.generateFieldJson(sourcePdf, null, function(err, fdfData){
        if(err){
            res.status(501);
        }
        else {
            //defer.resolve([fdfData, fileName, fileTempPath, data]);
            res.send(fdfData);
        }
    });

});

server.listen(1375, function() {
  console.log('%s listening at %s', server.name, server.url);
});

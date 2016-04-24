var restify = require('restify');
var redis = require('redis');
var client = redis.createClient();
var pdfFiller = require('pdffiller');
var Promise = require('bluebird');
var fs = require('fs');
var PDFMerge = require('pdf-merge');

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
    throw new Error('This is a test crazy');
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
            //res.status(501);
            throw new Error (err);
        }
        else {
            client.set(fileId, JSON.stringify(fdfData));
            res.send(fdfData);
        }
    });

});

server.post('/mergefill/:channel', function(req, res, next){
    var channel = req.params.channel;
    var body = req.body; //array of template id, order, metadata
    var allPromises;
    var dateNow = Date.now();
    var dirId = generateId();
    var sourceDir = './pdf/' + form.channel + '/';
    var destDir = './pdf/' + form.channel + '/' + dateNow + '/' + dirId;
    /*
    {
        templateId: '',
        formOrder: '',
        mappings: ''
    }
     */

    //sort array
    body.sort(function(a, b){
        return a.formOrder - b.formOrder;
    });

    //loop body
    allPromises = _.map(body, function(form){
        //find template
        var templateName = client.get(form.templateId)
        var source = sourceDir + templateName,
            dest = destDir + templateName;
        return new Promise(function(resolve, reject){
            PDFFiller.fillForm(source, dest, form.mappings, function (error) {
                if (error) {
                    reject(error);
                }
                resolve(dest);
            });
        });
    });

    //merge
    Promise
        .all(allPromises)
        .then(function(generatedPdfs){
            var pdfMerge = new PDFMerge(generatedPdfs);
            var mergedPdf = destDir + 'finalMergedFile.pdf';
            return new Promise(function(resolve, reject){
                pdfMerge.asNewFile(mergedPdf).merge(function (error, filePath) {
                    if (error) {
                        reject(error);
                    }
                    resolve(mergedPdf);
                });
            });
        })
        .then(function(mergedFilePath){
            return fs.readFile(mergedFilePath);
        })
        .then(function(data){
            res.send(data);
        })
        .catch(function(err){
            throw new Error (err);
        });
});


server.listen(1375, function() {
  console.log('%s listening at %s', server.name, server.url);
});

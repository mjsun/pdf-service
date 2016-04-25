exports.StartServer = function(){

    var restify = require('restify');
    var redis = require('redis');
    var client = redis.createClient();
    var pdfFiller = require('pdffiller');
    var Promise = require('bluebird');
    var fs = require('fs');
    var FS = require('q-io/fs');
    var PDFMerge = require('pdf-merge');
    var _ =require('lodash');

    client.on('connect', function(){
        console.log('Redis Connected');
    });

    client.on('error', function(err){
        console.log('Error ' + err);
    });

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
        res.send('Please choose valid API entry point');
    });

    server.post('/templates/:channel', function(req, res, next){
        var channel = req.params.channel;
        var body = req.body,
            file = body.file,
            fileName = body.fileName;

        var path = './pdf/' + channel + '/';

        if(!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }

        var fileId = generateId();
        var dest = path + fileName;

        FS.write(dest, file)
            .then(function(){
                pdfFiller.generateFieldJson(path + fileName, null, function(err, fdfData){
                    if(err){
                        throw new Error (err);
                    }
                    else {
                        client.set(fileId+'_name', fileName, function(){
                            client.set(fileId+'_tags', JSON.stringify(fdfData), function(){
                                res.send(fileId);
                            })
                        });
                    }
                });
            });
    });

    server.get('templates/:channel/:templateId/:contentType', function(req, res, next){
        var channel = req.params.channel,
            templateId = req.params.templateId,
            contentType = req.params.contentType;
        var fileDir = './pdf/' + channel + '/';


        if(contentType === 'form_mappings'){
            client.get(templateId+'_tags', function(err, data){
                res.send(JSON.parse(data));
            });
        }
        else if(contentType === 'template') {
            client.get(templateId+'_name' ,function(err, fileName){
                if(err){
                    throw new Error(err);
                }

                fs.readFile(fileDir + fileName, function(err, data){

                    if(err) {
                        throw new Error(err);
                    }
                    res.send(data);
                });
            });

        }
    });

    server.post('/mergefill/:channel', function(req, res, next){
        var channel = req.params.channel;
        var body = req.body; //array of template id, order, metadata
        var allPromises;
        var dateNow = Date.now();
        var dirId = generateId();
        var sourceDir = './pdf/' + channel + '/';
        var destDir = './pdf/' + channel + '/' + dateNow + '/' + dirId;
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
            var templateName = client.get(form.templateId+'_name');
            var source = sourceDir + templateName, dest = destDir + templateName;
            return new Promise(function(resolve, reject){
                pdfFiller.fillForm(source, dest, form.mappings, function (error) {
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
                console.log(generatedPdfs);
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
                return FS.read(mergedFilePath);
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

};


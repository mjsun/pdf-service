exports.StartServer = function () {

  var restify = require('restify');
  var redis = require('redis');
  var jwt = require('restify-jwt');
  var client = redis.createClient();
  var pdfFiller = require('pdffiller');
  var Promise = require('bluebird');
  var cors = require('cors');
  var fs = require('fs');
  var FS = require('q-io/fs');
  var PDFMerge = require('pdf-merge');
  var _ = require('lodash');

  var JWT_SECRET_K = 'SafeHavenPDF';

  client.on('connect', function () {
    console.log('Redis Connected');
  });

  client.on('error', function (err) {
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

  function generateFsId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return s4() + s4() + '_' + s4() + '_' + s4() + '_' +
      s4() + '_' + s4() + s4() + s4();
  }

  var channels = ['snapp', 'haven']; //In the future to validate incomming channel

  var server = restify.createServer();

  // server.pre(restify.CORS()); //turn on CORS
  server.pre(cors());

  server.use(restify.bodyParser());
  server.use(jwt({
    secret: JWT_SECRET_K,
    getToken: function fromHeaderOrQuerystring (req) {
      var token = null;
      if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.query && req.query.token) {
        token =  req.query.token;
      }
      return token;
    }
  }));


  server.get('/', function (req, res, next) {
    res.send('Please choose valid API entry point');
  });

  server.post('/templates/:channel', function (req, res, next) {
    var channel = req.params.channel;
    var body = req.body,
      file = body.file,
      fileName = body.fileName;

    var path = './pdf/' + channel + '/';

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }

    var fileId = generateId();
    var dest = path + fileName;

    FS.write(dest, file)
      .then(function () {
        console.log('filling...');
        pdfFiller.generateFieldJson(path + fileName, null, function (err, fdfData) {
          if (err) {
            throw new Error(err);
          }
          else {
            client.set(fileId + '_name', fileName, function () {
              client.set(fileId + '_tags', JSON.stringify(fdfData), function () {
                res.send(fileId);
              })
            });
          }
        });
      });
  });

  server.get('templates/:channel/:templateId/:contentType', function (req, res, next) {
    var channel = req.params.channel,
      templateId = req.params.templateId,
      contentType = req.params.contentType;
    var fileDir = './pdf/' + channel + '/';


    if (contentType === 'form_mappings') {
      client.get(templateId + '_tags', function (err, data) {
        res.send(JSON.parse(data));
      });
    }
    else if (contentType === 'template') {
      client.get(templateId + '_name', function (err, fileName) {
        if (err) {
          throw new Error(err);
        }
        FS.read(fileDir + fileName)
          .then(function (data) {
            res.send(data);
          })
          .catch(function (err) {
            throw new Error(err);
          });
      });

    }
  });

  server.post('/mergefill/:channel', function (req, res, next) {
    var channel = req.params.channel;
    var body = req.body.sampleArray; //array of template id, order, metadata
    var dateNow = Date.now();
    var dirId = generateFsId();
    var sourceDir = './pdf/' + channel + '/';
    var destDir = './pdf/' + channel + '/' + dirId + '/';

//sort array
    body.sort(function (a, b) {
      return a.formOrder - b.formOrder;
    });

//merge
    FS.makeDirectory(destDir)
      .then(function () {
        var allPromises = _.map(body, function (form) {
          return new Promise(function (resolve, reject) {
            client.get(form.templateId + '_name', function (err, fileName) {
              if (err) {
                reject(err);
              }
              resolve({fileName: fileName, mappings: form.mappings});
            });
          });
        });
        return Promise.all(allPromises);
      })
      .then(function (formObjects) {
        var allPromises = _.map(formObjects, function (form) {
          var source = sourceDir + form.fileName, dest = destDir + form.fileName;
          return new Promise(function (resolve, reject) {
            pdfFiller.fillForm(source, dest, form.mappings, function (error) {
              if (error) {
                reject('Error ' + error);
              }
              resolve(dest);
            });
          });
        });
        return Promise.all(allPromises);
      })
      .then(function (generatedPdfs) {
        console.log(generatedPdfs);
        var names = _.map(generatedPdfs, function (form) {
          return form.fileName;
        });
        var pdfMerge = new PDFMerge(generatedPdfs);
        var mergedPdf = destDir + 'finalMergedFile.pdf';
        return new Promise(function (resolve, reject) {
          pdfMerge.asNewFile(mergedPdf).merge(function (err, filePath) {
            if (err) {
              reject(err);
            }
            resolve(mergedPdf);
          });
        });
      })
      .then(function (mergedFilePath) {
        return FS.read(mergedFilePath);
      })
      .then(function (data) {
        return FS.removeTree(destDir).then(function () {
          return data;
        });
      })
      .then(function (data) {
        res.send(data);
      })
      .catch(function (err) {
        throw new Error(err);
      });
  });


  server.listen(1375, function () {
    console.log('%s listening at %s', server.name, server.url);
  });

};


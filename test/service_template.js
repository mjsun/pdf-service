//Please run the server before running the test
var restify = require('restify');
var client = restify.createJsonClient({
    version: '*',
    url: 'http://127.0.0.1:1375'
});

var _ = require('lodash');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var FS = require('q-io/fs');
var readTemplate;
var path = require('path');
var fileId = [];
var expect = require('chai').expect;
var formMapping = {
    InsuredFirstName: 'Mike',
    InsuredMiddleName: 'Erwin',
    InsuredLastName: 'Gap',
    InsuredSuffix: 'Jr.',
    OwnerName: 'ChiaChia'
};
var JWT_SECRET_K = 'SafeHavenPDF';
var sampleTemplates = ['test_template.pdf', 'test_template_1.pdf', 'test_template_2.pdf'];
var sampleFolder = '';
var resultIDs = [];

var options = body = {};

describe('PDF services', function() {
  beforeEach(function() {
    options =  {
      headers: {
        authorization: ''
      }
    };
  });

    describe('200 response check', function() {
        it('should get a 200 response', function(done) {
          var token = jwt.sign({}, JWT_SECRET_K);

          options = {
            path: '/',
            headers: {
              authorization: "Bearer " + token
            } // */
          };

            client.get(options, function(err, req, res, data) {
                if (err) {
                    throw new Error(err);
                }
                else {
                    if (data != 'Please choose valid API entry point') {
                        throw new Error('invalid response from /');
                    }
                    done();
                }
            });
        });
    });

    describe('snapp templates test', function(){

        before(function(done){
            fs.readFile(__dirname + '/pdf/test_template.pdf', function(err, data){
                if(err){
                    throw new Error(err);
                }
                readTemplate = data;
                done();
            });
        });

      beforeEach(function(done) {
        body = {};
        options = {
          headers: {
            authorization: ''
          }
        };
        done();
      });

        it('upload a template',function(done){
          var token = jwt.sign({}, JWT_SECRET_K);
          body = {
            fileName: 'test_template.pdf',
            file: readTemplate
          };
          options.path = '/templates/snapp';
          options.headers.authorization = 'Bearer ' + token;

            client.post(options, body, function(err, req, res, data){
                if (err) {
                    throw new Error(err);
                }
                else {
                    FS.exists(__dirname + '/../pdf/snapp/test_template.pdf')
                        .then(function(status){
                            if(!status){
                                throw new Error('File is not generated.');
                            }
                            fileId.push(data);
                            done();
                        });
                }
            });
        });

        it('upload a template 1',function(done){

          var token = jwt.sign({}, JWT_SECRET_K);
          body = {
            fileName: 'test_template_1.pdf',
            file: readTemplate
          };
          options.path = '/templates/snapp';
          options.headers.authorization = 'Bearer ' + token;
            client.post(options, body, function(err, req, res, data){
                if (err) {
                    throw new Error(err);
                }
                else {
                    FS.exists(__dirname + '/../pdf/snapp/test_template_1.pdf')
                        .then(function(status){
                            if(!status){
                                throw new Error('File is not generated.');
                            }
                            fileId.push(data);
                            done();
                        });
                }
            });
        });

        it('upload a template 2',function(done){

          var token = jwt.sign({}, JWT_SECRET_K);
          body = {
            fileName: 'test_template_2.pdf',
            file: readTemplate
          };
          options.path = '/templates/snapp';
          options.headers.authorization = 'Bearer ' + token;

            client.post(options, body, function(err, req, res, data){
                if (err) {
                    throw new Error(err);
                }
                else {
                    FS.exists(__dirname + '/../pdf/snapp/test_template_2.pdf')
                        .then(function(status){
                            if(!status){
                                throw new Error('File is not generated.');
                            }
                            fileId.push(data);
                            done();
                        });
                }
            });
        });

        it('get a template metadata', function(done){
          var token = jwt.sign({}, JWT_SECRET_K);
          options.path = '/templates/snapp/' + fileId[0] + '/form_mappings';
          options.headers.authorization = 'Bearer ' + token;

            client.get(options, function(err, req, res, data){
                expect(Array.isArray(data)).to.equal(true);
                done();
            });
        });

        it('get a template content', function(done){

          var token = jwt.sign({}, JWT_SECRET_K);
          options.path = '/templates/snapp/' + fileId[0] + '/template';
          options.headers.authorization = 'Bearer ' + token;

            client.get(options, function(err, req, res, data){
                //console.log(data);
                //expect(new Buffer(data, 'base64').toString()).to.equal(readTemplate.toString()); //this is for fs.readFile
                expect(new Buffer(data).toString()).to.equal(readTemplate.toString());
                done();
            });
        });

    });

    describe('snapp merge and file test', function(){
        it('merge and fill forms', function(done){
            var sampleArray = _.map(fileId, function(id){
                return {
                    templateId: id,
                    formOrder: fileId.indexOf(id),
                    mappings: formMapping
                }
            });

          var token = jwt.sign({}, JWT_SECRET_K);
          body = {
            sampleArray: sampleArray
          };
          options.path = '/mergefill/snapp';
          options.headers.authorization = 'Bearer ' + token;

            client.post(options, body, function(err, req, res, data){
                if(err){
                    throw new Error(err);
                }
                //console.log(data);
                expect(data).to.be.a('string');
                done();
            });

        });
    });

    after(function(done){
        var sampleTemplates = ['test_template.pdf', 'test_template_1.pdf', 'test_template_2.pdf'];
        var rmfiles = _.map(sampleTemplates, function(name){
            return __dirname + '/../pdf/snapp/' + name;
        });
        var allPromises = _.map(rmfiles, function(dir){
            return FS.removeTree(dir);
        });
        return Promise.all(allPromises).then(function(){
            done();
        });
    });// */

});
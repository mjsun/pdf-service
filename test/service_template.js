var restify = require('restify');
var server = require('../server');
var client = restify.createJsonClient({
    version: '*',
    url: 'http://127.0.0.1:1375'
});
var _ = require('lodash');
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
var sampleTemplates = ['test_template.pdf', 'test_template_1.pdf', 'test_template_2.pdf'];
var resultIDs = [];
before(function(done){
    server.StartServer();
    done();
});

console.log(__dirname);
describe('PDF services', function() {

    // Test #1
    describe('200 response check', function() {
        it('should get a 200 response', function(done) {
            client.get('/', function(err, req, res, data) {
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
            fs.readFile('./pdf/test_template.pdf', function(err, data){
                if(err){
                    throw new Error(err);
                }
                readTemplate = data;
                done();
            });
        });

        it('upload a template',function(done){
            client.post('/templates/snapp', {fileName: 'test_template.pdf', file: readTemplate}, function(err, req, res, data){
                if (err) {
                    throw new Error(err);
                }
                else {
                    FS.exists('./pdf/snapp/test_template.pdf')
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
            client.post('/templates/snapp', {fileName: 'test_template_1.pdf', file: readTemplate}, function(err, req, res, data){
                if (err) {
                    throw new Error(err);
                }
                else {
                    FS.exists('./pdf/snapp/test_template_1.pdf')
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
            client.post('/templates/snapp', {fileName: 'test_template_2.pdf', file: readTemplate}, function(err, req, res, data){
                if (err) {
                    throw new Error(err);
                }
                else {
                    FS.exists('./pdf/snapp/test_template_2.pdf')
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
            client.get('/templates/snapp/' + fileId[0] + '/form_mappings', function(err, req, res, data){
                expect(Array.isArray(data)).to.equal(true);
                done();
            });
        });

        it('get a template content', function(done){
            client.get('/templates/snapp/' + fileId[0] + '/template', function(err, req, res, data){
                expect(new Buffer(data, 'base64').toString()).to.equal(readTemplate.toString());
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

            client.post('/mergefill/snapp', {sampleArray: sampleArray}, function(err, req, res, data){
                if(err){
                    throw new Error(err);
                }
                done();
            });

        });
    });
});
var pdfFiller = require('pdffiller');
var Promise = require('bluebird');
var fs = require('fs');

module.exports.receiveFile = function (channel, fieldname, file, fileName) {
    var client = this;
    var generateFieldJsonAsync = Promise.promisify(pdfFiller.generateFieldJson);

    var path = '../pdf/' + channel + '/';

    if(!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }

    var dest = path + fileName;
    var fstream = fs.createWriteStream(dest);

    file.pipe(fstream);
    fstream.on('close', writeFile);
    
    var generatedFileId = null;

    function writeFile(){
        var fileId = generateId();
        return generateFieldJsonAsync(path + fileName, null)
            .then(function(fdfData){
                client.setAsync(fileId+'_name', fileName)
                    .then(function() {
                        client.set(fileId + '_tags', JSON.stringify(fdfData))
                    })
                    .then(function(){
                        generatedFileId = fileId;
                    });
                });
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
};

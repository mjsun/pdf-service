var service = require('pdf-service');

module.exports.upload = function(req, res, next) {
    var client = this; // bound from the router call
    var channel = req.params.channel;
    req.pipe(req.busboy);
    req.busboy.on('file', service.receiveFile.bind(client, channel)); // bind the client into the service call
};


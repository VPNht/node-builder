(function() {
  var config, configureRequest, loadNpm, npm, request;

  request = require('request');


  configureRequest = function(requestOptions, callback) {
      requestOptions.headers = {};
  };

  module.exports = {
    get: function(requestOptions, callback) {
      return request.get(requestOptions, callback);
    },
    createReadStream: function(requestOptions, callback) {
      return callback(request.get(requestOptions));
    }
  };

}).call(this);

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('node-telegram-bot-api');
var https = require('https');
var http = require('http');
var fs = require('fs');

var TelegramBotWebHook = function () {
    function TelegramBotWebHook(token, options, callback) {
        _classCallCheck(this, TelegramBotWebHook);

        this.token = token;
        this.callback = callback;
        if (typeof options === 'boolean') {
            options = {};
        }
        options.port = options.port || 8443;
        var binded = this._requestListener.bind(this);

        if (options.key && options.cert) {
            debug('HTTPS WebHook enabled');
            var opts = {
                key: fs.readFileSync(options.key),
                cert: fs.readFileSync(options.cert)
            };
            this._webServer = https.createServer(opts, binded);
        } else {
            debug('HTTP WebHook enabled');
            this._webServer = http.createServer(binded);
        }

        this._webServer.listen(options.port, options.host, function () {
            debug('WebHook listening on port %s', options.port);
        });
    }

    _createClass(TelegramBotWebHook, [{
        key: '_requestListener',
        value: function _requestListener(req, res) {
            var self = this;
            var regex = new RegExp(this.token);

            debug('WebHook request URL:', req.url);
            debug('WebHook request headers: %j', req.headers);

            if (!regex.test(req.url)) {
                debug('WebHook request unauthorized');
                res.statusCode = 401;
                res.end();
            } else if (req.method === 'POST') {
                var fullBody = '';
                req.on('data', function (chunk) {
                    fullBody += chunk.toString();
                });
                req.on('end', function () {
                    try {
                        debug('WebHook request fullBody', fullBody);
                        var data = JSON.parse(fullBody);
                        self.callback(data);
                    } catch (error) {
                        debug(error);
                    }
                    res.end('OK');
                });
            } else {
                debug('WebHook request isn\'t a POST');
                res.statusCode = 418;
                res.end();
            }
        }
    }]);

    return TelegramBotWebHook;
}();

module.exports = TelegramBotWebHook;

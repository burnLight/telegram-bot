'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require('debug')('node-telegram-bot-api');
var Promise = require('bluebird');
var request = require('request');
var URL = require('url');

var requestPromise = Promise.promisify(request);

var TelegramBotPolling = function () {
    function TelegramBotPolling(token, options, callback) {
        _classCallCheck(this, TelegramBotPolling);

        options = options || {};
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        this.offset = 0;
        this.token = token;
        this.callback = callback;
        this.timeout = options.timeout || 10;
        this.interval = typeof options.interval === 'number' ? options.interval : 300;
        this.lastUpdate = 0;
        this.lastRequest = null;
        this.abort = false;
        this._polling();
    }

    _createClass(TelegramBotPolling, [{
        key: '_polling',
        value: function _polling() {
            this.lastRequest = this._getUpdates().then(function (updates) {
                this.lastUpdate = Date.now();
                debug('polling data %j', updates);
                updates.forEach(function (update, index) {
                    // If is the latest, update the offset.
                    if (index === updates.length - 1) {
                        this.offset = update.update_id;
                        debug('updated offset: %s', this.offset);
                    }
                    this.callback(update);
                }.bind(this));
            }.bind(this)).catch(function (err) {
                debug('polling error: %j', err);
                throw err;
            }).finally(function () {
                if (this.abort) {
                    debug('Polling is aborted!');
                } else {
                    debug('setTimeout for %s miliseconds', this.interval);
                    setTimeout(this._polling.bind(this), this.interval);
                }
            }.bind(this));
        }
    }, {
        key: '_getUpdates',
        value: function _getUpdates() {
            var opts = {
                qs: {
                    offset: this.offset + 1,
                    limit: this.limit,
                    timeout: this.timeout
                },
                url: URL.format({
                    protocol: 'https',
                    host: 'api.telegram.org',
                    pathname: '/bot' + this.token + '/getUpdates'
                })
            };
            debug('polling with options: %j', opts);
            return requestPromise(opts).cancellable().timeout((10 + this.timeout) * 1000).then(function (resp) {
                if (resp[0].statusCode !== 200) {
                    throw new Error(resp[0].statusCode + ' ' + resp[0].body);
                }
                var data;
                try {
                    data = JSON.parse(resp[0].body);
                } catch (err) {
                    throw new Error('Error parsing Telegram response: %s', resp[0].body);
                }
                if (data.ok) {
                    return data.result;
                } else {
                    throw new Error(data.error_code + ' ' + data.description);
                }
            });
        }
    }]);

    return TelegramBotPolling;
}();

module.exports = TelegramBotPolling;
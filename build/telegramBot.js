'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TelegramBotWebHook = require('./telegramBotWebHook');
var debug = require('debug')('node-telegram-bot-api');
var EventEmitter = require('events').EventEmitter;
var fileType = require('file-type');
var Promise = require('bluebird');
var request = require('request');
var stream = require('stream');
var mime = require('mime');
var path = require('path');
var URL = require('url');
var fs = require('fs');

var RATE_LIMIT = 30;
var DEFAULT_RATE = 25;

var requestPromise = Promise.promisify(request);

var TelegramBot = function (_EventEmitter) {
    _inherits(TelegramBot, _EventEmitter);

    function TelegramBot(token, options) {
        _classCallCheck(this, TelegramBot);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TelegramBot).call(this));

        options = options || {};
        _this.options = options;
        _this.token = token;
        _this.messageTypes = ['text', 'audio', 'document', 'photo', 'sticker', 'video', 'voice', 'contact', 'location', 'new_chat_participant', 'left_chat_participant', 'new_chat_title', 'new_chat_photo', 'delete_chat_photo', 'group_chat_created'];

        _this.textRegexpCallbacks = [];
        _this.onReplyToMessages = [];

        _this.requestQueue = [];
        _this.requestRate = options.requestRate;

        _this.processUpdate = _this._processUpdate.bind(_this);

        if (options.webHook) {
            _this._WebHook = new TelegramBotWebHook(token, options.webHook, _this.processUpdate);
        }

        _this.on('text', function (message) {
            debug('Text message');
            var execNext = true;
            _this.textRegexpCallbacks.forEach(function (reg) {
                debug('Matching %s whith', message.text, reg.regexp);
                var result = reg.regexp.exec(message.text);
                if (result) {
                    debug('Matches', reg.regexp);
                    if (execNext) {
                        reg.callback(message, result);
                        execNext = reg.execNext ? true : false;
                    }
                }
            });
        });

        _this.on('reply_to_message', function (message) {
            var execNext = true;
            _this.onReplyToMessages.forEach(function (reply) {
                if (reply.chatId === message.chat.id) {
                    if (reply.messageId === message.reply_to_message.message_id) {
                        if (execNext) {
                            reply.callback(message);
                            execNext = reg.execNext ? true : false;
                        }
                    }
                }
            });
        });
        return _this;
    }

    _createClass(TelegramBot, [{
        key: '_execRequest',
        value: function _execRequest() {
            if (this.requestQueue[0]) {
                var element = this.requestQueue[0];
                debug('HTTP request: %j', element.options);
                requestPromise(element.options).then(function (resp) {
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
                }).then(function (data) {
                    element.resolve(data);
                }).catch(function (err) {
                    element.reject(err);
                });
                this.requestQueue.splice(0, 1);
            }
        }
    }, {
        key: 'setFilter',
        value: function setFilter(filter) {
            for (var i = 0; i < arguments.length; i++) {
                if (!arguments[i] && typeof arguments[i] !== 'function') return false;
            }this._filter = arguments;
        }
    }, {
        key: '_processUpdate',
        value: function _processUpdate(update) {
            var _this2 = this;

            debug('Filtering');
            if (this._filter && !function (update) {
                for (var i = 0; i < _this2._filter.length; i++) {
                    if (!_this2._filter[i](update)) return false;
                }return true;
            }(update)) return false;

            debug('Process Update %j', update);
            var message = update.message;
            var inline_query = update.inline_query;
            var chosen_inline_result = update.chosen_inline_result;

            if (message) {
                debug('Process Update message %j', message);
                this.emit('message', message);
                var processMessageType = function processMessageType(messageType) {
                    if (message[messageType]) {
                        this.emit(messageType, message);
                    }
                };
                this.messageTypes.forEach(processMessageType.bind(this));
            } else if (inline_query) {
                debug('Process Update inline_query %j', inline_query);
                this.emit('inline_query', inline_query);
            } else if (chosen_inline_result) {
                debug('Process Update chosen_inline_result %j', chosen_inline_result);
                this.emit('chosen_inline_result', chosen_inline_result);
            }
        }
    }, {
        key: '_request',
        value: function _request(path, options) {
            var _this3 = this;

            if (!this.token) {
                throw new Error('Telegram Bot Token not provided!');
            }
            options = options || {};
            if (options.form) {
                var replyMarkup = options.form.reply_markup;
                if (replyMarkup && typeof replyMarkup !== 'string') {
                    options.form.reply_markup = JSON.stringify(replyMarkup);
                }
            }
            options.url = this._buildURL(path);

            return new Promise(function (resolve, reject) {
                _this3.requestQueue.push({
                    options: options,
                    resolve: resolve,
                    reject: reject
                });
            });
        }
    }, {
        key: '_buildURL',
        value: function _buildURL(path) {
            return URL.format({
                protocol: 'https',
                host: 'api.telegram.org',
                pathname: '/bot' + this.token + '/' + path
            });
        }
    }, {
        key: 'getMe',
        value: function getMe() {
            var path = 'getMe';
            return this._request(path);
        }
    }, {
        key: 'setWebHook',
        value: function setWebHook(url, cert) {
            var path = 'setWebHook';
            var opts = {
                qs: { url: url }
            };

            if (cert) {
                var content = this._formatSendData('certificate', cert);
                opts.formData = content[0];
                opts.qs.certificate = content[1];
            }

            return this._request(path, opts).then(function (resp) {
                if (!resp) {
                    throw new Error(resp);
                }
                return resp;
            });
        }
    }, {
        key: 'getUpdates',
        value: function getUpdates(timeout, limit, offset) {
            var form = {
                offset: offset,
                limit: limit,
                timeout: timeout
            };
            return this._request('getUpdates', { form: form });
        }
    }, {
        key: 'answerInlineQuery',
        value: function answerInlineQuery(answer) {
            if (!answer || !answer.inline_query_id || !answer.results) throw new ReferenceError('answer, inline_query_id or text are not specified');
            var form = answer.options || {};
            form.inline_query_id = answer.inlineQueryId;
            form.results = JSON.stringify(answer.results);
            return this._request('answerInlineQuery', { form: form });
        }
    }, {
        key: 'forwardMessage',
        value: function forwardMessage(chatId, fromChatId, messageId) {
            var form = {
                chat_id: chatId,
                from_chat_id: fromChatId,
                message_id: messageId
            };
            return this._request('forwardMessage', { form: form });
        }
    }, {
        key: '_formatSendData',
        value: function _formatSendData(type, data) {
            var formData;
            var fileName;
            var fileId;
            if (data instanceof stream.Stream) {
                fileName = URL.parse(path.basename(data.path)).pathname;
                formData = {};
                formData[type] = {
                    value: data,
                    options: {
                        filename: fileName,
                        contentType: mime.lookup(fileName)
                    }
                };
            } else if (Buffer.isBuffer(data)) {
                var filetype = fileType(data);
                if (!filetype) {
                    throw new Error('Unsupported Buffer file type');
                }
                formData = {};
                formData[type] = {
                    value: data,
                    options: {
                        filename: 'data.' + filetype.ext,
                        contentType: filetype.mime
                    }
                };
            } else if (fs.existsSync(data)) {
                fileName = path.basename(data);
                formData = {};
                formData[type] = {
                    value: fs.createReadStream(data),
                    options: {
                        filename: fileName,
                        contentType: mime.lookup(fileName)
                    }
                };
            } else {
                fileId = data;
            }
            return [formData, fileId];
        }
    }, {
        key: '_sendMessage',
        value: function _sendMessage(chatId, text, options) {
            var form = options || {};
            form.chat_id = chatId;
            form.text = text;
            return this._request('sendMessage', { form: form });
        }
    }, {
        key: '_sendPhoto',
        value: function _sendPhoto(chatId, photo, options) {
            var opts = {
                qs: options || {}
            };
            opts.qs.chat_id = chatId;
            var content = this._formatSendData('photo', photo);
            opts.formData = content[0];
            opts.qs.photo = content[1];
            return this._request('sendPhoto', opts);
        }
    }, {
        key: '_sendAudio',
        value: function _sendAudio(chatId, audio, options) {
            var opts = {
                qs: options || {}
            };
            opts.qs.chat_id = chatId;
            var content = this._formatSendData('audio', audio);
            opts.formData = content[0];
            opts.qs.audio = content[1];
            return this._request('sendAudio', opts);
        }
    }, {
        key: '_sendDocument',
        value: function _sendDocument(chatId, doc, options) {
            var opts = {
                qs: options || {}
            };
            opts.qs.chat_id = chatId;
            var content = this._formatSendData('document', doc);
            opts.formData = content[0];
            opts.qs.document = content[1];
            return this._request('sendDocument', opts);
        }
    }, {
        key: '_sendSticker',
        value: function _sendSticker(chatId, sticker, options) {
            var opts = {
                qs: options || {}
            };
            opts.qs.chat_id = chatId;
            var content = this._formatSendData('sticker', sticker);
            opts.formData = content[0];
            opts.qs.sticker = content[1];
            return this._request('sendSticker', opts);
        }
    }, {
        key: '_sendVideo',
        value: function _sendVideo(chatId, video, options) {
            var opts = {
                qs: options || {}
            };
            opts.qs.chat_id = chatId;
            var content = this._formatSendData('video', video);
            opts.formData = content[0];
            opts.qs.video = content[1];
            return this._request('sendVideo', opts);
        }
    }, {
        key: '_sendVoice',
        value: function _sendVoice(chatId, voice, options) {
            var opts = {
                qs: options || {}
            };
            opts.qs.chat_id = chatId;
            var content = this._formatSendData('voice', voice);
            opts.formData = content[0];
            opts.qs.voice = content[1];
            return this._request('sendVoice', opts);
        }
    }, {
        key: '_sendChatAction',
        value: function _sendChatAction(chatId, action) {
            var form = {
                chat_id: chatId,
                action: action
            };
            return this._request('sendChatAction', { form: form });
        }
    }, {
        key: 'getUserProfilePhotos',
        value: function getUserProfilePhotos(userId, offset, limit) {
            var form = {
                user_id: userId,
                offset: offset,
                limit: limit
            };
            return this._request('getUserProfilePhotos', { form: form });
        }
    }, {
        key: '_sendLocation',
        value: function _sendLocation(chatId, coordinates, options) {
            var form = options || {};
            form.chat_id = chatId;
            form.latitude = coordinates.latitude;
            form.longitude = coordinates.longitude;
            return this._request('sendLocation', { form: form });
        }
    }, {
        key: 'getFile',
        value: function getFile(fileId) {
            var form = { file_id: fileId };
            return this._request('getFile', { form: form });
        }
    }, {
        key: 'getFileLink',
        value: function getFileLink(fileId) {
            var self = this;
            return self.getFile(fileId).then(function (resp) {
                return URL.format({
                    protocol: 'https',
                    host: 'api.telegram.org',
                    pathname: '/file/bot' + self.token + '/' + resp.file_path
                });
            });
        }
    }, {
        key: 'downloadFile',
        value: function downloadFile(fileId, downloadDir) {
            return this.getFileLink(fileId).then(function (fileURI) {
                var fileName = fileURI.slice(fileURI.lastIndexOf('/') + 1);

                var filePath = downloadDir + '/' + fileName;
                return new Promise(function (resolve, reject) {
                    request({ uri: fileURI }).pipe(fs.createWriteStream(filePath)).on('error', reject).on('close', function () {
                        resolve(filePath);
                    });
                });
            });
        }
    }, {
        key: 'onText',
        value: function onText(regexp, callback, execNext) {
            var textRegexpCallback = { regexp: regexp, callback: callback, execNext: execNext };
            this.textRegexpCallbacks.push(textRegexpCallback);
        }
    }, {
        key: 'onReplyToMessage',
        value: function onReplyToMessage(chatId, messageId, callback, execNext) {
            var onReplyToMessage = {
                chatId: chatId,
                messageId: messageId,
                callback: callback,
                execNext: execNext
            };
            this.onReplyToMessages.push(onReplyToMessage);
        }
    }, {
        key: 'send',
        value: function send(id, answer) {
            var _this4 = this;

            if (Array.isArray(id)) {
                var promises = [];
                id.forEach(function (id) {
                    promises.push(_this4.send(id, answer));
                });
                return promises;
            } else {
                if (Array.isArray(answer)) {
                    var promises = [];
                    answer.forEach(function (answer) {
                        promises.push(_this4.send(id, answer));
                    });
                    return promises;
                } else {
                    switch (answer.type) {
                        case "text":
                            return this._sendMessage(id, answer.content, answer.options);
                        case "interpolate":
                            return this._sendMessage(id, answer.content, this._interpolate(answer.interpolate, answer.props), answer.options);
                        case "photo":
                            return this._sendPhoto(id, answer.content, answer.options);
                        case "voice":
                            return this._sendVoice(id, answer.content, answer.options);
                        case "audio":
                            return this._sendAudio(id, answer.content, answer.options);
                        case "document":
                            return this._sendDocument(id, answer.content, answer.options);
                        case "sticker":
                            return this._sendSticker(id, answer.content, answer.options);
                        case "video":
                            return this._sendVideo(id, answer.content, answer.options);
                        case "location":
                            return this._sendLocation(id, answer.content, answer.options);
                        case "chat_action":
                            return this._sendChatAction(id, answer.content);
                    }
                }
            }
        }
    }, {
        key: '_interpolate',
        value: function _interpolate(str, props) {
            if (!str) return "";
            return str.replace(/\$([\w\.]+)/g, function (original, key) {
                var keys = key.split('.');
                var value = props[keys.shift()];
                while (keys.length && value != undefined) {
                    var k = keys.shift();
                    value = k ? value[k] : value + '.';
                }
                return value != undefined ? value : original;
            });
        }
    }, {
        key: 'requestRate',
        set: function set(rate) {
            if (typeof rate !== 'number' || rate <= 0 || rate > RATE_LIMIT) {
                this.requestRate = DEFAULT_RATE;
                return false;
            } else {
                this._requestRate = rate;
                if (this.intervalID) clearInterval(this.intervalID);
                this.intervalID = setInterval(this._execRequest.bind(this), 1000 / this._requestRate);
            }
        }
    }]);

    return TelegramBot;
}(EventEmitter);

module.exports = TelegramBot;

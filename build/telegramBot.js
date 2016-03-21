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

// must be greater than 0 and less or equal to 30 according to telegram request per second actual limit (21/03/2016)
var RATE_LIMIT = 30;
var DEFAULT_RATE = 25;

var requestPromise = Promise.promisify(request);

/**
 * Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a SSL certificate.
 * Emits `message` when a message arrives.
 *
 * @class TelegramBot
 * @constructor
 * @param {String} token Bot Token
 * @param {Object} [options]
 * @param {Boolean|Object} [options.webHook=false] Set true to enable WebHook or set options
 * @param {String} [options.webHook.key] PEM private key to webHook server.
 * @param {String} [options.webHook.cert] PEM certificate (public) to webHook server.
 * @param {String} [options.requestRate] Request rate limit per second
 * @see https://core.telegram.org/bots/api
 */

var TelegramBot = function (_EventEmitter) {
    _inherits(TelegramBot, _EventEmitter);

    function TelegramBot(token, options) {
        _classCallCheck(this, TelegramBot);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TelegramBot).call(this));

        options = options || {};
        _this.options = options;
        _this.token = token;
        _this.messageTypes = ['text', 'audio', 'document', 'photo', 'sticker', 'video', 'voice', 'contact', 'location', 'new_chat_participant', 'left_chat_participant', 'new_chat_title', 'new_chat_photo', 'delete_chat_photo', 'group_chat_created']; // Telegram message events

        _this.textRegexpCallbacks = [];
        _this.onReplyToMessages = [];

        _this.requestQueue = [];
        _this.requestRate = options.requestRate;

        _this.processUpdate = _this._processUpdate.bind(_this);

        if (options.webHook) {
            _this._WebHook = new TelegramBotWebHook(token, options.webHook, _this.processUpdate);
        }

        // handling onText with regex shortcut
        _this.on('text', function (message) {
            debug('Text message');
            var execNext = true;
            this.textRegexpCallbacks.forEach(function (reg) {
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

        // handling onReplyToMessagge shortcut
        _this.on('reply_to_message', function (message) {
            // Only callbacks waiting for this message
            var execNext = true;
            this.onReplyToMessages.forEach(function (reply) {
                // Message from the same chat
                if (reply.chatId === message.chat.id) {
                    // Responding to that message
                    if (reply.messageId === message.reply_to_message.message_id) {
                        // Resolve the promise
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

    /**
     * Set max number of request to telegram server per second
     * @param   {Number}  rate  new request rate number
     * @return  {Boolean}   false in case of wrong param
     * @see     https://core.telegram.org/bots/faq#broadcasting-to-users
     */


    _createClass(TelegramBot, [{
        key: '_execRequest',


        /**
         * Execute first request in the request queue, as many as the request rate is, per second
         * @throws {Error} parsed telegram error response
         * @private
         */
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

        /**
         * Set message function to filter receiving updates
         * @param   {Function}  filter  function to be used to filter message
                                passing to it the update obj received
         * @return  {Boolean}   false in case of wrong param, true if no errors occur
         * @see     https://core.telegram.org/bots/api#update
         */

    }, {
        key: '_processUpdate',


        /**
         * Process new message received, filtering it with specified filter
         * @param {object} update message received
         * @private
         */
        value: function _processUpdate(update) {
            debug('Filtering');
            if (this._filter && !this._filter(update)) return;

            debug('Process Update %j', update);
            var message = update.message;
            var inline_query = update.inline_query;
            var chosen_inline_result = update.chosen_inline_result;

            if (message) {
                debug('Process Update message %j', message);
                this.emit('message', message);
                var processMessageType = function processMessageType(messageType) {
                    if (message[messageType]) {
                        //debug('Emtting %s: %j', messageType, message);
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

        /**
         * Push the new received request into the request queue
         * @throws {Error} when token is not provided
         * @param   {string}  path      path to send the request to
         * @param   {object}  [options] request to be pushed into the queue
         * @return {Promise}
         * @private
         */

    }, {
        key: '_request',
        value: function _request(path, options) {
            if (!this.token) {
                throw new Error('Telegram Bot Token not provided!');
            }
            options = options || {};
            if (options.form) {
                var replyMarkup = options.form.reply_markup;
                if (replyMarkup && typeof replyMarkup !== 'string') {
                    // reply_markup must be passed as JSON stringified to Telegram
                    options.form.reply_markup = JSON.stringify(replyMarkup);
                }
            }
            options.url = this._buildURL(path);

            return new Promise(function (resolve, reject) {
                this.requestQueue.push({
                    options: options,
                    resolve: resolve,
                    reject: reject
                });
            }.bind(this));
        }

        /**
         * Generates url with bot token and provided path/method you want to be got/executed by bot
         * @return {String} url
         * @param {String} path
         * @private
         * @see https://core.telegram.org/bots/api#making-requests
         */

    }, {
        key: '_buildURL',
        value: function _buildURL(path) {
            return URL.format({
                protocol: 'https',
                host: 'api.telegram.org',
                pathname: '/bot' + this.token + '/' + path
            });
        }

        /**
         * Returns basic information about the bot in form of a `User` object.
         * @return {Promise}
         * @see https://core.telegram.org/bots/api#getme
         */

    }, {
        key: 'getMe',
        value: function getMe() {
            var path = 'getMe';
            return this._request(path);
        }

        /**
         * Specify an url to receive incoming updates via an outgoing webHook.
         * @param {String} url URL where Telegram will make HTTP Post. Leave empty to
         * delete webHook.
         * @param {String|stream.Stream} [cert] PEM certificate key (public).
         * @see https://core.telegram.org/bots/api#setwebhook
         */

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

        /**
         * Use this method to receive incoming updates using long polling
         * @param  {Number|String} [timeout] Timeout in seconds for long polling.
         * @param  {Number|String} [limit] Limits the number of updates to be retrieved.
         * @param  {Number|String} [offset] Identifier of the first update to be returned.
         * @return {Promise} Updates
         * @see https://core.telegram.org/bots/api#getupdates
         */

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

        /**
         * Send answers to an inline query.
         * @param  {String} inlineQueryId Unique identifier of the query
         * @param  {InlineQueryResult[]} results An array of results for the inline query
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @see https://core.telegram.org/bots/api#answerinlinequery
         */

    }, {
        key: 'answerInlineQuery',
        value: function answerInlineQuery(answer) {
            if (!answer || !answer.inline_query_id || !answer.results) throw new ReferenceError('answer, inline_query_id or text are not specified');
            var form = answer.options || {};
            form.inline_query_id = answer.inlineQueryId;
            form.results = JSON.stringify(answer.results);
            return this._request('answerInlineQuery', { form: form });
        }

        /**
         * Forward messages of any kind.
         * @param  {Number|String} chatId     Unique identifier for the message recipient
         * @param  {Number|String} fromChatId Unique identifier for the chat where the
         * original message was sent
         * @param  {Number|String} messageId  Unique message identifier
         * @return {Promise}
         */

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

        /**
         * Format send data according to telegram info
         * @throws {Error} Unsupported Buffer file type
         * @param   {object} type file format
         * @param   {object} data given file
         * @returns {Array}  array with data format and file id of the specified file
         * @private
         */

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

        /**
         * Send text message.
         * @param  {Number|String} chatId Unique identifier for the message recipient
         * @param  {String} text Text of the message to be sent
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendmessage
         */

    }, {
        key: '_sendMessage',
        value: function _sendMessage(chatId, text, options) {
            var form = options || {};
            form.chat_id = chatId;
            form.text = text;
            return this._request('sendMessage', { form: form });
        }

        /**
         * Send photo
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {String|stream.Stream|Buffer} photo A file path or a Stream. Can
         * also be a `file_id` previously uploaded
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendphoto
         */

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

        /**
         * Send audio
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {String|stream.Stream|Buffer} audio A file path, Stream or Buffer.
         * Can also be a `file_id` previously uploaded.
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendaudio
         */

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

        /**
         * Send Document
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {String|stream.Stream|Buffer} doc A file path, Stream or Buffer.
         * Can also be a `file_id` previously uploaded.
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendDocument
         */

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

        /**
         * Send .webp stickers.
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {String|stream.Stream|Buffer} sticker A file path, Stream or Buffer.
         * Can also be a `file_id` previously uploaded. Stickers are WebP format files.
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendsticker
         */

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

        /**
         * Use this method to send video files, Telegram clients support mp4 videos (other formats may be sent as Document).
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {String|stream.Stream|Buffer} video A file path or Stream.
         * Can also be a `file_id` previously uploaded.
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendvideo
         */

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

        /**
         * Send voice
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {String|stream.Stream|Buffer} voice A file path, Stream or Buffer.
         * Can also be a `file_id` previously uploaded.
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendvoice
         */

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

        /**
         * Send chat action.
         * `typing` for text messages,
         * `upload_photo` for photos, `record_video` or `upload_video` for videos,
         * `record_audio` or `upload_audio` for audio files, `upload_document` for general files,
         * `find_location` for location data.
         *
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {String} action Type of action to broadcast.
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendchataction
         */

    }, {
        key: '_sendChatAction',
        value: function _sendChatAction(chatId, action) {
            var form = {
                chat_id: chatId,
                action: action
            };
            return this._request('sendChatAction', { form: form });
        }

        /**
         * Use this method to get a list of profile pictures for a user.
         * Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.
         *
         * @param  {Number|String} userId  Unique identifier of the target user
         * @param  {Number} [offset] Sequential number of the first photo to be returned. By default, all photos are returned.
         * @param  {Number} [limit] Limits the number of photos to be retrieved. Values between 1—100 are accepted. Defaults to 100.
         * @return {Promise}
         * @see https://core.telegram.org/bots/api#getuserprofilephotos
         */

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

        /**
         * Send location.
         * Use this method to send point on the map.
         *
         * @param  {Number|String} chatId  Unique identifier for the message recipient
         * @param  {Float} latitude Latitude of location
         * @param  {Float} longitude Longitude of location
         * @param  {Object} [options] Additional Telegram query options
         * @return {Promise}
         * @private
         * @see https://core.telegram.org/bots/api#sendlocation
         */

    }, {
        key: '_sendLocation',
        value: function _sendLocation(chatId, latitude, longitude, options) {
            var form = options || {};
            form.chat_id = chatId;
            form.latitude = latitude;
            form.longitude = longitude;
            return this._request('sendLocation', { form: form });
        }

        /**
         * Get file.
         * Use this method to get basic info about a file and prepare it for downloading.
         * Attention: link will be valid for 1 hour.
         *
         * @param  {String} fileId  File identifier to get info about
         * @return {Promise}
         * @see https://core.telegram.org/bots/api#getfile
         */

    }, {
        key: 'getFile',
        value: function getFile(fileId) {
            var form = { file_id: fileId };
            return this._request('getFile', { form: form });
        }

        /**
         * Get link for file.
         * Use this method to get link for file for subsequent use.
         * Attention: link will be valid for 1 hour.
         *
         * This method is a sugar extension of the (getFile)[#getfilefileid] method, which returns just path to file on remote server (you will have to manually build full uri after that).
         *
         * @param  {String} fileId  File identifier to get info about
         * @return {Promise} promise Promise which will have *fileURI* in resolve callback
         * @see https://core.telegram.org/bots/api#getfile
         */

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

        /**
         * Downloads file in the specified folder.
         * This is just a sugar for (getFile)[#getfilefiled] method
         *
         * @param  {String} fileId  File identifier to get info about
         * @param  {String} downloadDir Absolute path to the folder in which file will be saved
         * @return {Promise} promise Promise, which will have *filePath* of downloaded file in resolve callback
         */

    }, {
        key: 'downloadFile',
        value: function downloadFile(fileId, downloadDir) {
            return this.getFileLink(fileId).then(function (fileURI) {
                var fileName = fileURI.slice(fileURI.lastIndexOf('/') + 1);
                // TODO: Ensure fileName doesn't contains slashes
                var filePath = downloadDir + '/' + fileName;
                return new Promise(function (resolve, reject) {
                    request({ uri: fileURI }).pipe(fs.createWriteStream(filePath)).on('error', reject).on('close', function () {
                        resolve(filePath);
                    });
                });
            });
        }

        /**
         * Register a RegExp to test against an incomming text message
         * @param  {RegExp}   regexp       RegExp to be executed with `exec`.
         * @param  {Function} callback     Callback will be called with 2 parameters, the `msg` and the result
         * of executing `regexp.exec` on message text.
         * @param  {Boolean}  [execNext]     flag that allow multiple regex match
         */

    }, {
        key: 'onText',
        value: function onText(regexp, callback, execNext) {
            var textRegexpCallback = { regexp: regexp, callback: callback, execNext: execNext };
            this.textRegexpCallbacks.push(textRegexpCallback);
        }

        /**
         * Register a reply to wait for a message response
         * @param  {Number|String}   chatId       The chat id where the message cames from.
         * @param  {Number|String}   messageId    The message id to be replied.
         * @param  {Function} callback     Callback will be called with the reply message.
         * @param  {Boolean}  [execNext]     flag that allow next regex match
         */

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

        /**
         * Send answer (or a answer array) to a given id (or a ids array) according to our answer format
         * @param   {Number|Array} chatId Unique identifier of target chat or a array of them
         * @param   {Object|Array} answer Object or array of Object rapresenting the answer to send
         * @return  {Array}         Array of promises of each send effected
         */

    }, {
        key: 'send',
        value: function send(id, answer) {
            var _this2 = this;

            if (Array.isArray(id)) {
                var promises = [];
                id.forEach(function (id) {
                    promises.push(_this2.send(id, answer));
                });
                return promises;
            } else {
                if (Array.isArray(answer)) {
                    var promises = [];
                    answer.forEach(function (answer) {
                        promises.push(_this2.send(id, answer));
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

        /**
         * Substitute properties in a string with their value.
         * Properties start with a dollar sign, and can contain nested properties,
         * by separating properties by a dot. In that case the provided object
         * Variables without matching value will be left untouched.
         * 
         * @param   {String} str     String containing properties.
         * @param   {Object} props   Object with property values to be replaced.
         * @returns  {String} interpolatedStr
         * @private
         */

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
    }, {
        key: 'filter',
        set: function set(filter) {
            if (filter && typeof filter === 'function') {
                this._filter = filter;
                return true;
            } else return false;
        }
    }]);

    return TelegramBot;
}(EventEmitter);

module.exports = TelegramBot;
Node.js module to interact with official [Telegram Bot API](https://core.telegram.org/bots/api). A bot token is needed, to obtain one, talk to [@botfather](https://telegram.me/BotFather) and create a new bot. Based on Yagop [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) project.

```sh
npm install telegram-bot
```

```js
var TelegramBot = require('./telegramBot');

// create new TelegramBot
var bot = new TelegramBot('YOUR_BOT_TOKEN_HERE');

// set WebHook with url and certificate
bot.setWebHook('IP:PORT/botBOT_TOKEN', __dirname+'/crt.pem');

// Matches /echo [whatever]
bot.onText(/echo (.+)/, function (msg, match) {
    var fromId = msg.from.id;
    var answer = {
        type: 'text',
        content: match[1]
    }
    bot.send(fromId, answer);
});

// Any kind of message
bot.on('message', function (msg) {
    var chatId = msg.chat.id;
    // media answer example
    var answer = {
        type: 'photo',
        content: __dirname+'/photo.jpg',
        options: {
            caption: 'great photo !' // options like caption here. 
            // See https://core.telegram.org/bots/api#available-methods for further info about options
        }
    }
    bot.send(chatId, answer);
});
```
* * *


### Events
Every time TelegramBot receives a message, it emits a `message`. Depending on which  [message](https://core.telegram.org/bots/api#message) was received, emits an event from this ones: `text`, `audio`, `document`, `photo`, `sticker`, `video`, `voice`, `contact`, `location`, `new_chat_participant`, `left_chat_participant`, `new_chat_title`, `new_chat_photo`, `delete_chat_photo`, `group_chat_created`. Its much better to listen a specific event rather than a `message` in order to stay safe from the content.
TelegramBot emits `inline_query` when receives an [Inline Query](https://core.telegram.org/bots/api#inlinequery) and `chosen_inline_result` when receives a [ChosenInlineResult](https://core.telegram.org/bots/api#choseninlineresult). Bot must be enabled on [inline mode](https://core.telegram.org/bots/api#inline-mode)
*By Yagop project*

### WebHooks

Telegram only supports HTTPS connections to WebHooks, in order to set a WebHook a private key file and public certificate must be used. Since August 29, 2015 Telegram supports self signed ones, to generate them:
```bash
# Our private cert will be key.pem, keep in private this file.
openssl genrsa -out key.pem 2048
# Our public certificate will be crt.pem
openssl req -new -sha256 -key key.pem -out crt.pem
```
Once they are generated, the `crt.pem` can be provided to `telegramBot.setWebHook(url, crt)` as `crt`.
*By Yagop project*

## API Reference
<a name="TelegramBot"></a>

## TelegramBot
TelegramBot

**Kind**: global class  
**See**: https://core.telegram.org/bots/api  

* [TelegramBot](#TelegramBot)
    * [new TelegramBot(token, [options])](#new_TelegramBot_new)
    * [.requestRate](#TelegramBot+requestRate) ⇒ <code>Boolean</code>
    * [.filter](#TelegramBot+filter) ⇒ <code>Boolean</code>
    * [.getMe()](#TelegramBot+getMe) ⇒ <code>Promise</code>
    * [.setWebHook(url, [cert])](#TelegramBot+setWebHook)
    * [.getUpdates([timeout], [limit], [offset])](#TelegramBot+getUpdates) ⇒ <code>Promise</code>
    * [.answerInlineQuery(inlineQueryId, results, [options])](#TelegramBot+answerInlineQuery) ⇒ <code>Promise</code>
    * [.forwardMessage(chatId, fromChatId, messageId)](#TelegramBot+forwardMessage) ⇒ <code>Promise</code>
    * [.getUserProfilePhotos(userId, [offset], [limit])](#TelegramBot+getUserProfilePhotos) ⇒ <code>Promise</code>
    * [.getFile(fileId)](#TelegramBot+getFile) ⇒ <code>Promise</code>
    * [.getFileLink(fileId)](#TelegramBot+getFileLink) ⇒ <code>Promise</code>
    * [.downloadFile(fileId, downloadDir)](#TelegramBot+downloadFile) ⇒ <code>Promise</code>
    * [.onText(regexp, callback, [execNext])](#TelegramBot+onText)
    * [.onReplyToMessage(chatId, messageId, callback, [execNext])](#TelegramBot+onReplyToMessage)
    * [.send(chatId, answer)](#TelegramBot+send) ⇒ <code>Array</code>

<a name="new_TelegramBot_new"></a>

### new TelegramBot(token, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| token | <code>String</code> |  | Bot Token |
| [options] | <code>Object</code> |  |  |
| [options.webHook] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Set true to enable WebHook or set options |
| [options.webHook.key] | <code>String</code> |  | PEM private key to webHook server. |
| [options.webHook.cert] | <code>String</code> |  | PEM certificate (public) to webHook server. |
| [options.requestRate] | <code>String</code> | <code>25</code> | Request rate limit per second |

<a name="TelegramBot+requestRate"></a>

### telegramBot.requestRate ⇒ <code>Boolean</code>
Set max number of request to telegram server per second

**Kind**: instance property of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Boolean</code> - false in case of wrong param  
**See**: https://core.telegram.org/bots/faq#broadcasting-to-users  

| Param | Type | Description |
| --- | --- | --- |
| rate | <code>Number</code> | new request rate number |

<a name="TelegramBot+filter"></a>

### telegramBot.filter ⇒ <code>Boolean</code>
Set message function to filter receiving updates

**Kind**: instance property of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Boolean</code> - false in case of wrong param, true if no errors occur  
**See**: https://core.telegram.org/bots/api#update  

| Param | Type | Description |
| --- | --- | --- |
| filter | <code>function</code> | function to be used to filter message                             passing to it the update obj received |

<a name="TelegramBot+getMe"></a>

### telegramBot.getMe() ⇒ <code>Promise</code>
Returns basic information about the bot in form of a `User` object.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getme  
<a name="TelegramBot+setWebHook"></a>

### telegramBot.setWebHook(url, [cert])
Specify an url to receive incoming updates via an outgoing webHook.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#setwebhook  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | URL where Telegram will make HTTP Post. Leave empty to delete webHook. |
| [cert] | <code>String</code> &#124; <code>stream.Stream</code> | PEM certificate key (public). |

<a name="TelegramBot+getUpdates"></a>

### telegramBot.getUpdates([timeout], [limit], [offset]) ⇒ <code>Promise</code>
Use this method to receive incoming updates using long polling

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Promise</code> - Updates  
**See**: https://core.telegram.org/bots/api#getupdates  

| Param | Type | Description |
| --- | --- | --- |
| [timeout] | <code>Number</code> &#124; <code>String</code> | Timeout in seconds for long polling. |
| [limit] | <code>Number</code> &#124; <code>String</code> | Limits the number of updates to be retrieved. |
| [offset] | <code>Number</code> &#124; <code>String</code> | Identifier of the first update to be returned. |

<a name="TelegramBot+answerInlineQuery"></a>

### telegramBot.answerInlineQuery(inlineQueryId, results, [options]) ⇒ <code>Promise</code>
Send answers to an inline query.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#answerinlinequery  

| Param | Type | Description |
| --- | --- | --- |
| inlineQueryId | <code>String</code> | Unique identifier of the query |
| results | <code>Array.&lt;InlineQueryResult&gt;</code> | An array of results for the inline query |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+forwardMessage"></a>

### telegramBot.forwardMessage(chatId, fromChatId, messageId) ⇒ <code>Promise</code>
Forward messages of any kind.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| fromChatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the chat where the original message was sent |
| messageId | <code>Number</code> &#124; <code>String</code> | Unique message identifier |

<a name="TelegramBot+getUserProfilePhotos"></a>

### telegramBot.getUserProfilePhotos(userId, [offset], [limit]) ⇒ <code>Promise</code>
Use this method to get a list of profile pictures for a user.
Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getuserprofilephotos  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> &#124; <code>String</code> | Unique identifier of the target user |
| [offset] | <code>Number</code> | Sequential number of the first photo to be returned. By default, all photos are returned. |
| [limit] | <code>Number</code> | Limits the number of photos to be retrieved. Values between 1—100 are accepted. Defaults to 100. |

<a name="TelegramBot+getFile"></a>

### telegramBot.getFile(fileId) ⇒ <code>Promise</code>
Get file.
Use this method to get basic info about a file and prepare it for downloading.
Attention: link will be valid for 1 hour.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getfile  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |

<a name="TelegramBot+getFileLink"></a>

### telegramBot.getFileLink(fileId) ⇒ <code>Promise</code>
Get link for file.
Use this method to get link for file for subsequent use.
Attention: link will be valid for 1 hour.

This method is a sugar extension of the (getFile)[#getfilefileid] method, which returns just path to file on remote server (you will have to manually build full uri after that).

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Promise</code> - promise Promise which will have *fileURI* in resolve callback  
**See**: https://core.telegram.org/bots/api#getfile  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |

<a name="TelegramBot+downloadFile"></a>

### telegramBot.downloadFile(fileId, downloadDir) ⇒ <code>Promise</code>
Downloads file in the specified folder.
This is just a sugar for (getFile)[#getfilefiled] method

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Promise</code> - promise Promise, which will have *filePath* of downloaded file in resolve callback  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |
| downloadDir | <code>String</code> | Absolute path to the folder in which file will be saved |

<a name="TelegramBot+onText"></a>

### telegramBot.onText(regexp, callback, [execNext])
Register a RegExp to test against an incomming text message

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp</code> | RegExp to be executed with `exec`. |
| callback | <code>function</code> | Callback will be called with 2 parameters, the `msg` and the result of executing `regexp.exec` on message text. |
| [execNext] | <code>Boolean</code> | flag that allow multiple regex match |

<a name="TelegramBot+onReplyToMessage"></a>

### telegramBot.onReplyToMessage(chatId, messageId, callback, [execNext])
Register a reply to wait for a message response

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | The chat id where the message cames from. |
| messageId | <code>Number</code> &#124; <code>String</code> | The message id to be replied. |
| callback | <code>function</code> | Callback will be called with the reply message. |
| [execNext] | <code>Boolean</code> | flag that allow next regex match |

<a name="TelegramBot+send"></a>

### telegramBot.send(chatId, answer) ⇒ <code>Array</code>
Send answer (or a answer array) to a given id (or a ids array)

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Array</code> - Array of promises of each send effected  
**See**: https://core.telegram.org/bots/api#available-methods info about format and contents  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>Array</code> | Unique identifier of target chat or a array of them |
| answer | <code>Object</code> &#124; <code>Array</code> |  |
| answer.type | <code>String</code> | Type of data to be sent |
| answer.content | <code>Any</code> | The data to be sent (it changes based on the type) |
| [answer.options] | <code>Object</code> | Additional Telegram query options |

* * *

## License
telegram-bot is available under the [MIT license](https://opensource.org/licenses/MIT)
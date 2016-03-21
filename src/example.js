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
//roba iniziale

'use strict';

var TelegramBot = require('./telegramBot');

var bot = new TelegramBot('207425840:AAG74fGTRrHlrrsWBpKnufHp3fVV5RyyS3Y', { polling: true });
console.log('started');

bot.filter = function (update) {
    if (update.message.text === "stop") return false;
    return true;
};

bot.onText(/uno/i, function (msg) {
    bot.send(msg.chat.id, {
        type: 'text',
        content: 'risposta to ciao'
    }).then(function (data) {
        console.log('success: ' + data.text);
    }, function (error) {
        console.log('error: ' + error);
    });
}, false);

bot.onText(/due/i, function (msg) {
    bot.send(msg.chat.id, {
        type: 'text',
        content: 'risposta to ciao de'
    }).then(function (data) {
        console.log('success: ' + data.text);
    }, function (error) {
        console.log('error: ' + error);
    });
}, false);

bot.onText(/getid/i, function (msg) {
    console.log(bot.send([5285936, msg.chat.id], [{ type: 'text', content: msg.chat.id }, { type: 'text', content: msg.chat.id + 252895789 }]));
}, true);

bot.getUpdates(5, 5, 5).then(function (data) {
    console.log(data);
});
/*(function (){
    
})();

for(let i = 0; i < 3; i++){
    bot._sendMessage(166766197, 'ciccio').then(data => {
        console.log('i:' + i + ', data:' + data);
    });
}*/

/*
bot.onText(/troppo/i, function(msg){
    bot._sendPhoto({
        chat_id: msg.chat.id,
        photo: 'build/img.jpg',
        options: {
            'caption': 'foto bella'
        }
    });
}, true);
bot.onText(/bello/i, function(msg){
    bot.sendMessage({
        chat_id: msg.chat.id,
        text: 'risposta to bello'
    });
}, true);
bot.onText(/cavolfiore/i, function(msg){
    bot.requestRate = function(){
        var ciccio = 5;};
    bot.sendMessage({
        chat_id: msg.chat.id,
        text: 'risposta to cavolfiore'
    });
}, false);
bot.onText(/ciclo/i, function(msg){
    bot.requestRate = 30;
    bot.sendMessage({
        chat_id: msg.chat.id,
        text: 'risposta to ciclo'
    });
}, false);

bot.onText(/location/i, function(msg){
    bot.sendLocation(msg.chat.id, 53.11, 85.56);
}, false);*/
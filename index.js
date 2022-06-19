const nearAPI = require("near-api-js");
const { connect, utils } = nearAPI;
const { keyStores } = nearAPI;
const homedir = require("os").homedir();
const CREDENTIALS_DIR = ".near-credentials";
const credentialsPath = require("path").join(homedir, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

let TelegramBot = require('node-telegram-bot-api');
let token = '5191999274:AAEL************DNi******';


const bot = new TelegramBot(token, { polling: true });
let fs = require('fs');


bot.setMyCommands([
  { command: "/start", description: "Запустить бота" },
  { command: "/delete", description: "Удалить адрес с фермы" },
  { command: "/info", description: "Инструкция" },

]);

var options = {
  reply_markup: JSON.stringify({
    resize_keyboard: true,
    keyboard: [
      [{ text: 'Баланс фермы' }],
    ],
  }),
  parse_mode: 'HTML'
};


const config = {
  networkId: "mainnet",
  keyStore, // optional if not signing transactions
  nodeUrl: "https://rpc.mainnet.near.org",
  walletUrl: "https://wallet.mainnet.near.org",
  helperUrl: "https://helper.mainnet.near.org",
  explorerUrl: "https://explorer.mainnet.near.org"
};

bot.on('message', async msg => {
  const chatID = msg.chat.id
  const text = msg.text
  let memory_list = await readFile("./memory_list.json")
  memory_list = JSON.parse(memory_list)

  if (text == '/delete'){
    bot.sendMessage(chatID, `Для удаления аккаунта(-ов) напишите сообщение в формате:\n/delete test1.near test2.near`, options)
  }
  if (text.startsWith('/delete') && text != '/delete') {
    try {
      let respone = text.split(" ")

      let keys = Object.keys(memory_list)
      if (keys.indexOf(`${chatID}`) == -1) { bot.sendMessage(chatID, `У вас нету аккаунтов для удаления`, options); return }
      if (memory_list[chatID].length == 0) { bot.sendMessage(chatID, `У вас нету аккаунтов для удаления`, options); return }

      let list_for_deleting = respone
      list_for_deleting.splice(0, 1); // 2nd parameter means remove one item only

      console.log(list_for_deleting);


      for (const near_ac of list_for_deleting) {
        const index = memory_list[chatID].indexOf(near_ac);
        if (index > -1) {
          memory_list[chatID].splice(index, 1); // 2nd parameter means remove one item only
          bot.sendMessage(chatID, `Аккаунт ${near_ac} удален`, options)
        } else { bot.sendMessage(chatID, `Аккаунта ${near_ac} НЕ было в вашем списке`, options) }

      }




      memory_list = JSON.stringify(memory_list, null, '\t')
      writeFile(memory_list, "./memory_list.json")
      return
    } catch (error) { console.log(error); }
  }
  if (text.endsWith('.near')) {
    try {      
      let respone = text.split(" ")
      console.log(respone);

      let keys = Object.keys(memory_list)
      if (keys.indexOf(`${chatID}`) == -1) { memory_list[chatID] = [] }

      for (const near_ac of respone) {

        let list_accs_current_user = memory_list[chatID]


        if (list_accs_current_user.indexOf(near_ac) == -1) {

          let balance_only = await checkBalanceOnly(near_ac)
          if (balance_only > 0) {
            memory_list[chatID].push(near_ac)
            bot.sendMessage(chatID, `Аккаунт: ${near_ac} добавлен\nТекущий баланс: ${balance_only}`, options)
          } else { bot.sendMessage(chatID, `Аккаунт: ${near_ac} НЕ добавлен\nПопробуйте еще раз`, options) }

        } else { bot.sendMessage(chatID, `Аккаунт: ${near_ac} УЖЕ БЫЛ добавлен`, options) }

      }

      memory_list = JSON.stringify(memory_list, null, '\t')
      writeFile(memory_list, "./memory_list.json")


      return
    } catch (error) { console.log(error); }

  }

  if (text == "/start") {
    bot.sendMessage(chatID, `Добро пожаловать в бота для отслеживания фермы Near`)
    return
  }
  if (text == '/info'){
    let send_txt = `1. Для добавления аккаунта(-ов) напишите адреса аккаунтов одним сообщением или несколькими разделяя их пробелами. Например:`
    send_txt += `\n<b>test1.near test2.near test3.near</b>`
    send_txt += `\n\n2. Для удаления аккаунтов напишите сообщение в формате \n<b>/delete test1.near test2.near test3.near</b>\n(Одним сообщением несколько слов, где первое /delete, а последующие - адреса аккаунтов)`
    send_txt += `\n\n3. Для просмотра списка фермы с балансами нажмите кнопку <b>Баланс фермы</b> или отправте текстовое сообщение <b>Баланс фермы</b>`

    bot.sendMessage(chatID, send_txt, options)
    return
  }
  if (text == "Баланс фермы") {
    checkBalance(chatID);
    return
  }
})

// чтение локальных файлов
function readFile(origin) {
  return new Promise((resolve, reject) => {
    fs.readFile(origin, (err, buf) => {
      if (err) reject(err);
      resolve(buf.toString());
    })
  });
}
// запись локальных файлов
function writeFile(content, destination) {
  fs.writeFile(destination, content, err => {
    if (err) {
      console.error(err)
      return
    }

  })
}
// нажатие на кнопку "Баланс фермы"
async function checkBalance(chatID) {
  content2 = await (readFile("./memory_list.json"))
  content2 = JSON.parse(content2)

  memory_balances = await (readFile("./memory_balances.json"))
  memory_balances = JSON.parse(memory_balances)

  let message = "<b>Аккаунты вашей фермы:</b> \n\n"
  let counter = 0;
  
  if (content2[chatID].length == 0){  bot.sendMessage(chatID, `Вы еще не добавили аккаунты`); return}
  
  content2[chatID].forEach((element, i) => {

    async function dop(element) {
      balance = memory_balances[element]
      balance = balance * 100
      balance = Math.round(balance)
      balance = balance / 100

      let sum_balance = 0
      sum_balance += balance;
      sum_balance = sum_balance * 100
      sum_balance = Math.round(sum_balance)
      sum_balance = sum_balance / 100

      if (element.length == 64) {
        element = element.slice(0, 5) + "..." + element.slice(-5, 64)
      }

      message += "<code>" + element + "</code> — " + balance + "\n"
      counter += 1;
      if (counter == content2[chatID].length) {
        message += "\nВсего аккаунтов: <b>" + content2[chatID].length
        message += "</b>\nСумарный баланс: <b>" + sum_balance + " Ⓝ</b>"
        sum_balance = 0;
        await bot.sendMessage(chatID, message, options)
      }
    }

    setTimeout(function () {
      dop(element);
    }, i * 0)

  });

}
// Проверка на факт изменения баланса
async function checkslient() {
  let memory_list = await readFile("./memory_list.json")
  memory_list = JSON.parse(memory_list)

  let memory_balances = await (readFile("./memory_balances.json"))
  memory_balances = JSON.parse(memory_balances)

  let memory_balances_time = await (readFile("./memory_balances.json"))
  memory_balances_time = JSON.parse(memory_balances_time);

  for (var list_in_obj in memory_list) {  // tg-chat-id
    function dop2(list_in_obj) {
      memory_list[list_in_obj].forEach(async (near_ac, index) => {  // near-accs
        setTimeout(async function () {
          let error = 0

          let balance = await checkBalanceOnly(near_ac).catch(err => {
          });

          // notification
          if (balance - memory_balances[near_ac] > 0.06) {
            bot.sendMessage(list_in_obj, `<b> <code>${near_ac}</code></b> — ПОПОЛНЕНИЕ  ${rounded(balance - memory_balances[near_ac])} Ⓝ \nТекущий баланс: <b>${balance}</b> Ⓝ`, { parse_mode: 'HTML' })
            memory_balances_time[near_ac] = balance
          }

          else if (balance - memory_balances[near_ac] < -0.06) {
            bot.sendMessage(list_in_obj, `<b><code>${near_ac}</code></b> — РАСХОД  ${rounded(balance - memory_balances[near_ac])} Ⓝ \nТекущий баланс: <b>${balance}</b> Ⓝ`, { parse_mode: 'HTML' })
            memory_balances_time[near_ac] = balance
          }


          else if (memory_balances[near_ac] == undefined && error == 0) {
            memory_balances_time[near_ac] = balance;
          } else { memory_balances_time[near_ac] = balance }
        }, 0 * index);
      })
    }
    dop2(list_in_obj);
  }

  setTimeout(() => {
    writeFile(JSON.stringify(memory_balances_time, null, '\t'), "./memory_balances.json")
  }, 5000);

}
// Округление числа до 3 знаков после запятой
var rounded = function (number) {
  return +number.toFixed(3);
}
//Проверка баланса аккуанта в момент добавление аккаунта в бота (проверяется по один ак)
async function checkBalanceOnly(element) {
  const near = await connect(config);
  const account = await near.account(element);
  let balance = await account.getAccountBalance();
  balance = balance.available;
  balance = balance / 10 ** 21;
  //console.log(balance);
  balance = Math.round(balance)
  balance = balance / 1000;
  return balance;
}
// Тамйер 7сек на проверку изменений 
let timerId = setInterval(() => checkslient(), 7000);



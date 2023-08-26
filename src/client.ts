import { Adapter, Context } from "@satorijs/satori";
import { IrcBot } from "./bot";
import net from 'net';
import { EventEmitter } from 'node:events';
import { Message, decodeMessage, parseMessage } from "./utils";

const timeout = 1000

class MyEmitter extends EventEmitter { }

export class IrcAdapter extends Adapter.Client<IrcBot> {
  client: net.Socket
  emitter = new MyEmitter()
  constructor(ctx: Context, bot: IrcBot) {
    super(ctx, bot)
    bot.adapter = this
  }

  async start(bot: IrcBot) {
    this.client = new net.Socket()
    this.client.connect(bot.config.port, bot.config.host)
    this.client.on('connect', () => {
      bot.logger.info('connected')
      this.preprocess()
    })
    this.client.on('data', async (data) => {
      let list = data.toString().split('\r\n').filter(v => v)

      for (const response of list) {
        const message = parseMessage(response)
        this.emitter.emit('event', message)
        bot.logger.info('receive: %c %c', response, require('util').inspect(message, false, null, true))
        if (message.command === '903') {
          await this.send('CAP END')
          for (const channel of bot.config.channels) {
            await this.send(`JOIN #${channel}`)
          }
        } else if (message.command === 'PING') {
          await this.send('PONG')
        } else if (message.command === 'PRIVMSG') {
          const session = decodeMessage(bot, message)
          bot.logger.info(require('util').inspect(session, false, null, true))
          if (session) bot.dispatch(session)
        }
      }
    })
  }

  async send(message: string): Promise<Message | null> {
    const type = message.split(' ')[0]
    this.client.write(`${message.trim()}\r\n`)
    await new Promise(resolve => setTimeout(resolve, timeout))
    return new Promise((r, rej) => {
      this.emitter.once('event', (data: Message) => {
        if (data.command === type) return r(data)
      })
      setTimeout(() => {
        r(null)
      }, timeout)
    })
  }

  async preprocess() {
    await this.send("CAP LS 302")
    if (this.bot.config.type === 'pass') {
      await this.send(`PASS ${this.bot.config.password}`)
    }
    await this.send(`NICK ${this.bot.config.nickname}`)
    await this.send(`USER ${this.bot.config.account} 0 * :${this.bot.config.nickname}`);
    await this.send(`CAP REQ :sasl cap-notify server-time`)
    if (this.bot.config.type === 'saslplain') {
      await this.send(`AUTHENTICATE PLAIN`)
      const authStr = Buffer.from(`${this.bot.config.account}\0${this.bot.config.account}\0${this.bot.config.password}`).toString('base64')
      await this.send(`AUTHENTICATE ${authStr}`)
    }
  }

  async stop() {
    this.client.destroy()
  }
}

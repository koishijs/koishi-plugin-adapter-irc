import { MessageEncoder, h } from "@satorijs/satori";
import { IrcBot } from "./bot";
import { IrcAdapter } from "./client";

export class IrcMessageEncoder extends MessageEncoder<IrcBot> {
  buffer = ''
  async flush(): Promise<void> {
    const adapter = this.bot.adapter as IrcAdapter
    let list = this.buffer.split('\n').filter(v => v)
    for (const message of list) {
      let target = this.session.isDirect ?
        this.session.userId :
        '#' + this.session.channelId
      adapter.send(`PRIVMSG ${target} :${message}`)
    }
  }

  async visit(element: h) {
    const { type, attrs, children } = element
    if (type === 'text') {
      this.buffer += attrs.content
    } else if (type === 'p') {
      if (!this.buffer.endsWith('\n')) this.buffer += '\n'
      await this.render(children)
      this.buffer += '\n'
    } else {
      await this.render(children)
    }
  }
}

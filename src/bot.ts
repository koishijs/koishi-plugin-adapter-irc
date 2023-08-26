import { Bot, Context, Logger, Schema } from '@satorijs/satori'
import { IrcAdapter } from './client'
import { IrcMessageEncoder } from './message'

export class IrcBot extends Bot<IrcBot.Config> {
  static MessageEncoder = IrcMessageEncoder
  logger: Logger
  constructor(ctx: Context, config: IrcBot.Config) {
    super(ctx, config)

    this.platform = 'irc'
    this.logger = ctx.logger('irc')
    this.selfId = config.account
    ctx.plugin(IrcAdapter, this)
  }
}

export namespace IrcBot {
  export interface Config extends Bot.Config {
    host: string
    port: number
    nickname: string
    account: string
    password: string
    type: "saslplain" | "pass"
    channels: string[]
  }
  // @ts-ignore
  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      host: Schema.string().required(),
      port: Schema.number().default(6667),
      channels: Schema.array(String)
    }),
    Schema.object({
      nickname: Schema.string().required(),
      account: Schema.string().required().description("Ident"),
      password: Schema.string().role('secret').required(),
      type: Schema.union([
        Schema.const('saslplain').description('SASL Plain'),
        Schema.const('pass').description('Server Password')
      ]).role('radio')
    }).description('Identity')
  ] as any)
}

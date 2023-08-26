import { h } from "@satorijs/satori";
import { IrcBot } from "./bot";

export type CommandType = 'reply' | 'error' | 'normal';
export interface Message {
  prefix?: string;
  server?: string;
  nick?: string;
  user?: string;
  host?: string;
  args: string[];
  command?: string;
  rawCommand?: string;
  commandType: CommandType;
  time?: Date
}

export function parseMessage(line: string, stripColors?: boolean): Message {
  const message: Message = {
    args: [],
    commandType: 'normal',
  };
  // if (stripColors) {
  //     line = stripColorsAndStyle(line);
  // }

  if (line.startsWith('@time=')) {
    const timeMatch = line.match(/^@time=([^ ]+) +/);
    if (timeMatch) {
      message.time = new Date(timeMatch[1]);
      line = line.replace(/^@time=[^ ]+ +/, '');
    }
  }

  // Parse prefix
  let match = line.match(/^:([^ ]+) +/);
  if (match) {
    message.prefix = match[1];
    line = line.replace(/^:[^ ]+ +/, '');
    match = message.prefix.match(/^([_a-zA-Z0-9\[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);
    if (match) {
      message.nick = match[1];
      message.user = match[3];
      message.host = match[4];
    }
    else {
      message.server = message.prefix;
    }
  }

  // Parse command
  match = line.match(/^([^ ]+) */);
  message.command = match?.[1];
  message.rawCommand = match?.[1];
  line = line.replace(/^[^ ]+ +/, '');

  let middle, trailing;

  // Parse parameters
  if (line.search(/^:| +:/) !== -1) {
    match = line.match(/(.*?)(?:^:| +:)(.*)/);
    if (!match) {
      throw Error('Invalid format, could not parse parameters');
    }
    middle = match[1].trimEnd();
    trailing = match[2];
  }
  else {
    middle = line;
  }

  if (middle.length) { message.args = middle.split(/ +/); }

  if (typeof (trailing) !== 'undefined' && trailing.length) { message.args.push(trailing); }

  return message;
}

export function decodeMessage(bot: IrcBot, message: Message) {
  const session = bot.session()
  if (message.args[0][0] === '#') {
    session.channelId = message.args[0].slice(1)
    session.isDirect = false
  } else {
    session.isDirect = true
  }
  session.elements = [h.text(message.args[1])]
  session.timestamp = message.time?.valueOf() ?? Date.now()
  session.userId = message.user
  session.author = {
    userId: message.user,
    nickname: message.nick
  }
  session.type = "message"
  return session
}

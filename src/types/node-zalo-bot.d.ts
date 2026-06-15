declare module "node-zalo-bot" {
  import { EventEmitter } from "events";

  export interface ZaloMessage {
    message_id: string;
    from: {
      id: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: string;
      type: string;
    };
    date: number;
    text?: string;
    sticker?: any;
    photo?: any;
  }

  export interface ZaloUpdate {
    update_id: number;
    message?: ZaloMessage;
  }

  export default class ZaloBot extends EventEmitter {
    constructor(token: string, options?: any);
    sendMessage(chatId: string, text: string, options?: any): Promise<any>;
    sendSticker(chatId: string, stickerId: string, options?: any): Promise<any>;
    sendChatAction(chatId: string, action: "typing", options?: any): Promise<any>;
    startPolling(options?: any): void;
    isPolling(): boolean;
    setWebHook(url: string, options?: any): Promise<any>;
    deleteWebHook(options?: any): Promise<any>;
    processUpdate(update: ZaloUpdate): void;
  }
}

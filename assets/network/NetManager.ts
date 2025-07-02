import { NetNode, NetConnectOptions } from "./NetNode";
import { NetData, CallbackObject } from "./NetInterface";

export class NetManager {
    private static _instance: NetManager = null;
    protected _channels: { [key: number]: NetNode } = {};

    public static getInstance(): NetManager {
        if (this._instance == null) {
            this._instance = new NetManager();
        }
        return this._instance;
    }

    // 添加Node，返回ChannelID
    public setNetNode(newNode: NetNode, channelId: number = 0) {
        this._channels[channelId] = newNode;
    }

    // 移除Node
    public removeNetNode(channelId: number) {
        delete this._channels[channelId];
    }

    public getNetNode(channelId: number) {
        return this._channels[channelId];
    }

    // 调用Node连接
    public connect(options: NetConnectOptions, channelId: number = 0): boolean {
        if (this._channels[channelId]) {
            return this._channels[channelId].connect(options);
        }
        return false;
    }

    // 调用Node发送
    public send(buf: NetData, channelId: number = 0): boolean {
        let node = this._channels[channelId];
        if (node) {
            return node.send(buf);
        }
        return false;
    }

    // 调用Node关闭
    public close(channelId: number = 0,needReconnect=false) {
        if (this._channels[channelId]) {
            return this._channels[channelId].closeSocket(needReconnect);
        }
    }
}
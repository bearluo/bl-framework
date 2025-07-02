import { log } from "../common/FWLog";
import { ISocket, INetworkTips, IProtocolHelper, RequestObject, CallbackObject, NetData, NetCallFunc } from "./NetInterface";

/*
*   CocosCreator网络节点基类，以及网络相关接口定义
*   1. 网络连接、断开、请求发送、数据接收等基础功能
*   2. 心跳机制
*   3. 断线重连 + 请求重发
*   4. 调用网络屏蔽层
*
*   2018-5-7 by 宝爷
*/

type ExecuterFunc = (callback: CallbackObject, buffer: NetData) => void;
type CheckFunc = (checkedFunc: VoidFunc) => void;
type VoidFunc = () => void;
type BoolFunc = () => boolean;

export enum NetTipsType {
    Connecting,
    ReConnecting,
}

export enum NetNodeState {
    Closed,                     // 已关闭
    Connecting,                 // 连接中
    Checking,                   // 验证中
    Working,                    // 可传输数据
}

export interface NetConnectOptions {
    host?: string,              // 地址
    port?: number,              // 端口
    protocol?: string,          // websocket ws wss
    url?: string,               // url，与地址+端口二选一
    autoReconnect?: number,     // -1 永久重连，0不自动重连，其他正整数为自动重试次数
}

export class NetNode {
    protected _connectOptions: NetConnectOptions = null;
    protected _autoReconnect: number = 0;
    protected _isSocketInit: boolean = false;                               // Socket是否初始化过
    protected _isSocketOpen: boolean = false;                               // Socket是否连接成功过
    protected _state: NetNodeState = NetNodeState.Closed;                   // 节点当前状态
    protected _socket: ISocket = null;                                      // Socket对象（可能是原生socket、websocket、wx.socket...)

    protected _networkTips: INetworkTips = null;                            // 网络提示ui对象（请求提示、断线重连提示等）
    protected _protocolHelper: IProtocolHelper = null;                      // 包解析对象
    protected _disconnectCallback: (event: CloseEvent) => void = null;                         // 断线回调
    protected _callbackExecuter: ExecuterFunc = null;                       // 回调执行

    protected _keepAliveTimer: any = null;                                  // 心跳定时器
    protected _receiveMsgTimer: any = null;                                 // 接收数据定时器
    protected _reconnectTimer: any = null;                                  // 重连定时器
    protected _heartTime: number = 3000;                                    // 心跳间隔
    protected _receiveTime: number = 6000;                                  // 多久没收到数据断开
    protected _reconnetTimeOut: number = 3000;                              // 重连间隔
    protected _listener: { [key: number]: CallbackObject[] } = {}           // 监听者列表

    /********************** 网络相关处理 *********************/
    public init(socket: ISocket, protocol: IProtocolHelper, networkTips: INetworkTips = null, execFunc: ExecuterFunc = null) {
        log.debug(`NetNode init socket`);
        this._socket = socket;
        this._protocolHelper = protocol;
        this._networkTips = networkTips;
        this._callbackExecuter = execFunc ? execFunc : (callback: CallbackObject, buffer: NetData) => {
            callback.callback.call(callback.target, buffer);
        }
    }

    public connect(options: NetConnectOptions,isReconnect=false): boolean {
        if (this._socket && this._state == NetNodeState.Closed) {
            if (!this._isSocketInit) {
                this.initSocket();
            }
            this._state = NetNodeState.Connecting;
            if (!this._socket.connect(options)) {
                this.updateNetTips(NetTipsType.Connecting, false);
                return false;
            }
            if(!isReconnect) {
                this._connectOptions = options;
                this._autoReconnect = options.autoReconnect ?? 0;
            }
            this.updateNetTips(NetTipsType.Connecting, true);
            return true;
        }
        return false;
    }

    protected initSocket() {
        this._socket.onConnected = (event) => { this.onConnected(event) };
        this._socket.onMessage = (msg) => { this.onMessage(msg) };
        this._socket.onError = (event) => { this.onError(event) };
        this._socket.onClosed = (event) => { this.onClosed(event) };
        this._isSocketInit = true;
    }

    protected updateNetTips(tipsType: NetTipsType, isShow: boolean) {
        if (this._networkTips) {
            if (tipsType == NetTipsType.Connecting) {
                this._networkTips.connectTips(isShow);
            } else if (tipsType == NetTipsType.ReConnecting) {
                this._networkTips.reconnectTips(isShow);
            }
        }
    }

    // 网络连接成功
    protected onConnected(event: Event) {
        log.debug("NetNode onConnected!")
        this._isSocketOpen = true;
        this._state = NetNodeState.Working;
        // 关闭连接或重连中的状态显示
        this.updateNetTips(NetTipsType.Connecting, false);
        this.updateNetTips(NetTipsType.ReConnecting, false);
    }

    // 接收到一个完整的消息包
    protected onMessage(msg: NetData): void {
        // log.printDebug(`NetNode onMessage status = ` + this._state);
        // 进行头部的校验（实际包长与头部长度是否匹配）
        if (!this._protocolHelper.checkPackage(msg)) {
            log.error(`NetNode checkHead Error`);
            return;
        }
        // 接受到数据，重新定时收数据计时器
        this.resetReceiveMsgTimer();
        // 重置心跳包发送器 不能重置 服务器收不到心跳包会踢出
        // this.resetHearbeatTimer();
        // 触发消息执行
        let rspCmd = this._protocolHelper.getPackageId(msg);
        // log.printDebug(`NetNode onMessage rspCmd = ` + rspCmd);

        let listeners = this._listener[rspCmd];
        if (null != listeners) {
            for (const rsp of listeners) {
                // log.printDebug(`NetNode execute listener cmd ${rspCmd}`);
                this._callbackExecuter(rsp, msg);
            }
        }
    }

    protected onError(event: Event) {
        log.error(event);
    }

    protected onClosed(event: CloseEvent) {
        log.debug(`onClosed!`);
        this.clearTimer();
        // 自动重连
        if (this.isAutoReconnect()) {
            this.updateNetTips(NetTipsType.ReConnecting, true);
            this._reconnectTimer = setTimeout(() => {
                this._socket.close();
                this._state = NetNodeState.Closed;
                this.connect(this._connectOptions, true);
                if (this._autoReconnect > 0) {
                    this._autoReconnect -= 1;
                }
            }, this._reconnetTimeOut);
        } else {
            this.updateNetTips(NetTipsType.ReConnecting, false);
            this._state = NetNodeState.Closed;
            this._disconnectCallback && this._disconnectCallback(event)
        }
    }

    public close() {
        this.clearTimer();
        this.rejectReconnect()
        // 关闭连接或重连中的状态显示
        this.updateNetTips(NetTipsType.Connecting, false);
        this.updateNetTips(NetTipsType.ReConnecting, false);
        if (this._socket) {
            this._socket.close();
        } else {
            this._state = NetNodeState.Closed;
        }
    }

    // 只是关闭Socket套接字（仍然重用缓存与当前状态）
    public closeSocket(needReconnect=false) {
        if(!needReconnect) {
            this.rejectReconnect()
        }
        if (this._socket) {
            this._socket.close();
        }
    }

    // 发起请求，如果当前处于重连中，进入缓存列表等待重连完成后发送
    public send(buf: NetData): boolean {
        if (this._state == NetNodeState.Working) {
            // 重置心跳包发送器
            this.resetHearbeatTimer();
            return this._socket.send(buf);
        } else if (this._state == NetNodeState.Connecting) {
            log.debug("NetNode socket is busy! current state is " + this._state);
            return false;
        } else {
            log.error("NetNode request error! current state is " + this._state);
            return false;
        }
    }
    /********************** 回调相关处理 *********************/
    public setResponeHandler(cmd: number, callback: NetCallFunc, target?: any): boolean {
        if (callback == null) {
            log.error(`NetNode setResponeHandler error ${cmd}`);
            return false;
        }
        this._listener[cmd] = [{ target, callback }];
        return true;
    }

    public addResponeHandler(cmd: number, callback: NetCallFunc, target?: any): boolean {
        if (callback == null) {
            log.error(`NetNode addResponeHandler error ${cmd}`);
            return false;
        }
        let rspObject = { target, callback };
        if (null == this._listener[cmd]) {
            this._listener[cmd] = [rspObject];
        } else {
            let index = this.getNetListenersIndex(cmd, rspObject);
            if (-1 == index) {
                this._listener[cmd].push(rspObject);
            }
        }
        return true;
    }

    public removeResponeHandler(cmd: number, callback: NetCallFunc, target?: any) {
        if (null != this._listener[cmd] && callback != null) {
            let index = this.getNetListenersIndex(cmd, { target, callback });
            if (-1 != index) {
                this._listener[cmd].splice(index, 1);
            }
        }
    }

    public cleanListeners(cmd: number = -1) {
        if (cmd == -1) {
            this._listener = {}
        } else {
            this._listener[cmd] = null;
        }
    }

    protected getNetListenersIndex(cmd: number, rspObject: CallbackObject): number {
        let index = -1;
        for (let i = 0; i < this._listener[cmd].length; i++) {
            let iterator = this._listener[cmd][i];
            if (iterator.callback == rspObject.callback
                && iterator.target == rspObject.target) {
                index = i;
                break;
            }
        }
        return index;
    }
    /********************** 心跳、超时相关处理 *********************/
    protected resetReceiveMsgTimer() {
        if (this._receiveMsgTimer !== null) {
            clearTimeout(this._receiveMsgTimer);
        }
        this._receiveMsgTimer = setTimeout(() => {
            log.warn("NetNode recvieMsgTimer close socket!");
            this._socket.close();
        }, this._receiveTime);
    }

    protected resetHearbeatTimer() {
        if (this._keepAliveTimer !== null) {
            clearTimeout(this._keepAliveTimer);
        }
        this._keepAliveTimer = setTimeout(() => {
            // !app.func.isTest() && log.printDebug("NetNode keepAliveTimer send Hearbeat");
            const data = this._protocolHelper.getHearbeat();
            if (data) {
                this.send(data);
            }
        }, this._heartTime);
    }

    protected clearTimer() {
        if (this._receiveMsgTimer !== null) {
            clearTimeout(this._receiveMsgTimer);
        }
        if (this._keepAliveTimer !== null) {
            clearTimeout(this._keepAliveTimer);
        }
        if (this._reconnectTimer !== null) {
            clearTimeout(this._reconnectTimer);
        }
    }

    public isAutoReconnect() {
        return this._autoReconnect != 0;
    }

    public rejectReconnect() {
        this._autoReconnect = 0;
        this.clearTimer();
    }

    public isWorking() {
        return this._state == NetNodeState.Working;
    }
}
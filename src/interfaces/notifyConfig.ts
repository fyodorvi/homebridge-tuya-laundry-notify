export interface NotifyConfig {
    pushed: PushedConfig;
    laundryDevices: LaundryDeviceConfig[];
}

export interface PushedConfig {
    appKey: string;
    appSecret: string;
    channelAlias: string;
}

export interface LaundryDeviceConfig {
    name: string;
    id: string;
    key: string;
    powerValueId: string;
    startValue: number;
    startDuration: number;
    endValue: number;
    endDuration: number;
    startMessage?: string;
    endMessage: string;
    exposeStateSwitch?: boolean;
}
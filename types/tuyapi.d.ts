declare module 'tuyapi' {
  import * as EventEmitter from 'events';

  export interface TuyAPI extends EventEmitter {
    new (config: { id: string; key: string });
    find(): Promise<boolean | []>;
    refresh(): Promise<void>;
    connect(): Promise<boolean>;
    on(event: 'dp-refresh', listener: (data: DPData) => void): this;
  }

  export interface DPData {
    dps: { [index: string]: any }
  }

  export default TuyAPI;
}
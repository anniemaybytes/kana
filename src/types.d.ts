export interface UserAuthResponse {
  success: boolean;
  error: string;
  id: number;
  host: string;
  channels: {
    [room: string]: boolean;
  };
}

export interface UserTimeDeltas {
  [userId: number]: {
    delta_time: number;
  };
}

export interface MessageEvent {
  nick: string;
  ident: string;
  hostname: string;
  target: string;
  message: string;
  privateMessage: boolean;
  reply: (message: string) => void;
}

export interface WHOResponse {
  nick: string;
  ident: string;
  hostname: string;
  server: string;
  real_name: string;
  away: boolean;
  num_hops_away: number;
  channel: string;
}

export interface WHOISResponse {
  nick: string;
  ident: string;
  hostname: string;
  real_name: string;
  server: string;
  server_info: string;
  channels: string;
}

export interface ChannelConfigOptions {
  persist: boolean;
  join: 'join' | 'sajoin' | 'auto';
}

export interface ChannelConfig {
  [channel: string]: ChannelConfigOptions;
}

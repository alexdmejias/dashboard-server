export type SupportedLayout = "full" | "2-col";

export interface CallbackSlot {
  name: string;
  options?: Record<string, unknown>;
}

export interface PlaylistItem {
  id: string;
  layout: SupportedLayout;
  callbacks: Record<string, CallbackSlot>;
}

export interface ClientCallback {
  name: string;
  instance: {
    name: string;
    config?: Record<string, unknown>;
  };
}

export interface ClientConfig {
  message: string;
  rotation: string[];
  currCallbackIndex: number;
  playlist: PlaylistItem[];
}

export interface ClientData {
  config: ClientConfig;
  callbacks: Record<string, ClientCallback>;
}

export interface ClientsData {
  clients: Record<string, ClientData>;
}

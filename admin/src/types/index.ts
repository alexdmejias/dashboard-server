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
  playlist: Array<{
    id: string;
    callbackName: string;
    options?: Record<string, unknown>;
  }>;
}

export interface ClientData {
  config: ClientConfig;
  callbacks: Record<string, ClientCallback>;
}

export interface ClientsData {
  clients: Record<string, ClientData>;
}

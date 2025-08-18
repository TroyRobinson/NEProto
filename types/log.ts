export interface LogMessage {
  service: string;
  direction: 'request' | 'response';
  body: unknown;
}

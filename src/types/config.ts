export interface TimeoutProfiles {
  navigation: number;
  selector: number;
  content: number;
  recovery: number;
}

export interface AppConfig {
  SEARCH_COOLDOWN: number;
  PAGE_TIMEOUT: number;
  SELECTOR_TIMEOUT: number;
  MAX_RETRIES: number;
  MCP_TIMEOUT_BUFFER: number;
  ANSWER_WAIT_TIMEOUT: number;
  RECOVERY_WAIT_TIME: number;
  USER_AGENT: string;
  TIMEOUT_PROFILES: TimeoutProfiles;
}

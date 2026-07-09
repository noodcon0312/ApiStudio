export interface Message {
  role: 'user' | 'model';
  text: string;
  codeSnapshot?: string;
  attachments?: { name: string; dataUrl: string }[];
  filesSnapshot?: Record<string, string>;
  duration?: number;
}

export type TabState = 'code' | 'preview';

export interface Project {
  id: string;
  name: string;
  messages: Message[];
  code: string;
  systemInstruction: string;
  themePrompt?: string;
  additionalSystemInstruction?: string;
  customModel: string;
  previousCode?: string;
  lastUsedAt?: number;
  mode?: 'quick' | 'full';
  files?: Record<string, string>;
}

export interface InstructionRule {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'content';
  content: string;
}

export type Theme = 'light' | 'dark';

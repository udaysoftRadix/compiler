export interface ProjectFile {
  name: string;
  content: string;
  isEntry?: boolean;
}

export interface ConsoleEntry {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  text: string;
  timestamp: number;
}

export interface Template {
  id: string;
  label: string;
  files: ProjectFile[];
}

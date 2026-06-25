export type ConversionMode = 'remux' | 'transcode';
export type AudioMode = 'copy' | 'aac' | 'none';
export type ResolutionMode = 'original' | '1080p' | '720p' | '480p';

export interface TrimSettings {
  enabled: boolean;
  start: string; // HH:MM:SS or seconds
  duration: string; // seconds
}

export interface VideoSettings {
  mode: ConversionMode;
  audioMode: AudioMode;
  audioBitrate: '128k' | '192k' | '256k';
  resolution: ResolutionMode;
  trim: TrimSettings;
}

export type ConversionStatus = 'idle' | 'loading_ffmpeg' | 'ready' | 'converting' | 'success' | 'error';

export interface ConversionProgressInfo {
  percent: number;
  time: string;
  frame: number;
  speed: string;
  size: string;
  logs: string[];
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

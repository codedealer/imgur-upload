import { MultiBar, SingleBar } from 'cli-progress';

export interface UploadResult {
  success: boolean;
  link?: string;
  id?: string;
  deletehash?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  status?: number;
  error?: string;
}

export interface FileResult {
  file?: string;
  link?: string;
  id?: string;
  deletehash?: string;
  error?: string;
  isValid?: boolean;
}

export interface Metadata {
  videoUrl?: string;
  videoTitle?: string;
  titleSuffix?: string;
}

export type ProgressBars = MultiBar;
export type ProgressBar = SingleBar;

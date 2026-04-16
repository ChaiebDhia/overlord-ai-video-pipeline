export interface PipelineContext {
  prompt: string;
  workDir: string;

  script?: {
    text: string;
    backgroundDescription: string;
    mood: string;
    wordCount: number;
    estimatedDurationSeconds: number;
  };

  voice?: {
    audioPath: string;
    durationSeconds: number;
    words: SubtitleEntry[];
  };

  visuals?: {
    backgroundPath: string;
    characterFrames: {
      mouthClosed: string;
      mouthOpen: string;
    };
    animationLogic?: {
      threshold: number;
    }
  };

  subtitles?: {
    entries: SubtitleEntry[];
    assFilePath?: string;
  };

  output?: {
    videoPath: string;
    resolution: string;
    durationSeconds: number;
  };
}

export interface SubtitleEntry {
  word: string;
  start: number;
  end: number;
}

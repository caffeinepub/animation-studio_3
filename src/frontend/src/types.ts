export type Tool =
  | "pencil"
  | "brush"
  | "eraser"
  | "fill"
  | "rect"
  | "ellipse"
  | "line"
  | "eyedropper"
  | "pan";

export interface LayerState {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  imageData: string;
}

export interface FrameState {
  id: string;
  layers: LayerState[];
  duration: number;
}

export interface ProjectState {
  id: string;
  name: string;
  width: number;
  height: number;
  frames: FrameState[];
}

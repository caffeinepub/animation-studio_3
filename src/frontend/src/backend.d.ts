import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Project {
    id: string;
    height: bigint;
    name: string;
    createdAt: Time;
    updatedAt: Time;
    frames: Array<Frame>;
    width: bigint;
}
export interface Frame {
    layers: Array<Layer>;
}
export interface Layer {
    imageData: string;
    name: string;
    locked: boolean;
    visible: boolean;
}
export interface backendInterface {
    createProject(id: string, name: string, width: bigint, height: bigint): Promise<void>;
    deleteProject(id: string): Promise<void>;
    listProjects(): Promise<Array<Project>>;
    loadProject(id: string): Promise<Project>;
    saveProject(id: string, name: string, width: bigint, height: bigint, frames: Array<Frame>): Promise<void>;
}

export type Hemisphere = 'north' | 'south';

export type CycloneCategory = 1 | 2 | 3 | 4 | 5;

export type SpeedTelegraph = 0 | 1 | 2 | 3;

export type SectorType =
  | 'safe'
  | 'outer'
  | 'navigable'
  | 'dangerous'
  | 'eyewall';

export type CameraPreset = 'chase' | 'bridge' | 'aerial';

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'quiz'
  | 'victory'
  | 'sunk';

export type QuizTriggerKind = 'observation' | 'evasion' | 'emergency';

export interface QuizQuestion {
  id: string;
  triggerKind: QuizTriggerKind;
  triggerDistanceNM: number;
  title: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  /** Relative course adjustment in degrees when answered correctly */
  safeTurnDeg: number;
  /** Relative course adjustment in degrees when answered incorrectly (pushes toward dangerous semicircle) */
  dangerTurnDeg: number;
}

export interface MissionConfig {
  id: number;
  title: string;
  oceanName: string;
  cycloneName: string;
  category: CycloneCategory;
  hemisphere: Hemisphere;
  maxWindKnots: number;
  minPressureHpa: number;
  cycloneRadiusNM: number;
  cycloneSpeedKnots: number;
  /** Direction cyclone moves in degrees (0 = North, 90 = East, 180 = South, 270 = West) */
  cycloneTrackDeg: number;
  /** Simulation world coordinates (1 unit = 1 NM for tactical clarity) */
  shipStart: { x: number; z: number; headingDeg: number };
  cycloneStart: { x: number; z: number };
  portPosition: { x: number; z: number; name: string };
  briefing: string;
  scientificTip: string;
  questions: QuizQuestion[];
}

export interface ShipState {
  x: number;
  z: number;
  headingDeg: number;
  targetHeadingDeg: number;
  telegraph: SpeedTelegraph;
  speedKnots: number;
  hullIntegrity: number; // 0..100
  sinkingProgress: number; // 0..1
  pitchRad: number;
  rollRad: number;
  heaveY: number;
}

export interface CycloneState {
  x: number;
  z: number;
  trackDeg: number;
  speedKnots: number;
  radiusNM: number;
  maxWindKnots: number;
  minPressureHpa: number;
}

export interface WeatherTelemetry {
  distanceToEyeNM: number;
  distanceToPortNM: number;
  bearingToEyeDeg: number;
  bearingToPortDeg: number;
  windKnots: number;
  windFromDeg: number;
  pressureHpa: number;
  waveHeightM: number;
  beaufortScale: number;
  rainIntensity: number; // 0..1
  cloudDensity: number; // 0..1
  stormFactor: number; // 0..1 overall visual severity
  sector: SectorType;
  sectorLabel: string;
  isDangerousSemicircle: boolean;
  sinkingRiskPercent: number;
}

export interface MissionRecord {
  completed: boolean;
  bestScore: number;
  correctAnswers: number;
  totalQuestions: number;
}

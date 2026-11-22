import {
  CycloneState,
  MissionConfig,
  SectorType,
  ShipState,
  WeatherTelemetry,
} from '../types/game';

/**
 * Normalize angle in degrees to [0, 360)
 */
export function normalizeDeg(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

/**
 * Shortest signed angular difference in degrees [-180, 180]
 */
export function shortestAngleDiffDeg(fromDeg: number, toDeg: number): number {
  let diff = normalizeDeg(toDeg - fromDeg);
  if (diff > 180) diff -= 360;
  return diff;
}

/**
 * Bearing in navigation degrees (0 = North/-Z, 90 = East/+X, 180 = South/+Z, 270 = West/-X)
 */
export function bearingDegBetween(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): number {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const rad = Math.atan2(dx, -dz);
  return normalizeDeg((rad * 180) / Math.PI);
}

/**
 * Shared deterministic multi-wave height function.
 * Must stay mathematically matched with the Three.js ocean vertex shader!
 */
export function evaluateWaveHeight(
  worldX: number,
  worldZ: number,
  timeSec: number,
  waveAmp: number,
): number {
  const s = Math.max(0.25, waveAmp);
  const w1 = Math.sin(worldX * 0.11 + worldZ * 0.07 + timeSec * 1.45) * 0.48;
  const w2 = Math.sin(worldX * -0.08 + worldZ * 0.14 + timeSec * 1.95) * 0.30;
  const w3 = Math.sin(worldX * 0.21 + worldZ * -0.17 + timeSec * 2.65) * 0.14;
  const w4 = Math.cos(worldX * 0.31 + worldZ * 0.28 - timeSec * 3.1) * 0.08;
  return (w1 + w2 + w3 + w4) * s;
}

/**
 * Compute detailed oceanology & meteorological telemetry for the ship relative to the cyclone.
 */
export function computeWeatherTelemetry(
  ship: ShipState,
  cyclone: CycloneState,
  mission: MissionConfig,
): WeatherTelemetry {
  const dx = ship.x - cyclone.x;
  const dz = ship.z - cyclone.z;
  const distanceToEyeNM = Math.hypot(dx, dz);

  const dPortX = mission.portPosition.x - ship.x;
  const dPortZ = mission.portPosition.z - ship.z;
  const distanceToPortNM = Math.hypot(dPortX, dPortZ);

  const bearingToEyeDeg = bearingDegBetween(ship.x, ship.z, cyclone.x, cyclone.z);
  const bearingToPortDeg = bearingDegBetween(
    ship.x,
    ship.z,
    mission.portPosition.x,
    mission.portPosition.z,
  );

  // Bearing FROM eye TO ship
  const eyeToShipDeg = bearingDegBetween(cyclone.x, cyclone.z, ship.x, ship.z);
  const relToTrackDeg = shortestAngleDiffDeg(cyclone.trackDeg, eyeToShipDeg);

  // Dangerous semicircle rule:
  // Northern Hemisphere: Right side of track (relToTrackDeg in [0, 180]) is Dangerous
  // Southern Hemisphere: Left side of track (relToTrackDeg in [-180, 0]) is Dangerous
  const isRightSide = relToTrackDeg >= 0;
  const isDangerousSide =
    mission.hemisphere === 'north' ? isRightSide : !isRightSide;

  // Radial wind & pressure profile (Rankine/Holland inspired)
  const rEye = Math.max(8, cyclone.radiusNM * 0.2);
  const rOuter = cyclone.radiusNM * 1.35;

  let windFactor = 0;
  if (distanceToEyeNM <= rEye) {
    // Calm eye center rising steeply to eyewall
    windFactor = 0.25 + 0.75 * (distanceToEyeNM / rEye);
  } else {
    const norm = (distanceToEyeNM - rEye) / Math.max(1, rOuter - rEye);
    windFactor = Math.exp(-norm * 2.15);
  }

  // Dangerous semicircle amplifies wind by translational speed + asymmetric forcing
  const asymmetry = isDangerousSide ? 1.16 : 0.86;
  const ambientWind = 11;
  const rawWind =
    ambientWind + (cyclone.maxWindKnots - ambientWind) * windFactor * asymmetry;
  const windKnots = Math.min(cyclone.maxWindKnots + 12, Math.max(8, rawWind));

  // Wind direction:
  // North hemisphere: counter-clockwise around eye + 20 deg inward spiral
  // South hemisphere: clockwise around eye + 20 deg inward spiral
  const tangentOffset = mission.hemisphere === 'north' ? -90 : 90;
  const inflowAngle = mission.hemisphere === 'north' ? -20 : 20;
  // Wind blows TOWARD tangent + inflow; meteorological wind FROM is +180
  const windBlowingToDeg = normalizeDeg(
    eyeToShipDeg + tangentOffset + inflowAngle,
  );
  const windFromDeg = normalizeDeg(windBlowingToDeg + 180);

  // Pressure profile (1013 hPa ambient down to minPressureHpa at eye)
  const pressureDropFactor = Math.exp(
    -Math.pow(distanceToEyeNM / (cyclone.radiusNM * 0.72), 1.35),
  );
  const pressureHpa =
    1013 - (1013 - cyclone.minPressureHpa) * pressureDropFactor;

  // Wave height in meters (1.1 m calm up to ~15 m in Cat 5 dangerous eyewall)
  const categoryBoost = 0.8 + mission.category * 0.14;
  const waveHeightM = Math.min(
    16.5,
    1.1 + Math.pow(windKnots / 36, 1.55) * 1.55 * categoryBoost,
  );

  // Beaufort scale approximation
  const beaufortScale = Math.min(
    12,
    Math.max(1, Math.round(Math.pow(windKnots / 1.62, 2 / 3))),
  );

  // Rain & clouds scale steeply inside outer radius
  const proximityNorm = Math.max(
    0,
    Math.min(1, 1 - (distanceToEyeNM - rEye) / (cyclone.radiusNM * 1.35)),
  );
  const cloudDensity = Math.min(1, Math.pow(proximityNorm, 0.72) * 1.05);
  const rainIntensity =
    distanceToEyeNM < rEye * 0.65
      ? 0.25
      : Math.min(1, Math.max(0, (proximityNorm - 0.18) / 0.72));

  const stormFactor = Math.min(
    1,
    Math.max(cloudDensity * 0.65 + (windKnots / 145) * 0.45, rainIntensity),
  );

  let sector: SectorType = 'safe';
  let sectorLabel = 'Təhlükəsiz Açıq Okean';

  if (distanceToEyeNM <= rEye * 1.45) {
    sector = 'eyewall';
    sectorLabel = 'Göz Divarı (Kritik Zərbə)';
  } else if (distanceToEyeNM <= cyclone.radiusNM * 0.92) {
    if (isDangerousSide) {
      sector = 'dangerous';
      sectorLabel = 'Təhlükəli Sektor';
    } else {
      sector = 'navigable';
      sectorLabel = 'Keçilə Bilən Sektor';
    }
  } else if (distanceToEyeNM <= cyclone.radiusNM * 1.38) {
    sector = 'outer';
    sectorLabel = 'Müşahidə və Yağış Zolağı';
  }

  const isDangerousSemicircle =
    isDangerousSide && distanceToEyeNM <= cyclone.radiusNM * 1.05;

  const hullDamage = Math.max(0, 100 - ship.hullIntegrity);
  const sectorDanger =
    sector === 'eyewall'
      ? 45
      : sector === 'dangerous'
        ? 30
        : sector === 'navigable'
          ? 10
          : 0;
  const sinkingRiskPercent = Math.min(
    100,
    Math.round(hullDamage * 0.85 + sectorDanger * 0.45),
  );

  return {
    distanceToEyeNM,
    distanceToPortNM,
    bearingToEyeDeg,
    bearingToPortDeg,
    windKnots,
    windFromDeg,
    pressureHpa,
    waveHeightM,
    beaufortScale,
    rainIntensity,
    cloudDensity,
    stormFactor,
    sector,
    sectorLabel,
    isDangerousSemicircle,
    sinkingRiskPercent,
  };
}

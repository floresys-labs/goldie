import { join } from "node:path";

const SIMULATOR_UDID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SimulatorDevice = {
  udid: string;
  name: string;
  state: string;
  isAvailable?: boolean;
  deviceTypeIdentifier?: string;
};

type CaptureEnvironment = Readonly<Record<string, string | undefined>>;

export function requireCaptureAuthorization(
  argv: readonly string[],
  environment: CaptureEnvironment = process.env,
): { udid: string } {
  if (!argv.includes("--allow-reinstall")) {
    throw new Error(
      "Capture reinstalls the app and may wipe its simulator data. " +
        "Obtain fresh authorization, then pass --allow-reinstall.",
    );
  }

  const argumentIndex = argv.indexOf("--udid");
  const argumentUdid = argumentIndex === -1 ? undefined : argv[argumentIndex + 1];
  const udid = argumentUdid ?? environment.SHIPATON_SIMULATOR_UDID;
  if (!udid) {
    throw new Error(
      "Capture requires an exact simulator. Pass --udid <UUID> or set " +
        "SHIPATON_SIMULATOR_UDID.",
    );
  }
  if (!SIMULATOR_UDID.test(udid)) {
    throw new Error(`Simulator UDID must be a UUID; received "${udid}".`);
  }
  return { udid };
}

export function selectExactSimulator(
  byRuntime: Readonly<Record<string, readonly SimulatorDevice[]>>,
  udid: string,
  expectedDeviceType: string,
): SimulatorDevice {
  const target = Object.values(byRuntime)
    .flat()
    .find((candidate) => candidate.udid.toLowerCase() === udid.toLowerCase());
  if (!target) {
    throw new Error(`Simulator ${udid} is not installed on this Mac.`);
  }
  if (target.isAvailable === false) {
    throw new Error(`Simulator ${udid} (${target.name}) is unavailable.`);
  }
  if (target.deviceTypeIdentifier !== expectedDeviceType) {
    throw new Error(
      `Simulator ${udid} has device type "${target.deviceTypeIdentifier ?? "unknown"}"; ` +
        `expected "${expectedDeviceType}".`,
    );
  }
  return target;
}

export function captureRawDir(outDir: string, deviceKey: string, locale: string): string {
  if (locale.includes("/") || locale.includes("\\")) {
    throw new Error(`Invalid capture locale "${locale}".`);
  }
  return join(outDir, "raw", deviceKey, canonicalCaptureLocale(locale));
}

export function canonicalCaptureLocale(locale: string): string {
  let canonicalLocale: string;
  try {
    [canonicalLocale] = Intl.getCanonicalLocales(locale);
  } catch {
    throw new Error(`Invalid capture locale "${locale}".`);
  }
  if (!canonicalLocale) throw new Error(`Invalid capture locale "${locale}".`);
  return canonicalLocale;
}

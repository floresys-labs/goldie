import { describe, expect, test } from "bun:test";
import {
  captureRawDir,
  requireCaptureAuthorization,
  type SimulatorDevice,
  selectExactSimulator,
} from "./capture-safety.ts";

const exactUdid = "11111111-2222-3333-4444-555555555555";
const deviceType = "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro-Max";

describe("requireCaptureAuthorization", () => {
  test("accepts an explicit UDID and reinstall approval", () => {
    expect(
      requireCaptureAuthorization(["capture", "--udid", exactUdid, "--allow-reinstall"], {}),
    ).toEqual({ udid: exactUdid });
  });

  test("uses the dedicated simulator environment variable", () => {
    expect(
      requireCaptureAuthorization(["capture", "--allow-reinstall"], {
        SHIPATON_SIMULATOR_UDID: exactUdid,
      }),
    ).toEqual({ udid: exactUdid });
  });

  test("rejects capture without fresh reinstall approval", () => {
    expect(() => requireCaptureAuthorization(["capture", "--udid", exactUdid], {})).toThrow(
      "--allow-reinstall",
    );
  });

  test("rejects a missing or malformed exact UDID", () => {
    expect(() => requireCaptureAuthorization(["capture", "--allow-reinstall"], {})).toThrow(
      "--udid",
    );
    expect(() =>
      requireCaptureAuthorization(["capture", "--udid", "Booted", "--allow-reinstall"], {}),
    ).toThrow("UUID");
  });
});

describe("selectExactSimulator", () => {
  const simulator: SimulatorDevice = {
    udid: exactUdid,
    name: "Shipaton App Store Capture",
    state: "Shutdown",
    isAvailable: true,
    deviceTypeIdentifier: deviceType,
  };

  test("selects only the requested available simulator of the configured type", () => {
    const result = selectExactSimulator(
      {
        "com.apple.CoreSimulator.SimRuntime.iOS-26-0": [
          { ...simulator, udid: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE" },
          simulator,
        ],
      },
      exactUdid,
      deviceType,
    );

    expect(result).toEqual(simulator);
  });

  test("rejects unavailable, missing, and wrong-device targets", () => {
    expect(() =>
      selectExactSimulator(
        { "com.apple.CoreSimulator.SimRuntime.iOS-26-0": [{ ...simulator, isAvailable: false }] },
        exactUdid,
        deviceType,
      ),
    ).toThrow("unavailable");
    expect(() => selectExactSimulator({}, exactUdid, deviceType)).toThrow("not installed");
    expect(() =>
      selectExactSimulator(
        { "com.apple.CoreSimulator.SimRuntime.iOS-26-0": [simulator] },
        exactUdid,
        "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro",
      ),
    ).toThrow("device type");
  });
});

describe("captureRawDir", () => {
  test("isolates raw evidence by device and canonical locale", () => {
    expect(captureRawDir("/tmp/goldie/out", "iphone-6.9", "en-us")).toBe(
      "/tmp/goldie/out/raw/iphone-6.9/en-US",
    );
    expect(captureRawDir("/tmp/goldie/out", "iphone-6.9", "zh-Hans")).toBe(
      "/tmp/goldie/out/raw/iphone-6.9/zh-Hans",
    );
  });

  test("rejects locale values that could escape the output directory", () => {
    expect(() => captureRawDir("/tmp/goldie/out", "iphone-6.9", "../../private")).toThrow("locale");
  });
});

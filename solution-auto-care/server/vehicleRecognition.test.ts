import { describe, expect, it } from "vitest";
import { parseVehicleRecognition } from "./vehicleRecognition";

describe("vehicle recognition parsing", () => {
  it("parses structured vehicle candidates and clamps confidence", () => {
    const result = parseVehicleRecognition(
      "```json\n" +
        JSON.stringify({
          vehicleModel: "Porsche Taycan 4S",
          confidence: 108,
          candidates: [
            { label: "Porsche Taycan 4S", confidence: 92 },
            { label: "Porsche Taycan", confidence: 71 },
          ],
        }) +
        "\n```",
    );

    expect(result.vehicleModel).toBe("Porsche Taycan 4S");
    expect(result.confidence).toBe(100);
    expect(result.candidates).toHaveLength(2);
  });

  it("rejects malformed model responses", () => {
    expect(() =>
      parseVehicleRecognition(
        JSON.stringify({ vehicleModel: "BMW M3", confidence: 80 }),
      ),
    ).toThrow("車款辨識回傳格式無法辨識");
  });
});

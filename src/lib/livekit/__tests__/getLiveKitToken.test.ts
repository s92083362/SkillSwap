import { getLiveKitToken } from "../getLiveKitToken";
import { AccessToken } from "livekit-server-sdk";

// Mock the AccessToken class
jest.mock("livekit-server-sdk", () => {
  return {
    AccessToken: jest.fn().mockImplementation(() => {
      return {
        addGrant: jest.fn(),
        toJwt: jest.fn().mockResolvedValue("mocked_jwt_token"),
      };
    }),
  };
});

describe("getLiveKitToken", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Clear cached modules
    process.env = { ...OLD_ENV }; // Reset env
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore original env
  });

  it("throws error if API keys are missing", async () => {
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;

    await expect(getLiveKitToken("room1", "user1", "id1")).rejects.toThrow(
      "Server misconfigured: Missing LiveKit API Keys"
    );
  });

  it("returns a JWT token if API keys are present", async () => {
    process.env.LIVEKIT_API_KEY = "testKey";
    process.env.LIVEKIT_API_SECRET = "testSecret";

    const token = await getLiveKitToken("room1", "user1", "id1");
    expect(token).toBe("mocked_jwt_token");
    expect(AccessToken).toHaveBeenCalledWith("testKey", "testSecret", {
      identity: "id1",
      name: "user1",
      ttl: "1h",
    });
  });
});

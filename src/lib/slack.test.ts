import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSlackNotification } from "./slack";

describe("sendSlackNotification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when there's no webhook URL configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendSlackNotification(null, "hola");
    await sendSlackNotification(undefined, "hola");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the message with an abort signal so a hanging webhook can't block forever", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSlackNotification("https://hooks.slack.com/services/x", "hola");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.slack.com/services/x");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("never throws even if the webhook request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );

    await expect(
      sendSlackNotification("https://hooks.slack.com/services/x", "hola")
    ).resolves.toBeUndefined();
  });
});

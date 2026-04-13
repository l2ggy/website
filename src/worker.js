const monkeytypeApiBase = "https://api.monkeytype.com/users";

const buildError = (message, status = 502) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const formatPersonalBest = (entry) => {
  if (!entry || typeof entry !== "object") return null;

  return {
    wpm: Math.round(entry.wpm || 0),
    raw: Math.round(entry.raw || 0),
    acc: Number((entry.acc || 0).toFixed(2)),
    timestamp: entry.timestamp || 0,
  };
};

const getMonkeytypeStats = async (username) => {
  const response = await fetch(`${monkeytypeApiBase}/${encodeURIComponent(username)}/profile`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return buildError("Monkeytype user not found", 404);
    }

    return buildError("Unable to load Monkeytype stats", 502);
  }

  const payload = await response.json();
  const timeBests = payload?.data?.personalBests?.time;

  if (!timeBests || typeof timeBests !== "object") {
    return buildError("Monkeytype stats are unavailable", 404);
  }

  const result = {
    username: payload?.data?.name || username,
    bests: {
      15: formatPersonalBest(timeBests["15"]?.[0]),
      30: formatPersonalBest(timeBests["30"]?.[0]),
      60: formatPersonalBest(timeBests["60"]?.[0]),
      120: formatPersonalBest(timeBests["120"]?.[0]),
    },
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/monkeytype/")) {
      const username = url.pathname.replace("/api/monkeytype/", "").trim();

      if (!username) {
        return buildError("Missing Monkeytype username", 400);
      }

      return getMonkeytypeStats(username);
    }

    return env.ASSETS.fetch(request);
  },
};

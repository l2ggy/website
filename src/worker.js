import { monkeytypeProfileEndpoints, parseMonkeytypeProfile } from "./shared/monkeytype.js";

const LEETCODE_QUERY = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    userContestRanking(username: $username) {
      rating
      topPercentage
    }
  }
`;
const jsonResponse = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900",
      ...init.headers,
    },
    status: init.status || 200,
  });
const noStore = { "cache-control": "no-store" };
const parseVisitPath = async (request) => {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await request.json().catch(() => ({}));
    if (typeof payload.path === "string" && payload.path.startsWith("/")) {
      return payload.path.slice(0, 512);
    }
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return "/";
  }

  try {
    return new URL(referer).pathname.slice(0, 512) || "/";
  } catch {
    return "/";
  }
};
const trackVisit = async (request, env) => {
  if (!env.DB) {
    return jsonResponse({ error: "Database binding not configured" }, { status: 500, headers: noStore });
  }

  const path = await parseVisitPath(request);
  const ip = request.headers.get("CF-Connecting-IP");
  const cf = request.cf || {};
  await env.DB.prepare(
    `
      INSERT INTO visits (visited_at, page_path, ip, country, region, city, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      new Date().toISOString(),
      path,
      ip,
      cf.country || null,
      cf.region || null,
      cf.city || null,
      cf.latitude || null,
      cf.longitude || null,
    )
    .run();

  return jsonResponse({ ok: true }, { headers: noStore });
};
const getVisitStats = async (env) => {
  if (!env.DB) {
    return jsonResponse({ error: "Database binding not configured" }, { status: 500, headers: noStore });
  }

  const [totalResult, uniqueResult, locationsResult] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM visits").first(),
    env.DB.prepare("SELECT COUNT(DISTINCT ip) AS count FROM visits WHERE ip IS NOT NULL AND ip != ''").first(),
    env.DB.prepare(
      `
        SELECT ROUND(CAST(latitude AS REAL), 2) AS lat, ROUND(CAST(longitude AS REAL), 2) AS lon, COUNT(*) AS count
        FROM visits
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY ROUND(CAST(latitude AS REAL), 2), ROUND(CAST(longitude AS REAL), 2)
        ORDER BY count DESC
      `,
    ).all(),
  ]);

  return jsonResponse(
    {
      totalVisits: Number(totalResult?.count || 0),
      uniqueVisitors: Number(uniqueResult?.count || 0),
      locations: (locationsResult?.results || []).map((row) => ({
        lat: Number(row.lat),
        lon: Number(row.lon),
        count: Number(row.count),
      })),
    },
    { headers: noStore },
  );
};

const getLeetCodeStats = async (username) => {
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: LEETCODE_QUERY,
      variables: { username },
    }),
  });

  if (!response.ok) {
    throw new Error("LeetCode request failed");
  }

  const payload = await response.json();
  const counts = payload?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  const contest = payload?.data?.userContestRanking || {};
  const byDifficulty = Object.fromEntries(counts.map(({ difficulty, count }) => [difficulty, count]));

  return {
    solved: {
      all: byDifficulty.All || 0,
      easy: byDifficulty.Easy || 0,
      medium: byDifficulty.Medium || 0,
      hard: byDifficulty.Hard || 0,
    },
    contest: {
      rating: contest.rating || null,
      topPercentage: contest.topPercentage || null,
    },
  };
};

const getMonkeytypeStats = async (username) => {
  let payload = null;
  for (const endpoint of monkeytypeProfileEndpoints(username)) {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (response.ok) {
      payload = await response.json();
      break;
    }
  }

  if (!payload) {
    throw new Error("Monkeytype request failed");
  }

  return parseMonkeytypeProfile(payload);
};

const getStats = async (requestUrl) => {
  const leetcode = requestUrl.searchParams.get("leetcode") || "lagsterino";
  const monkeytype = requestUrl.searchParams.get("monkeytype") || "laggy";
  const [leetcodeResult, monkeytypeResult] = await Promise.allSettled([
    getLeetCodeStats(leetcode),
    getMonkeytypeStats(monkeytype),
  ]);
  const leetcodeStats = leetcodeResult.status === "fulfilled" ? leetcodeResult.value : null;
  const monkeytypeStats = monkeytypeResult.status === "fulfilled" ? monkeytypeResult.value : null;

  return {
    fetchedAt: new Date().toISOString(),
    leetcodeUser: leetcode,
    monkeytypeUser: monkeytype,
    leetcode: leetcodeStats,
    monkeytype: monkeytypeStats,
  };
};

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);

    if (request.method === "POST" && requestUrl.pathname === "/api/visit") {
      return trackVisit(request, env);
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/visit-stats") {
      return getVisitStats(env);
    }

    if (requestUrl.pathname === "/api/stats") {
      const stats = await getStats(requestUrl);
      return jsonResponse(stats);
    }

    return env.ASSETS.fetch(request);
  },
};

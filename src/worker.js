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

    if (requestUrl.pathname === "/api/stats") {
      const stats = await getStats(requestUrl);
      return jsonResponse(stats);
    }

    return env.ASSETS.fetch(request);
  },
};

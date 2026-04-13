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

const defaultLeetCodeStats = () => ({
  solved: { all: 0, easy: 0, medium: 0, hard: 0 },
  contest: { rating: null, topPercentage: null },
});

const defaultMonkeytypeStats = () => ({
  completedTests: 0,
  timeTypingSeconds: 0,
  pb60: 0,
  leaderboard: { rank: null, count: null },
});

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
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "portfolio-stats-worker/1.0",
    },
    body: JSON.stringify({
      query: LEETCODE_QUERY,
      variables: { username },
    }),
  });

  if (!response.ok) {
    throw new Error("LeetCode request failed");
  }

  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error("LeetCode GraphQL error");
  }

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
  const response = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(username)}/profile`, {
    headers: {
      accept: "application/json",
      "user-agent": "portfolio-stats-worker/1.0",
    },
  });
  if (!response.ok) {
    throw new Error("Monkeytype request failed");
  }

  const payload = await response.json();
  const data = payload?.data || {};
  const typingStats = data.typingStats || {};
  const personalBest60 = data?.personalBests?.time?.["60"] || [];
  const pb60 = personalBest60.reduce((best, run) => Math.max(best, run?.wpm || 0), 0);
  const leaderboard = data?.allTimeLbs?.time?.["60"]?.english || {};

  return {
    completedTests: typingStats.completedTests || 0,
    timeTypingSeconds: typingStats.timeTyping || 0,
    pb60,
    leaderboard: {
      rank: leaderboard.rank || null,
      count: leaderboard.count || null,
    },
  };
};

const getStats = async (requestUrl) => {
  const leetcode = requestUrl.searchParams.get("leetcode") || "lagsterino";
  const monkeytype = requestUrl.searchParams.get("monkeytype") || "laggy";

  const [leetcodeResult, monkeytypeResult] = await Promise.allSettled([
    getLeetCodeStats(leetcode),
    getMonkeytypeStats(monkeytype),
  ]);
  const leetcodeAvailable = leetcodeResult.status === "fulfilled";
  const monkeytypeAvailable = monkeytypeResult.status === "fulfilled";

  return {
    fetchedAt: new Date().toISOString(),
    leetcodeUser: leetcode,
    monkeytypeUser: monkeytype,
    leetcode: leetcodeAvailable ? leetcodeResult.value : defaultLeetCodeStats(),
    monkeytype: monkeytypeAvailable ? monkeytypeResult.value : defaultMonkeytypeStats(),
    availability: {
      leetcode: leetcodeAvailable,
      monkeytype: monkeytypeAvailable,
    },
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

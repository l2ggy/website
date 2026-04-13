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

const fetchFirstOkJson = async (urls) => {
  for (const url of urls) {
    const response = await fetch(url);
    if (response.ok) {
      return response.json();
    }
  }

  return null;
};

const getMonkeytypeStats = async (username) => {
  const encodedName = encodeURIComponent(username);
  const [profilePayload, statsPayload] = await Promise.all([
    fetchFirstOkJson([
      `https://api.monkeytype.com/users/${encodedName}/profile?isUid=false`,
      `https://api.monkeytype.com/users/${encodedName}/profile`,
    ]),
    fetchFirstOkJson([
      `https://api.monkeytype.com/users/stats?uidOrName=${encodedName}&isUid=false`,
      `https://api.monkeytype.com/users/${encodedName}/stats`,
    ]),
  ]);
  const profile = profilePayload?.data || {};
  const typingStats = profile.typingStats || statsPayload?.data || {};
  const personalBest60 = profile?.personalBests?.time?.["60"] || [];
  const pb60 = personalBest60.reduce((best, run) => Math.max(best, run?.wpm || 0), 0);
  const leaderboard = profile?.allTimeLbs?.time?.["60"]?.english || {};

  if (!typingStats.completedTests && !typingStats.testsCompleted && !pb60) {
    throw new Error("Monkeytype request failed");
  }

  return {
    completedTests: typingStats.completedTests ?? typingStats.testsCompleted ?? 0,
    timeTypingSeconds: typingStats.timeTyping ?? 0,
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

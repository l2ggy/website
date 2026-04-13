const LEETCODE_QUERY = `
  query user($username: String!) {
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

const getDifficultyCount = (entries, difficulty) => entries.find((entry) => entry.difficulty === difficulty)?.count ?? 0;

const fetchLeetCodeStats = async () => {
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: LEETCODE_QUERY,
      variables: { username: "lagsterino" },
    }),
  });

  if (!response.ok) {
    throw new Error("leetcode request failed");
  }

  const payload = await response.json();
  const totals = payload?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
  const ranking = payload?.data?.userContestRanking;

  return {
    easy: getDifficultyCount(totals, "Easy"),
    medium: getDifficultyCount(totals, "Medium"),
    hard: getDifficultyCount(totals, "Hard"),
    contestRating: ranking?.rating ? Math.round(ranking.rating) : "N/A",
    percentile: ranking?.topPercentage ? (100 - ranking.topPercentage).toFixed(2) : "N/A",
  };
};

const fetchMonkeytypeStats = async () => {
  const response = await fetch("https://api.monkeytype.com/users/laggy/profile");
  if (!response.ok) {
    throw new Error("monkeytype request failed");
  }

  const payload = await response.json();
  const profile = payload?.data;
  const testsCompleted = profile?.typingStats?.completedTests ?? 0;
  const hoursTyping = profile?.typingStats?.timeTyping ? Math.round(profile.typingStats.timeTyping / 3600) : 0;
  const best60 = profile?.personalBests?.time?.["60"] ?? [];
  const bestEnglish = best60.find((entry) => entry.language === "english" && !entry.punctuation && !entry.numbers);

  return {
    testsCompleted,
    hoursTyping,
    bestWpm: bestEnglish ? Math.round(bestEnglish.wpm) : "N/A",
  };
};

const handleStatsRequest = async () => {
  const [leetcode, monkeytype] = await Promise.all([fetchLeetCodeStats(), fetchMonkeytypeStats()]);

  return new Response(JSON.stringify({ leetcode, monkeytype }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/stats") {
      try {
        return await handleStatsRequest();
      } catch {
        return new Response(JSON.stringify({ error: "Unable to fetch stats." }), {
          status: 502,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};

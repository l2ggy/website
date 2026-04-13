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

const getDifficultyCount = (counts, difficulty) => counts.find((item) => item.difficulty === difficulty)?.count ?? 0;

const fetchLeetCodeStats = async (username) => {
  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: LEETCODE_QUERY,
      variables: { username },
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to fetch LeetCode stats");
  }

  const payload = await response.json();
  const counts = payload?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
  const contest = payload?.data?.userContestRanking;

  return {
    solved: {
      easy: getDifficultyCount(counts, "Easy"),
      medium: getDifficultyCount(counts, "Medium"),
      hard: getDifficultyCount(counts, "Hard"),
      all: getDifficultyCount(counts, "All"),
    },
    contest: {
      rating: contest?.rating ? Math.round(contest.rating) : null,
      topPercentage: contest?.topPercentage ?? null,
    },
  };
};

const fetchMonkeytypeStats = async (username) => {
  const response = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(username)}/profile`);
  if (!response.ok) {
    throw new Error("Unable to fetch Monkeytype stats");
  }

  const payload = await response.json();
  const data = payload?.data;
  const timeTypingSeconds = data?.typingStats?.timeTyping ?? 0;
  const pb60 = data?.personalBests?.time?.["60"]?.find((entry) => entry.language === "english" && !entry.punctuation)
    ?? data?.personalBests?.time?.["60"]?.[0];
  const rankInfo = data?.allTimeLbs?.time?.["60"]?.english;

  return {
    completedTests: data?.typingStats?.completedTests ?? 0,
    totalTypingHours: Number((timeTypingSeconds / 3600).toFixed(1)),
    pb60: pb60?.wpm ? Number(pb60.wpm.toFixed(2)) : null,
    pb60TopPercentage: rankInfo?.rank && rankInfo?.count ? Number(((rankInfo.rank / rankInfo.count) * 100).toFixed(2)) : null,
  };
};

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/stats") {
      const leetcodeUser = url.searchParams.get("leetcode") || "lagsterino";
      const monkeytypeUser = url.searchParams.get("monkeytype") || "laggy";

      const [leetcodeResult, monkeytypeResult] = await Promise.allSettled([
        fetchLeetCodeStats(leetcodeUser),
        fetchMonkeytypeStats(monkeytypeUser),
      ]);

      const leetcode = leetcodeResult.status === "fulfilled" ? leetcodeResult.value : null;
      const monkeytype = monkeytypeResult.status === "fulfilled" ? monkeytypeResult.value : null;

      if (!leetcode && !monkeytype) {
        return json({ error: "Unable to load stats right now." }, { status: 502 });
      }

      return json(
        {
          leetcode,
          monkeytype,
          updatedAt: new Date().toISOString(),
        },
        { headers: { "cache-control": "public, max-age=1800" } },
      );
    }

    return env.ASSETS.fetch(request);
  },
};

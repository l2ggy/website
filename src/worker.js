const leetCodeGraphQLEndpoint = "https://leetcode.com/graphql";

const leetCodeStatsQuery = `
  query userStats($username: String!) {
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
    }
  }
`;

const countByDifficulty = (counts, difficulty) =>
  counts.find((entry) => entry.difficulty === difficulty)?.count ?? 0;

const fetchLeetCodeStats = async (username) => {
  const response = await fetch(leetCodeGraphQLEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: leetCodeStatsQuery,
      variables: { username },
    }),
  });

  if (!response.ok) {
    throw new Error("LeetCode request failed.");
  }

  const payload = await response.json();
  const solvedCounts = payload?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  const ranking = payload?.data?.userContestRanking;

  return {
    totalSolved: countByDifficulty(solvedCounts, "All"),
    easySolved: countByDifficulty(solvedCounts, "Easy"),
    mediumSolved: countByDifficulty(solvedCounts, "Medium"),
    hardSolved: countByDifficulty(solvedCounts, "Hard"),
    rating: ranking?.rating ? Math.round(ranking.rating) : null,
  };
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const leetCodeMatch = url.pathname.match(/^\/api\/leetcode\/([^/]+)$/);

    if (leetCodeMatch) {
      const username = decodeURIComponent(leetCodeMatch[1]);
      try {
        const stats = await fetchLeetCodeStats(username);
        return new Response(JSON.stringify(stats), {
          headers: { "content-type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Unable to fetch LeetCode stats." }), {
          status: 502,
          headers: { "content-type": "application/json" },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};

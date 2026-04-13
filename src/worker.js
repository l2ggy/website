const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });

const handleLeetCodeRequest = async (username) => {
  if (!username) {
    return jsonResponse({ error: "Missing username" }, 400);
  }

  const query = `
    query getUserProfile($username: String!) {
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

  const upstreamResponse = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://leetcode.com",
      referer: "https://leetcode.com/",
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!upstreamResponse.ok) {
    return jsonResponse({ error: "Unable to load LeetCode stats" }, 502);
  }

  const payload = await upstreamResponse.json();
  const solvedByDifficulty = payload?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  const contestRating = payload?.data?.userContestRanking?.rating;

  const countFor = (difficulty) =>
    Number(solvedByDifficulty.find((item) => item.difficulty === difficulty)?.count || 0);

  return jsonResponse({
    username,
    solved: {
      total: countFor("All"),
      easy: countFor("Easy"),
      medium: countFor("Medium"),
      hard: countFor("Hard"),
    },
    contestRating: contestRating ? Math.round(contestRating) : null,
  });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/leetcode/")) {
      const username = decodeURIComponent(url.pathname.replace("/api/leetcode/", "")).trim();

      try {
        return await handleLeetCodeRequest(username);
      } catch {
        return jsonResponse({ error: "Unable to load LeetCode stats" }, 502);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/leetcode/")) {
      const username = decodeURIComponent(url.pathname.replace("/api/leetcode/", "").trim());
      if (!username) {
        return new Response(JSON.stringify({ error: "Missing username" }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      const graphqlResponse = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: `
            query leetcodeStats($username: String!) {
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
                attendedContestsCount
              }
            }
          `,
          variables: { username },
        }),
      });

      if (!graphqlResponse.ok) {
        return new Response(JSON.stringify({ error: "Unable to fetch LeetCode stats" }), {
          status: 502,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      const payload = await graphqlResponse.json();
      const solvedCounts = Object.fromEntries(
        (payload.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || []).map((item) => [item.difficulty, item.count]),
      );
      const contest = payload.data?.userContestRanking || {};

      return new Response(
        JSON.stringify({
          username,
          solved: {
            total: solvedCounts.All || 0,
            easy: solvedCounts.Easy || 0,
            medium: solvedCounts.Medium || 0,
            hard: solvedCounts.Hard || 0,
          },
          contestRating: contest.rating ? Math.round(contest.rating) : "Unrated",
          contestsAttended: contest.attendedContestsCount || 0,
        }),
        { headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    return env.ASSETS.fetch(request);
  },
};

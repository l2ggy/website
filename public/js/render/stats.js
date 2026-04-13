export const unavailableText = "Unavailable right now.";
export const STATS_SELECTORS = {
  leetcodeSolved: "#leetcode-solved",
  leetcodeContest: "#leetcode-contest",
  leetcodePercentile: "#leetcode-percentile",
  monkeytypeSummary: "#monkeytype-summary",
  monkeytypePb: "#monkeytype-pb",
  monkeytypePercentile: "#monkeytype-percentile",
};

export const formatNumber = (value, digits = 0) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

export const setText = (selector, text) => {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
};

export const setStatMarkup = (selector, markup) => {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = markup;
  }
};

const normalPdf = (x) => Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);

const inverseStandardNormal = (p) => {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  const high = 1 - low;

  if (p <= 0 || p >= 1) {
    return null;
  }

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p > high) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};

export const renderPercentile = (selector, percentile) => {
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }

  if (!percentile || percentile <= 0 || percentile > 100) {
    element.hidden = true;
    element.innerHTML = "";
    return;
  }

  const chartWidth = 228;
  const chartHeight = 72;
  const left = 6;
  const right = chartWidth - 6;
  const top = 4;
  const baseline = chartHeight - 7;
  const tailProbability = percentile / 100;
  const thresholdZ = inverseStandardNormal(1 - tailProbability);
  if (thresholdZ == null) {
    element.hidden = true;
    element.innerHTML = "";
    return;
  }

  const xMax = Math.max(3.5, thresholdZ + 0.6);
  const xMin = -xMax;
  const yMax = normalPdf(0);
  const mapX = (x) => left + ((x - xMin) / (xMax - xMin)) * (right - left);
  const mapY = (y) => baseline - (y / yMax) * (baseline - top);
  const pointCount = 140;
  const curvePoints = [];

  for (let i = 0; i <= pointCount; i += 1) {
    const x = xMin + (i / pointCount) * (xMax - xMin);
    curvePoints.push(`${mapX(x)},${mapY(normalPdf(x))}`);
  }

  const clampedThreshold = Math.max(xMin, Math.min(xMax, thresholdZ));
  const markerX = mapX(clampedThreshold);
  const markerY = mapY(normalPdf(clampedThreshold));

  const shadePoints = [`${mapX(clampedThreshold)},${baseline}`];
  for (let i = 0; i <= pointCount; i += 1) {
    const x = clampedThreshold + (i / pointCount) * (xMax - clampedThreshold);
    shadePoints.push(`${mapX(x)},${mapY(normalPdf(x))}`);
  }
  shadePoints.push(`${right},${baseline}`);

  element.hidden = false;
  element.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Standard normal curve with top ${formatNumber(percentile, 2)} percent tail highlighted">
      <line class="percentile-axis" x1="${left}" y1="${baseline}" x2="${right}" y2="${baseline}" />
      <polygon class="percentile-fill" points="${shadePoints.join(" ")}" />
      <polyline class="percentile-curve" points="${curvePoints.join(" ")}" />
      <line class="percentile-marker" x1="${markerX}" y1="${baseline}" x2="${markerX}" y2="${markerY}" />
      <circle class="percentile-dot" cx="${markerX}" cy="${markerY}" r="2" />
    </svg>
  `;
};

export const renderStats = ({ leetcode, monkeytype }) => {
  const solved = leetcode?.solved;
  const contest = leetcode?.contest;
  const leaderboard = monkeytype?.leaderboard;

  setText(STATS_SELECTORS.leetcodeSolved, unavailableText);
  if (solved) {
    setStatMarkup(
      STATS_SELECTORS.leetcodeSolved,
      `<span class="stat-value">${formatNumber(solved.all)}</span> solved (<span class="stat-value">${formatNumber(solved.easy)}</span> easy · <span class="stat-value">${formatNumber(solved.medium)}</span> medium · <span class="stat-value">${formatNumber(solved.hard)}</span> hard)`
    );
  }

  setText(STATS_SELECTORS.leetcodeContest, unavailableText);
  if (contest?.rating && contest?.topPercentage) {
    setStatMarkup(
      STATS_SELECTORS.leetcodeContest,
      `Contest rating: <span class="stat-value">${formatNumber(Math.round(contest.rating))}</span> · top <span class="stat-value">${formatNumber(contest.topPercentage, 2)}%</span>`
    );
  }
  renderPercentile(STATS_SELECTORS.leetcodePercentile, contest?.topPercentage);

  if (!monkeytype) {
    setText(STATS_SELECTORS.monkeytypeSummary, unavailableText);
    setText(STATS_SELECTORS.monkeytypePb, unavailableText);
    renderPercentile(STATS_SELECTORS.monkeytypePercentile, null);
    return;
  }

  const typingHours = monkeytype.timeTypingSeconds / 3600;
  const topPercent = leaderboard?.rank && leaderboard?.count ? (leaderboard.rank / leaderboard.count) * 100 : null;

  setStatMarkup(
    STATS_SELECTORS.monkeytypeSummary,
    `<span class="stat-value">${formatNumber(monkeytype.completedTests)}</span> tests completed · <span class="stat-value">${formatNumber(typingHours, 1)}h</span> total typing`
  );
  setStatMarkup(
    STATS_SELECTORS.monkeytypePb,
    topPercent
      ? `PB (60s): <span class="stat-value">${formatNumber(monkeytype.pb60, 2)} WPM</span> · top <span class="stat-value">${formatNumber(topPercent, 2)}%</span>`
      : `PB (60s): <span class="stat-value">${formatNumber(monkeytype.pb60, 2)} WPM</span>`
  );
  renderPercentile(STATS_SELECTORS.monkeytypePercentile, topPercent);
};

export const setStatsFallback = () => {
  [
    STATS_SELECTORS.leetcodeSolved,
    STATS_SELECTORS.leetcodeContest,
    STATS_SELECTORS.monkeytypeSummary,
    STATS_SELECTORS.monkeytypePb,
  ].forEach((selector) => {
    setText(selector, unavailableText);
  });
  renderPercentile(STATS_SELECTORS.leetcodePercentile, null);
  renderPercentile(STATS_SELECTORS.monkeytypePercentile, null);
};

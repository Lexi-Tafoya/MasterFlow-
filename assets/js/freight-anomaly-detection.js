(function (global) {
  "use strict";

  const SIGMA_MULTIPLIER = 2;
  const MIN_PEER_GROUP_SIZE = 5;
  const FALLBACK_RATIO_TO_VALUE_THRESHOLD = 0.25;
  const FALLBACK_RATIO_TO_MARGIN_THRESHOLD = 0.5;

  function round(value, digits) {
    const factor = Math.pow(10, digits == null ? 2 : digits);
    return Math.round(Number(value || 0) * factor) / factor;
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
  }

  function percent(value) {
    return `${round(value * 100, 1)}%`;
  }

  function titleCase(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  function mean(values) {
    if (!values.length) return null;
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  function sampleStdDev(values, average) {
    if (values.length < 2) return 0;
    const variance = values.reduce((total, value) => total + Math.pow(value - average, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  function peerStats(values) {
    const average = mean(values);
    if (average == null) return null;
    return { average, stdDev: sampleStdDev(values, average), count: values.length };
  }

  function zScore(value, stats) {
    if (stats.stdDev === 0) return value === stats.average ? 0 : Infinity;
    return (value - stats.average) / stats.stdDev;
  }

  // Leave-one-out: an entry's own value must never inform the peer statistic it is judged
  // against, or an extreme outlier inflates the very mean/stddev used to screen it out.
  function leaveOneOutStats(eligibleEntries, selfEntry, selector) {
    const others = eligibleEntries.filter((entry) => entry !== selfEntry).map(selector);
    return peerStats(others);
  }

  function outlierReason(ratioLabel, ratioValue, z, stats, peerGroupLabel) {
    const ratioText = percent(ratioValue);
    if (!Number.isFinite(z)) {
      return `Freight is ${ratioText} of ${ratioLabel}, far above ${peerGroupLabel} peers (no variation among the ${stats.count} other quoted candidates).`;
    }
    return `Freight is ${ratioText} of ${ratioLabel}, ${round(z, 1)}σ above ${peerGroupLabel} peers (peer average ${percent(stats.average)} across ${stats.count} other quoted candidates).`;
  }

  function freightFromComparison(comparison) {
    return comparison && comparison.ok && comparison.current
      ? Number(comparison.current.published_base_transportation_total_usd || 0)
      : null;
  }

  function buildEntry(candidate, draft) {
    const comparison = draft && draft.comparison && draft.comparison.ok ? draft.comparison : null;
    if (!comparison) return null;
    const freight = freightFromComparison(comparison);
    if (freight == null) return null;

    const orderValue = Number(candidate.total_extended_resale || 0);
    const margin = Number(candidate.gross_margin || 0);

    return {
      candidate,
      peerGroup: candidate.rate_card_type || "UNKNOWN",
      freight,
      orderValue,
      margin,
      ratioToValue: orderValue > 0 ? freight / orderValue : null,
      ratioToMargin: margin > 0 ? freight / margin : null
    };
  }

  // A candidate cannot be an anomaly before it has a freight figure, so only quoted
  // candidates (a saved draft with a completed published base-rate comparison) are scanned.
  function detect(candidates, getDraft, options) {
    const settings = Object.assign({
      sigmaMultiplier: SIGMA_MULTIPLIER,
      minPeerGroupSize: MIN_PEER_GROUP_SIZE,
      fallbackRatioToValueThreshold: FALLBACK_RATIO_TO_VALUE_THRESHOLD,
      fallbackRatioToMarginThreshold: FALLBACK_RATIO_TO_MARGIN_THRESHOLD
    }, options || {});

    const resolveDraft = typeof getDraft === "function" ? getDraft : (id) => (getDraft || {})[id] || null;

    const entries = (candidates || [])
      .map((candidate) => buildEntry(candidate, resolveDraft(candidate.id)))
      .filter(Boolean);

    const groups = new Map();
    entries.forEach((entry) => {
      if (!groups.has(entry.peerGroup)) groups.set(entry.peerGroup, []);
      groups.get(entry.peerGroup).push(entry);
    });

    const flagged = [];

    groups.forEach((groupEntries, peerGroup) => {
      const valueEligible = groupEntries.filter((entry) => entry.ratioToValue != null);
      const marginEligible = groupEntries.filter((entry) => entry.ratioToMargin != null);

      // Small-group fallback: z-scores are unreliable with too few peers, so fall back to
      // fixed screening thresholds instead of a peer-relative statistic.
      const useValueZScore = valueEligible.length >= settings.minPeerGroupSize;
      const useMarginZScore = marginEligible.length >= settings.minPeerGroupSize;
      const peerGroupLabel = titleCase(peerGroup);

      groupEntries.forEach((entry) => {
        const reasons = [];
        let severity = -Infinity;

        if (entry.margin <= 0) {
          severity = Infinity;
          reasons.push(
            `Freight (${money(entry.freight)}) meets or exceeds the ${entry.margin < 0 ? "negative" : "zero"} gross margin (${money(entry.margin)}) on this candidate, so freight erodes margin entirely.`
          );
        } else if (entry.ratioToMargin != null) {
          if (useMarginZScore) {
            const stats = leaveOneOutStats(marginEligible, entry, (peer) => peer.ratioToMargin);
            const z = zScore(entry.ratioToMargin, stats);
            if (z > settings.sigmaMultiplier) {
              severity = Math.max(severity, z);
              reasons.push(outlierReason("margin", entry.ratioToMargin, z, stats, peerGroupLabel));
            }
          } else if (entry.ratioToMargin > settings.fallbackRatioToMarginThreshold) {
            severity = Math.max(severity, entry.ratioToMargin / settings.fallbackRatioToMarginThreshold);
            reasons.push(
              `Freight is ${percent(entry.ratioToMargin)} of margin, above the ${percent(settings.fallbackRatioToMarginThreshold)} screening threshold used because fewer than ${settings.minPeerGroupSize} ${peerGroupLabel} candidates are quoted for a statistical comparison.`
            );
          }
        }

        if (entry.ratioToValue != null) {
          if (useValueZScore) {
            const stats = leaveOneOutStats(valueEligible, entry, (peer) => peer.ratioToValue);
            const z = zScore(entry.ratioToValue, stats);
            if (z > settings.sigmaMultiplier) {
              severity = Math.max(severity, z);
              reasons.push(outlierReason("order value", entry.ratioToValue, z, stats, peerGroupLabel));
            }
          } else if (entry.ratioToValue > settings.fallbackRatioToValueThreshold) {
            severity = Math.max(severity, entry.ratioToValue / settings.fallbackRatioToValueThreshold);
            reasons.push(
              `Freight is ${percent(entry.ratioToValue)} of order value, above the ${percent(settings.fallbackRatioToValueThreshold)} screening threshold used because fewer than ${settings.minPeerGroupSize} ${peerGroupLabel} candidates are quoted for a statistical comparison.`
            );
          }
        }

        if (reasons.length) {
          flagged.push({
            candidate_id: entry.candidate.id,
            peer_group: peerGroup,
            freight_usd: round(entry.freight, 2),
            order_value_usd: round(entry.orderValue, 2),
            margin_usd: round(entry.margin, 2),
            ratio_to_value: entry.ratioToValue,
            ratio_to_margin: entry.ratioToMargin,
            severity,
            reasons
          });
        }
      });
    });

    // Worst offenders first: margin-erosion cases (severity Infinity) lead, then descending
    // by how far each ratio sits above its z-score or fixed-threshold bar.
    flagged.sort((left, right) => right.severity - left.severity);

    return {
      quoted_count: entries.length,
      flagged_count: flagged.length,
      sigma_multiplier: settings.sigmaMultiplier,
      min_peer_group_size: settings.minPeerGroupSize,
      flagged
    };
  }

  const api = Object.freeze({
    SIGMA_MULTIPLIER,
    MIN_PEER_GROUP_SIZE,
    FALLBACK_RATIO_TO_VALUE_THRESHOLD,
    FALLBACK_RATIO_TO_MARGIN_THRESHOLD,
    detect
  });

  global.FreightAnomaly = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

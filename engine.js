/* DoseClock engine - turns "N times a day" prescriptions into clock times that fit a waking window. */
const DoseEngine = (() => {
  'use strict';

  function parseTime(s) {
    if (typeof s !== 'string') throw new Error('time must be a string');
    const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) throw new Error('bad time format');
    const h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) throw new Error('time out of range');
    return h * 60 + mi;
  }

  function fmtTime(mins) {
    const m = ((Math.round(mins) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  // Waking window in minutes; supports overnight (sleep earlier than wake = next day).
  function windowMin(wakeMin, sleepMin) {
    let w = sleepMin - wakeMin;
    if (w <= 0) w += 1440;
    return w;
  }

  function round5(m) { return Math.round(m / 5) * 5; }

  /*
   * plan({wakeMin, sleepMin, doses, minGapMin, mealsMin, withFood})
   * - doses: 1..6
   * - minGapMin: required spacing between consecutive doses
   * - withFood + mealsMin: snap doses to the nearest meal within 45 min (each meal used once)
   * Returns {feasible, times[], gaps[], reason, maxDoses}
   */
  function plan(opts) {
    const wake = opts.wakeMin, sleep = opts.sleepMin;
    const doses = Math.round(Number(opts.doses));
    const minGap = Math.round(Number(opts.minGapMin) || 0);
    if (!Number.isFinite(doses) || doses < 1 || doses > 6) throw new Error('doses must be 1-6');
    if (minGap < 0 || minGap > 720) throw new Error('gap must be 0-720 min');
    const win = windowMin(wake, sleep);
    const maxDoses = minGap > 0 ? Math.floor(win / minGap) + 1 : 6;
    if (doses > maxDoses) {
      return { feasible: false, times: [], gaps: [], maxDoses: maxDoses,
        reason: doses + ' doses need ' + (doses - 1) + ' gaps of ' + minGap + ' min = ' + ((doses - 1) * minGap) + ' min, but the waking window is only ' + win + ' min. Max feasible: ' + maxDoses + '.' };
    }
    let times;
    if (doses === 1) {
      times = [wake];
    } else {
      const step = win / (doses - 1);
      times = [wake];
      for (let k = 1; k < doses - 1; k++) times.push(round5(wake + k * step));
      times.push(wake + win); // last dose lands exactly at sleep time
      // enforce min gap after rounding by pushing later doses forward
      for (let i = 1; i < times.length; i++) {
        if (times[i] - times[i - 1] < minGap) times[i] = times[i - 1] + minGap;
      }
      if (times[times.length - 1] > wake + win) {
        times[times.length - 1] = wake + win;
        for (let i = 1; i < times.length; i++) {
          if (times[i] - times[i - 1] < minGap) {
            return { feasible: false, times: [], gaps: [], maxDoses: maxDoses,
              reason: 'Doses do not fit inside the waking window with the required gap.' };
          }
        }
      }
    }
    if (opts.withFood && Array.isArray(opts.mealsMin) && opts.mealsMin.length) {
      const used = new Set();
      const snapped = times.map(t => {
        let best = null, bestD = 46; // snap tolerance 45 min
        for (const m of opts.mealsMin) {
          let d = Math.abs(m - (t % 1440)); if (d > 720) d = 1440 - d;
          if (d < bestD && !used.has(m)) { bestD = d; best = m; }
        }
        if (best === null) return t;
        used.add(best);
        // express meal time on the same day-offset as t
        let s = best + Math.floor(t / 1440) * 1440;
        if (s < wake) s += 1440;
        return s;
      });
      snapped.sort((a, b) => a - b);
      // verify snapping did not violate the min gap; fall back to unsnapped if it did
      let ok = true;
      for (let i = 1; i < snapped.length; i++) if (snapped[i] - snapped[i - 1] < minGap) ok = false;
      if (ok) times = snapped;
    }
    const gaps = [];
    for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
    return { feasible: true, times: times, gaps: gaps, maxDoses: maxDoses, reason: '' };
  }

  function summarize(p) {
    if (!p.feasible) return { timesText: [], gapsText: [], minGap: 0 };
    return {
      timesText: p.times.map(fmtTime),
      gapsText: p.gaps.map(g => Math.floor(g / 60) + 'h ' + String(g % 60).padStart(2, '0') + 'm'),
      minGap: p.gaps.length ? Math.min.apply(null, p.gaps) : 0
    };
  }

  return { parseTime, fmtTime, windowMin, plan, summarize };
})();
if (typeof module !== 'undefined') module.exports = DoseEngine;

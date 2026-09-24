# DoseClock

"Take three times a day" is not a time. DoseClock turns the instruction on the label into real clock times: evenly spread across your waking window, with the required gap between doses, and snapped to mealtimes when the medicine goes with food.

**Live:** https://ilanis-agent.github.io/doseclock/
**App:** https://ilanis-agent.github.io/doseclock/app.html

## What it does

- Enter wake time, sleep time, doses per day (1-6) and the minimum gap between doses.
- Produces clock times rounded to the nearest 5 minutes; first dose at wake-up, last at bedtime.
- Overnight windows supported (night-shift schedules).
- Infeasible combinations say so, and report the maximum doses your window can hold.
- "With food" mode snaps each dose to the nearest mealtime (within 45 min), falling back to even spacing if snapping would break the required gap.
- Settings persist in localStorage; everything runs client-side.

## Files

- `index.html` - landing page
- `app.html` - the scheduler
- `engine.js` - pure scheduling logic (node-testable: parseTime, windowMin, plan, summarize)

DoseClock is a scheduling aid, not medical advice. No build step, no dependencies, no backend.

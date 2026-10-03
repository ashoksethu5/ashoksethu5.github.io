# RefinishPro job scheduler

Crew calendar for Door Renew Detroit. Enter a quote and it lands on the weekday calendar around work that is already locked in.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
```

## What you can do

Opening the site shows the scheduler. There are no sample customers or jobs.

- **Scheduler** is a staff-by-day week for Staff A through Staff E. Solid blocks are locked. Dashed blocks can still be moved. **Re-run estimator** fits every unlocked job around the locked ones. Weekends and US federal holidays are already blocked.
- **Jobs** lists every quote, the lifecycle state, the promised date, and which deposits are paid.
- **New quote** takes the customer, quote amount, promised delivery date, a three-part deposit split, and the shop/field day sequence. **Send to estimator** places the job on the calendar. **Save draft** keeps it off the calendar.
- **Job detail** is where the stage is updated by hand (L1 through L5), deposits are marked paid, and the sequence or first work day can be changed.

Jobs you add stay in this browser.

## Publish on GitHub Pages

The live site is [refinishprodetroit.com](https://refinishprodetroit.com), from the `ashoksethu5/ashoksethu5.github.io` repository. GitHub Pages cannot run this folder as source code. Build the static site, then upload the files inside `out` into the existing `job-pilot` folder.

```bash
cd ~/job-pilot
git pull
npm install
npm run pages
```

Also add an empty file named `.nojekyll` next to `CNAME` in that GitHub repository. Without it, GitHub hides the `_next` folder and the page loads with no styling.

The scheduler is then at [https://refinishprodetroit.com/job-pilot/](https://refinishprodetroit.com/job-pilot/).

To open that page as soon as someone visits the domain, replace the root `index.html` (the file that currently says `hello`) with `deploy/index.html` from this repo. Leave `CNAME` where it is. That file sends refinishprodetroit.com straight to `/job-pilot/` without a click.

## How a job moves

| State | Meaning | Estimator |
| --- | --- | --- |
| L1 | Quote accepted, first deposit expected | Can move it |
| L2 | Placed on the calendar | Can move it |
| L3 | Schedule sent to the customer | Locked |
| L4 | Work started, second deposit expected | Locked |
| L5 | Work finished, final payment expected | Locked |

P1 + P2 + P3 has to equal the quote. A deposit amount locks once it is marked paid. The paid date cannot be after today. When the job is L5 and all three deposits are paid, the record is complete and nothing on it can change.

Each day in the sequence is shop (`S`), field (`F`), or both (`SF`). An `SF` day needs two people. One person can only be shop or field on a given day. Work skips weekends, federal holidays, and days when the whole crew is out. The first version places unlocked jobs as early as possible, earlier promises first, and flags any job that still finishes after its promised date. A later pass can optimize collected revenue by week.

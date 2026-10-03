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

- **Jobs** lists every quote, the lifecycle state, the promised date, and which deposits are paid.
- **New quote** takes the customer, quote amount, promised delivery date, a three-part deposit split, and the shop/field day sequence. **Send to estimator** places the job on the calendar. **Save draft** keeps it off the calendar.
- **Job detail** is where the stage is updated by hand (L1 through L5), deposits are marked paid, and the sequence or first work day can be changed.
- **Calendar** is a staff-by-day week. Solid blocks are locked. Dashed blocks can still be moved. **Re-run estimator** fits every unlocked job around the locked ones.
- **Staff** is the crew list, plus vacation or sick time for one day or a stretch of days. US federal holidays are already blocked.
- **Revenue** splits **Scheduled** (not collected yet) from **Income** (marked paid) for today, this week, the month to date, or a custom range.

The sample schedule is there the first time you open the app. **Staff → Reset sample data** puts it back. Everything is stored in this browser.

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

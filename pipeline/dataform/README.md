# Dataform — running the curated layer in your own project

`workflow_settings.yaml` pins `defaultProject`. Every `.sqlx` reads
`${dataform.projectConfig.defaultDatabase}` rather than a literal project, so pointing the
whole graph somewhere else is a one-line change — **which you should not commit**, since it
is a personal setting.

## Prerequisites

`ro_raw.unit_readings_ae_raw` and `ro_raw.unit_readings_fg_raw` must already exist in the
target project. Either copy them (`bq cp`, ~30 MB, no GCS needed):

```bash
bq --project_id=<target> mk --location=us-central1 --dataset <target>:ro_raw
for t in unit_readings_ae_raw unit_readings_fg_raw; do
  bq --project_id=<target> cp spatial-cat-489006-a4:ro_raw.$t <target>:ro_raw.$t
done
```

...or load them from the public source with `pipeline/ingest/load_raw.py`
(Harvard Dataverse [DOI:10.7910/DVN/PVY3QD](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/PVY3QD)).

Use `us-central1`, not the `US` multi-region. BigQuery treats them as different locations and
`defaultLocation` here is `us-central1`; a mismatch makes every action fail to resolve its
inputs.

## Run

```bash
npm install @dataform/cli@3.0.63

cp -R pipeline/dataform /tmp/dfrun            # keep the repo copy clean
sed -i '' 's/^defaultProject: .*/defaultProject: <target>/' /tmp/dfrun/workflow_settings.yaml
echo '{"projectId": "<target>", "location": "us-central1"}' > /tmp/dfrun/.df-credentials.json

cd /tmp/dfrun && GOOGLE_CLOUD_QUOTA_PROJECT=<target> dataform run
```

Two things that will otherwise waste your time:

- **`.df-credentials.json` without a `credentials` key uses ADC**, so no service-account key
  is needed. Don't create one just for this.
- **`GOOGLE_CLOUD_QUOTA_PROJECT`** — the Node BigQuery client takes the quota project from
  your ADC file, which may still point at some long-deleted project and fail with
  `Project <x> has been deleted` before it ever reaches your tables.

Note that most curated actions carry no tag, so `--tags curated` runs almost nothing. Run the
whole graph, or name actions explicitly with `--actions`.

## Expected result

Verified on 2026-08-04 against a freshly created project — identical to the source on every
figure, including the ΔP sum to three decimals:

| | source | rebuilt |
|---|---|---|
| `unit_readings` | 15,624 | 15,624 |
| distinct units | 21 | 21 |
| `cip_events` | 71 | 71 |
| `cleaning_cycles` | 92 | 92 |
| `unit_energy` | 4,464 | 4,464 |
| `signal_provenance` | 21 | 21 |
| date range | 2019-01-01 … 2021-01-13 | same |
| `SUM(unit_n_delta_p)` | 691676.617 | 691676.617 |

All 16 assertions pass.

## Known: three staging views will fail

`stg_eia_prices`, `stg_eia_carbon` and `stg_open_meteo` read
`ro_raw.eia_prices_raw`, `ro_raw.eia_generation_mix_raw` and `ro_raw.open_meteo_forecast_raw`.
Those tables **do not exist in the source project either** — the spec 010 external-data
ingest was written but never run, so this is not a migration problem and copying more tables
will not fix it. `environmental_context` is skipped in turn, since it depends on them.

To populate them, run `pipeline/ingest/fetch_eia.py` (needs `EIA_API_KEY`) and
`pipeline/ingest/fetch_weather.py`; both honour `GOOGLE_CLOUD_PROJECT`. Nothing in specs
003–007 depends on them.

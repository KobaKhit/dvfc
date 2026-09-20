#!/usr/bin/env bash
# Fake MetricFlow CLI for tests, prints explain SQL for any metric.
# Usage: DVFC_METRICFLOW_BIN=./path/to/fake-mf.sh
set -euo pipefail
metric="unknown"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --metrics) metric="$2"; shift 2 ;;
    *) shift ;;
  esac
done
cat <<EOF
🔎 SQL:
SELECT
  date AS metric_time,
  sales AS ${metric}
FROM 'sales_daily.csv'
EOF

-- Compiled MetricFlow / dbt semantic SQL fixture for total_revenue
SELECT
  date,
  sales AS revenue,
  region
FROM '../sales-dash/dbt-stub/sales_daily.csv'

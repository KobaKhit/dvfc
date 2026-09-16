import * as vg from '@uwdata/vgplot';

// Initialize Mosaic coordinator with DuckDB-WASM
vg.coordinator().databaseConnector(vg.wasmConnector());

async function loadData() {
  const origin = window.location.origin;
  
  await vg.coordinator().exec(`
    CREATE TABLE IF NOT EXISTS sales_daily AS 
    SELECT * FROM read_csv_auto('${origin}/data/sales_daily.csv')
  `);
  await vg.coordinator().exec(`
    CREATE TABLE IF NOT EXISTS flights_summary AS 
    SELECT * FROM read_csv_auto('${origin}/data/flights_summary.csv')
  `);
}

async function createDashboard() {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Loading data...';

  try {
    await loadData();
    if (statusEl) statusEl.textContent = 'Creating visualizations...';

    // Create selections
    const salesBrush = vg.Selection.intersect();
  const flightsBrush = vg.Selection.intersect();

    // Create charts
    const containersales_trend = document.getElementById('chart-sales_trend');
  if (containersales_trend) {
    const chartsales_trend = vg.plot(
      vg.lineY(
        vg.from('sales_daily'),
        {
          x: 'date',
          y: vg.sum('sales'),
          stroke: fill,
          strokeWidth: 2
        }
      ),
      vg.intervalX({ as: salesBrush }),
      vg.xLabel('Date (brush here to filter)'),
      vg.yLabel('Daily Sales ($)'),
      vg.width(600),
      vg.height(250)
    );
    containersales_trend.appendChild(chartsales_trend);
  }

  const containersales_by_region = document.getElementById('chart-sales_by_region');
  if (containersales_by_region) {
    const chartsales_by_region = vg.plot(
      vg.barY(
        vg.from('sales_daily', { filterBy: salesBrush }),
        {
          x: 'region',
          y: vg.sum('sales'),
          fill: 'steelblue',
          fillOpacity: 0.8
        }
      ),
      vg.xLabel('Region'),
      vg.yLabel('Total Sales ($)'),
      vg.width(600),
      vg.height(300)
    );
    containersales_by_region.appendChild(chartsales_by_region);
  }

  const containersales_by_product = document.getElementById('chart-sales_by_product');
  if (containersales_by_product) {
    const chartsales_by_product = vg.plot(
      vg.barY(
        vg.from('sales_daily', { filterBy: salesBrush }),
        {
          x: 'product',
          y: vg.sum('sales'),
          fill: 'darkorange',
          fillOpacity: 0.8
        }
      ),
      vg.xLabel('Product'),
      vg.yLabel('Total Sales ($)'),
      vg.width(600),
      vg.height(300)
    );
    containersales_by_product.appendChild(chartsales_by_product);
  }

  const containerpassenger_trend = document.getElementById('chart-passenger_trend');
  if (containerpassenger_trend) {
    const chartpassenger_trend = vg.plot(
      vg.lineY(
        vg.from('flights_summary'),
        {
          x: 'date',
          y: vg.sum('passengers'),
          stroke: fill,
          strokeWidth: 2
        }
      ),
      vg.intervalX({ as: flightsBrush }),
      vg.xLabel('Date (brush here to filter)'),
      vg.yLabel('Daily Passengers'),
      vg.width(600),
      vg.height(250)
    );
    containerpassenger_trend.appendChild(chartpassenger_trend);
  }

  const containerflights_by_origin = document.getElementById('chart-flights_by_origin');
  if (containerflights_by_origin) {
    const chartflights_by_origin = vg.plot(
      vg.barY(
        vg.from('flights_summary', { filterBy: flightsBrush }),
        {
          x: 'origin',
          y: vg.sum('flights'),
          fill: 'mediumpurple',
          fillOpacity: 0.8
        }
      ),
      vg.xLabel('Origin Airport'),
      vg.yLabel('Total Flights'),
      vg.width(600),
      vg.height(300)
    );
    containerflights_by_origin.appendChild(chartflights_by_origin);
  }

  const containerdelay_by_origin = document.getElementById('chart-delay_by_origin');
  if (containerdelay_by_origin) {
    const chartdelay_by_origin = vg.plot(
      vg.barY(
        vg.from('flights_summary', { filterBy: flightsBrush }),
        {
          x: 'origin',
          y: vg.avg('delay_minutes'),
          fill: 'crimson',
          fillOpacity: 0.8
        }
      ),
      vg.xLabel('Origin Airport'),
      vg.yLabel('Avg Delay (minutes)'),
      vg.width(600),
      vg.height(300)
    );
    containerdelay_by_origin.appendChild(chartdelay_by_origin);
  }

    if (statusEl) {
      statusEl.textContent = '✅ Dashboard ready! Brush line charts to filter other charts.';
      statusEl.style.color = 'green';
    }
  } catch (error) {
    console.error('Error:', error);
    if (statusEl) {
      statusEl.textContent = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      statusEl.style.color = 'red';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createDashboard);
} else {
  createDashboard();
}

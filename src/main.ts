import * as vg from '@uwdata/vgplot';

// Initialize Mosaic coordinator with DuckDB-WASM connector for in-browser execution
vg.coordinator().databaseConnector(vg.wasmConnector());

/**
 * Load CSV data into DuckDB via vgplot's built-in connector
 */
async function loadData() {
  const origin = window.location.origin;
  
  // Load sales data
  await vg.coordinator().exec(`
    CREATE TABLE IF NOT EXISTS sales_daily AS 
    SELECT * FROM read_csv_auto('${origin}/dbt-stub/sales_daily.csv')
  `);

  // Load flights data
  await vg.coordinator().exec(`
    CREATE TABLE IF NOT EXISTS flights_summary AS 
    SELECT * FROM read_csv_auto('${origin}/dbt-stub/flights_summary.csv')
  `);
}

/**
 * Create the dashboard with linked charts
 */
async function createDashboard() {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = 'Initializing database...';
  }

  try {
    // Load data
    if (statusEl) {
      statusEl.textContent = 'Loading data...';
    }
    await loadData();

    if (statusEl) {
      statusEl.textContent = 'Creating visualizations...';
    }

    // Create coordinated selections for crossfiltering
    const salesBrush = vg.Selection.intersect();
    const flightsBrush = vg.Selection.intersect();

    // Sales Dashboard Section
    const salesContainer = document.getElementById('sales-dashboard');
    if (salesContainer) {
      salesContainer.innerHTML = '<h2>Sales Analytics (dbt: sales_daily)</h2>';

      // Daily Sales Trend with brush selector (on time axis - works better)
      const salesTrend = vg.plot(
        vg.lineY(
          vg.from('sales_daily'),
          {
            x: 'date',
            y: vg.sum('sales'),
            stroke: 'steelblue',
            strokeWidth: 2
          }
        ),
        vg.intervalX({ as: salesBrush }),
        vg.xLabel('Date (brush here to filter)'),
        vg.yLabel('Daily Sales ($)'),
        vg.width(600),
        vg.height(250)
      );

      // Sales by Region (filtered by date selection)
      const salesByRegion = vg.plot(
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

      // Sales by Product (filtered by date selection)
      const salesByProduct = vg.plot(
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

      salesContainer.appendChild(salesTrend);
      salesContainer.appendChild(salesByRegion);
      salesContainer.appendChild(salesByProduct);
    }

    // Flights Dashboard Section
    const flightsContainer = document.getElementById('flights-dashboard');
    if (flightsContainer) {
      flightsContainer.innerHTML = '<h2>Flights Analytics (dbt: flights_summary)</h2>';

      // Daily Passenger Trend with brush selector
      const passengerTrend = vg.plot(
        vg.lineY(
          vg.from('flights_summary'),
          {
            x: 'date',
            y: vg.sum('passengers'),
            stroke: 'mediumpurple',
            strokeWidth: 2
          }
        ),
        vg.intervalX({ as: flightsBrush }),
        vg.xLabel('Date (brush here to filter)'),
        vg.yLabel('Daily Passengers'),
        vg.width(600),
        vg.height(250)
      );

      // Flights by Origin (filtered by date selection)
      const flightsByOrigin = vg.plot(
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

      // Average Delay by Origin (filtered by date selection)
      const delayByOrigin = vg.plot(
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

      flightsContainer.appendChild(passengerTrend);
      flightsContainer.appendChild(flightsByOrigin);
      flightsContainer.appendChild(delayByOrigin);
    }

    if (statusEl) {
      statusEl.textContent = '✅ Dashboard ready! Try brushing (click and drag) on the bar charts to see crossfiltering in action.';
      statusEl.style.color = 'green';
    }

  } catch (error) {
    console.error('Error initializing dashboard:', error);
    if (statusEl) {
      statusEl.textContent = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
      statusEl.style.color = 'red';
    }
  }
}

// Initialize dashboard when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createDashboard);
} else {
  createDashboard();
}

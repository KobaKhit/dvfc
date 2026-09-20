/**
 * Example plugin chart type — registers as `hello`
 * Load via: loadChartTypeModules([new URL('./hello-chart-type.js', import.meta.url).href])
 */

/** @type {import('../dist/registry.js').ChartTypeModule} */
const helloChartType = {
  id: 'hello',
  label: 'Hello',
  description: 'Example plugin chart type for registry tests',
  capabilities: {
    mosaic: true,
    vegaLite: false,
    interaction: [],
  },
  validate(chart) {
    const c = /** @type {{ options?: { message?: string } }} */ (chart);
    if (c.options && c.options.message != null && typeof c.options.message !== 'string') {
      return [{ path: '/options/message', message: 'message must be a string' }];
    }
    return [];
  },
};

export default helloChartType;

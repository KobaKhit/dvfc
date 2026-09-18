/**
 * JSON Schema for DashboardSpec validation
 * Can be used with ajv or other JSON Schema validators
 */
export const DashboardSpecSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://dvfc.dev/schema/dashboard-spec.json',
    title: 'DashboardSpec',
    description: 'Schema for Data Viz Factory dashboard specifications',
    type: 'object',
    required: ['meta', 'data', 'charts'],
    properties: {
        meta: {
            type: 'object',
            required: ['title', 'version'],
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' }
            },
            additionalProperties: true
        },
        data: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'type'],
                properties: {
                    id: { type: 'string' },
                    type: {
                        type: 'string',
                        enum: ['dbt', 'csv', 'parquet', 'url']
                    },
                    model: { type: 'string' },
                    path: { type: 'string' },
                    sql: { type: 'string' }
                },
                oneOf: [
                    { required: ['model'] },
                    { required: ['path'] }
                ]
            }
        },
        charts: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'type'],
                properties: {
                    id: { type: 'string' },
                    type: {
                        type: 'string',
                        enum: ['bar', 'line', 'area', 'scatter', 'histogram', 'heatmap', 'pie', 'donut', 'number', 'table', 'text']
                    },
                    dataSource: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    encoding: {
                        type: 'object',
                        properties: {
                            x: { $ref: '#/definitions/channelEncoding' },
                            y: { $ref: '#/definitions/channelEncoding' },
                            color: {
                                oneOf: [
                                    { $ref: '#/definitions/channelEncoding' },
                                    { type: 'string' }
                                ]
                            },
                            size: {
                                oneOf: [
                                    { $ref: '#/definitions/channelEncoding' },
                                    { type: 'number' }
                                ]
                            }
                        }
                    },
                    overlays: {
                        type: 'array',
                        items: { $ref: '#/definitions/analysisOverlay' }
                    },
                    interaction: {
                        type: 'object',
                        properties: {
                            brush: { type: 'boolean' },
                            brushAxis: {
                                type: 'string',
                                enum: ['x', 'y', 'xy']
                            },
                            selection: { type: 'string' },
                            filterBy: { type: 'string' }
                        }
                    },
                    width: { type: 'number', minimum: 0 },
                    height: { type: 'number', minimum: 0 }
                },
                if: {
                    properties: { type: { const: 'text' } }
                },
                then: {
                    required: ['id', 'type', 'content']
                },
                else: {
                    required: ['id', 'type', 'dataSource', 'encoding']
                }
            }
        },
        layout: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['grid', 'flex', 'stack']
                },
                columns: { type: 'number', minimum: 1 },
                gap: { type: 'number', minimum: 0 }
            }
        },
        theme: {
            type: 'object',
            properties: {
                colors: {
                    type: 'array',
                    items: { type: 'string' }
                },
                fontFamily: { type: 'string' },
                backgroundColor: { type: 'string' }
            }
        }
    },
    definitions: {
        channelEncoding: {
            type: 'object',
            required: ['field'],
            properties: {
                field: { type: 'string' },
                type: {
                    type: 'string',
                    enum: ['quantitative', 'temporal', 'nominal', 'ordinal']
                },
                aggregate: {
                    type: 'string',
                    enum: ['sum', 'avg', 'count', 'min', 'max', 'median']
                },
                label: { type: 'string' },
                sql: { type: 'string' }
            }
        },
        analysisOverlay: {
            type: 'object',
            required: ['type'],
            properties: {
                type: {
                    type: 'string',
                    enum: ['mean', 'median', 'trend', 'moving_average']
                },
                field: { type: 'string' },
                color: { type: 'string' },
                label: { type: 'string' },
                window: { type: 'number', minimum: 2 }
            }
        }
    }
};
/**
 * Simple validator function (stub - can integrate ajv for full validation)
 */
export function validateDashboardSpec(spec) {
    const errors = [];
    if (typeof spec !== 'object' || spec === null) {
        return { valid: false, errors: ['Spec must be an object'] };
    }
    const s = spec;
    if (!s.meta || typeof s.meta !== 'object') {
        errors.push('Missing or invalid "meta" field');
    }
    if (!Array.isArray(s.data)) {
        errors.push('Missing or invalid "data" array');
    }
    if (!Array.isArray(s.charts)) {
        errors.push('Missing or invalid "charts" array');
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

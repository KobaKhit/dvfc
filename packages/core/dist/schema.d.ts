/**
 * JSON Schema for DashboardSpec validation
 * Can be used with ajv or other JSON Schema validators
 */
export declare const DashboardSpecSchema: {
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly $id: "https://dvfc.dev/schema/dashboard-spec.json";
    readonly title: "DashboardSpec";
    readonly description: "Schema for Data Viz Factory dashboard specifications";
    readonly type: "object";
    readonly required: readonly ["meta", "data", "charts"];
    readonly properties: {
        readonly meta: {
            readonly type: "object";
            readonly required: readonly ["title", "version"];
            readonly properties: {
                readonly title: {
                    readonly type: "string";
                };
                readonly description: {
                    readonly type: "string";
                };
                readonly version: {
                    readonly type: "string";
                    readonly pattern: "^\\d+\\.\\d+\\.\\d+$";
                };
            };
            readonly additionalProperties: true;
        };
        readonly data: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["id", "type"];
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["dbt", "csv", "parquet", "url"];
                    };
                    readonly model: {
                        readonly type: "string";
                    };
                    readonly path: {
                        readonly type: "string";
                    };
                    readonly sql: {
                        readonly type: "string";
                    };
                };
                readonly oneOf: readonly [{
                    readonly required: readonly ["model"];
                }, {
                    readonly required: readonly ["path"];
                }];
            };
        };
        readonly charts: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["id", "type"];
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["bar", "line", "area", "scatter", "histogram", "heatmap", "pie", "donut", "number", "table", "text"];
                    };
                    readonly dataSource: {
                        readonly type: "string";
                    };
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly content: {
                        readonly type: "string";
                    };
                    readonly encoding: {
                        readonly type: "object";
                        readonly properties: {
                            readonly x: {
                                readonly $ref: "#/definitions/channelEncoding";
                            };
                            readonly y: {
                                readonly $ref: "#/definitions/channelEncoding";
                            };
                            readonly color: {
                                readonly oneOf: readonly [{
                                    readonly $ref: "#/definitions/channelEncoding";
                                }, {
                                    readonly type: "string";
                                }];
                            };
                            readonly size: {
                                readonly oneOf: readonly [{
                                    readonly $ref: "#/definitions/channelEncoding";
                                }, {
                                    readonly type: "number";
                                }];
                            };
                        };
                    };
                    readonly overlays: {
                        readonly type: "array";
                        readonly items: {
                            readonly $ref: "#/definitions/analysisOverlay";
                        };
                    };
                    readonly interaction: {
                        readonly type: "object";
                        readonly properties: {
                            readonly brush: {
                                readonly type: "boolean";
                            };
                            readonly brushAxis: {
                                readonly type: "string";
                                readonly enum: readonly ["x", "y", "xy"];
                            };
                            readonly selection: {
                                readonly type: "string";
                            };
                            readonly filterBy: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly width: {
                        readonly type: "number";
                        readonly minimum: 0;
                    };
                    readonly height: {
                        readonly type: "number";
                        readonly minimum: 0;
                    };
                };
                readonly if: {
                    readonly properties: {
                        readonly type: {
                            readonly const: "text";
                        };
                    };
                };
                readonly then: {
                    readonly required: readonly ["id", "type", "content"];
                };
                readonly else: {
                    readonly required: readonly ["id", "type", "dataSource", "encoding"];
                };
            };
        };
        readonly layout: {
            readonly type: "object";
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["grid", "flex", "stack"];
                };
                readonly columns: {
                    readonly type: "number";
                    readonly minimum: 1;
                };
                readonly gap: {
                    readonly type: "number";
                    readonly minimum: 0;
                };
            };
        };
        readonly theme: {
            readonly type: "object";
            readonly properties: {
                readonly colors: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly fontFamily: {
                    readonly type: "string";
                };
                readonly backgroundColor: {
                    readonly type: "string";
                };
            };
        };
    };
    readonly definitions: {
        readonly channelEncoding: {
            readonly type: "object";
            readonly required: readonly ["field"];
            readonly properties: {
                readonly field: {
                    readonly type: "string";
                };
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["quantitative", "temporal", "nominal", "ordinal"];
                };
                readonly aggregate: {
                    readonly type: "string";
                    readonly enum: readonly ["sum", "avg", "count", "min", "max", "median"];
                };
                readonly label: {
                    readonly type: "string";
                };
                readonly sql: {
                    readonly type: "string";
                };
            };
        };
        readonly analysisOverlay: {
            readonly type: "object";
            readonly required: readonly ["type"];
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["mean", "median", "trend", "moving_average"];
                };
                readonly field: {
                    readonly type: "string";
                };
                readonly color: {
                    readonly type: "string";
                };
                readonly label: {
                    readonly type: "string";
                };
                readonly window: {
                    readonly type: "number";
                    readonly minimum: 2;
                };
            };
        };
    };
};
/**
 * Simple validator function (stub - can integrate ajv for full validation)
 */
export declare function validateDashboardSpec(spec: unknown): {
    valid: boolean;
    errors?: string[];
};

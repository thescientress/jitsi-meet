/* global __dirname */

const CircularDependencyPlugin = require('circular-dependency-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const optionalRequire = require('optional-require')(require);
const path = require('path');
const process = require('process');
const { EnvironmentPlugin } = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const dotenv = optionalRequire(`${__dirname}/.env.json`);

/**
 * The URL of the Jitsi Meet deployment to be proxy to in the context of
 * development with webpack-dev-server.
 */
const devServerProxyTarget
    = (dotenv && dotenv.WEBPACK_DEV_SERVER_PROXY_TARGET)
        || process.env.WEBPACK_DEV_SERVER_PROXY_TARGET
        || 'https://alpha.jitsi.net';

const analyzeBundle = process.argv.indexOf('--analyze-bundle') !== -1;
const detectCircularDeps = process.argv.indexOf('--detect-circular-deps') !== -1;

const minimize
    = process.argv.indexOf('-p') !== -1
    || process.argv.indexOf('--optimize-minimize') !== -1;

const isDevelopment = process.argv.indexOf('-p') === -1;

/**
 * Build a Performance configuration object for the given size.
 * See: https://webpack.js.org/configuration/performance/
 */
function getPerformanceHints(size) {
    return {
        hints: minimize ? 'error' : false,
        maxAssetSize: size,
        maxEntrypointSize: size
    };
}

// The base Webpack configuration to bundle the JavaScript artifacts of
// jitsi-meet such as app.bundle.js and external_api.js.
const config = {
    devServer: {
        https: true,
        inline: true,
        proxy: {
            '/': {
                bypass: devServerProxyBypass,
                secure: false,
                target: devServerProxyTarget,
                headers: {
                    'Host': new URL(devServerProxyTarget).host
                }
            }
        }
    },
    devtool: 'source-map',
    mode: minimize ? 'production' : 'development',
    module: {
        rules: [ {
            // Transpile ES2015 (aka ES6) to ES5. Accept the JSX syntax by React
            // as well.

            exclude: [
                new RegExp(`${__dirname}/node_modules/(?!js-utils)`)
            ],
            loader: 'babel-loader',
            options: {
                // XXX The require.resolve bellow solves failures to locate the
                // presets when lib-jitsi-meet, for example, is npm linked in
                // jitsi-meet.
                plugins: [
                    require.resolve('@babel/plugin-transform-flow-strip-types'),
                    require.resolve('@babel/plugin-proposal-class-properties'),
                    require.resolve('@babel/plugin-proposal-export-default-from'),
                    require.resolve('@babel/plugin-proposal-export-namespace-from'),
                    require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
                    require.resolve('@babel/plugin-proposal-optional-chaining')
                ],
                presets: [
                    [
                        require.resolve('@babel/preset-env'),

                        // Tell babel to avoid compiling imports into CommonJS
                        // so that webpack may do tree shaking.
                        {
                            modules: false,

                            // Specify our target browsers so no transpiling is
                            // done unnecessarily. For browsers not specified
                            // here, the ES2015+ profile will be used.
                            targets: {
                                chrome: 58,
                                electron: 2,
                                firefox: 54,
                                safari: 11
                            }

                        }
                    ],
                    require.resolve('@babel/preset-flow'),
                    require.resolve('@babel/preset-react')
                ]
            },
            test: /\.jsx?$/
        }, {
            // Expose jquery as the globals $ and jQuery because it is expected
            // to be available in such a form by multiple jitsi-meet
            // dependencies including lib-jitsi-meet.

            loader: 'expose-loader?$!expose-loader?jQuery',
            test: /\/node_modules\/jquery\/.*\.js$/
        }, {
            test: /\.scss$/,
            use: [
                {
                    loader: isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader
                },
                {
                    loader: 'css-loader?url=false',
                    options: {
                        // sourceMap: isDevelopment,
                        modules: true
                    }
                }, {
                    loader: 'resolve-url-loader',
                    options: {
                        sourceMap: isDevelopment,
                        keepQuery: true
                    }
                }, {
                    loader: 'sass-loader?url=false',
                    options: {
                        sourceMap: isDevelopment
                    }
                }
            ]
        }, {
            test: /\/node_modules\/@atlaskit\/modal-dialog\/.*\.js$/,
            resolve: {
                alias: {
                    'react-focus-lock': `${__dirname}/react/features/base/util/react-focus-lock-wrapper.js`
                }
            }
        }, {
            test: /\/react\/features\/base\/util\/react-focus-lock-wrapper.js$/,
            resolve: {
                alias: {
                    'react-focus-lock': `${__dirname}/node_modules/react-focus-lock`
                }
            }
        }, {
            test: /\.svg$/,
            use: [ {
                loader: '@svgr/webpack',
                options: {
                    dimensions: false,
                    expandProps: 'start'
                }
            } ]
        }, {
            test: /\.(jpg|png)$/,
            use: [ {
                loader: 'url-loader',
                options: {
                    limit: 11000,
                    name: `images/${isDevelopment ? '[name].[ext]' : '[name].[hash:8].[ext]'}`
                }
            } ]
        }, {
            test: /\.(ttf|eot|woff|woff2)$/,
            use: [ {
                loader: 'url-loader',
                options: {
                    limit: 50000,
                    name: `fonts/${isDevelopment ? '[name].[ext]' : '[name].[hash:8].[ext]'}`
                }
            } ]
        } ]
    },
    node: {
        // Allow the use of the real filename of the module being executed. By
        // default Webpack does not leak path-related information and provides a
        // value that is a mock (/index.js).
        __filename: true
    },
    optimization: {
        concatenateModules: minimize,
        minimize
    },
    output: {
        filename: `[name]${minimize ? '.min' : ''}.js`,
        path: `${__dirname}/build`,
        publicPath: '/libs/',
        sourceMapFilename: `[name].${minimize ? 'min' : 'js'}.map`
    },
    plugins: [
        analyzeBundle
            && new BundleAnalyzerPlugin({
                analyzerMode: 'disabled',
                generateStatsFile: true
            }),
        detectCircularDeps
            && new CircularDependencyPlugin({
                allowAsyncCycles: false,
                exclude: /node_modules/,
                failOnError: false
            }),
        MiniCssExtractPlugin
            && new MiniCssExtractPlugin({
                filename: isDevelopment ? '[name].css' : '[name].[hash].css',
                chunkFilename: isDevelopment ? '[id].css' : '[id].[hash].css'
            }),
        new EnvironmentPlugin({
            'process.env': JSON.stringify(dotenv || process.env)
        })
    ].filter(Boolean),
    resolve: {
        alias: {
            jquery: `jquery/dist/jquery${minimize ? '.min' : ''}.js`,
            '!images': path.join(__dirname, 'images'),
            '!fonts': path.join(__dirname, 'fonts')
        },
        aliasFields: [
            'browser'
        ],
        extensions: [
            '.web.js',

            // Webpack defaults:
            '.js',
            '.json',
            '.scss'
        ]
    }
};

module.exports = [
    Object.assign({}, config, {
        entry: {
            'app.bundle': './app.js'
        },
        performance: getPerformanceHints(10 * 1024 * 1024)
    }),
    Object.assign({}, config, {
        entry: {
            'device_selection_popup_bundle': './react/features/settings/popup.js'
        },
        performance: getPerformanceHints(750 * 1024)
    }),
    Object.assign({}, config, {
        entry: {
            'alwaysontop': './react/features/always-on-top/index.js'
        },
        performance: getPerformanceHints(400 * 1024)
    }),
    Object.assign({}, config, {
        entry: {
            'dial_in_info_bundle': './react/features/invite/components/dial-in-info-page'
        },
        performance: getPerformanceHints(500 * 1024)
    }),
    Object.assign({}, config, {
        entry: {
            'do_external_connect': './connection_optimization/do_external_connect.js'
        },
        performance: getPerformanceHints(5 * 1024)
    }),
    Object.assign({}, config, {
        entry: {
            'flacEncodeWorker': './react/features/local-recording/recording/flac/flacEncodeWorker.js'
        },
        performance: getPerformanceHints(5 * 1024)
    }),
    Object.assign({}, config, {
        entry: {
            'analytics-ga': './react/features/analytics/handlers/GoogleAnalyticsHandler.js'
        },
        performance: getPerformanceHints(5 * 1024)
    }),

    // Because both video-blur-effect and rnnoise-processor modules are loaded
    // in a lazy manner using the loadScript function with a hard coded name,
    // i.e.loadScript('libs/rnnoise-processor.min.js'), webpack dev server
    // won't know how to properly load them using the default config filename
    // and sourceMapFilename parameters which target libs without .min in dev
    // mode. Thus we change these modules to have the same filename in both
    // prod and dev mode.
    Object.assign({}, config, {
        entry: {
            'video-blur-effect': './react/features/stream-effects/blur/index.js'
        },
        output: Object.assign({}, config.output, {
            library: [ 'JitsiMeetJS', 'app', 'effects' ],
            libraryTarget: 'window',
            filename: '[name].min.js',
            sourceMapFilename: '[name].min.map'
        }),
        performance: getPerformanceHints(1 * 1024 * 1024)
    }),

    Object.assign({}, config, {
        entry: {
            'rnnoise-processor': './react/features/stream-effects/rnnoise/index.js'
        },
        node: {
            // Emscripten generated glue code "rnnoise.js" expects node fs module,
            // we need to specify this parameter so webpack knows how to properly
            // interpret it when encountered.
            fs: 'empty'
        },
        output: Object.assign({}, config.output, {
            library: [ 'JitsiMeetJS', 'app', 'effects', 'rnnoise' ],
            libraryTarget: 'window',
            filename: '[name].min.js',
            sourceMapFilename: '[name].min.map'
        }),
        performance: getPerformanceHints(30 * 1024)
    }),

    Object.assign({}, config, {
        entry: {
            'external_api': './modules/API/external/index.js'
        },
        output: Object.assign({}, config.output, {
            library: 'JitsiMeetExternalAPI',
            libraryTarget: 'umd'
        }),
        performance: getPerformanceHints(30 * 1024)
    })
];

/**
 * Determines whether a specific (HTTP) request is to bypass the proxy of
 * webpack-dev-server (i.e. is to be handled by the proxy target) and, if not,
 * which local file is to be served in response to the request.
 *
 * @param {Object} request - The (HTTP) request received by the proxy.
 * @returns {string|undefined} If the request is to be served by the proxy
 * target, undefined; otherwise, the path to the local file to be served.
 */
// eslint-disable-next-line no-shadow,require-jsdoc
function devServerProxyBypass({ path }) {
    if (path.startsWith('/css/') || path.startsWith('/doc/')
        || path.startsWith('/fonts/')
        || path.startsWith('/images/')
        || path.startsWith('/lang/')
        || path.startsWith('/sounds/')
        || path.startsWith('/static/')
        || path.endsWith('.wasm')) {

        return path;
    }

    const configs = module.exports;

    /* eslint-disable array-callback-return, indent */

    if ((Array.isArray(configs) ? configs : Array(configs)).some(c => {
        if (path.startsWith(c.output.publicPath)) {
            if (!minimize) {
                // Since webpack-dev-server is serving non-minimized
                // artifacts, serve them even if the minimized ones are
                // requested.
                return Object.keys(c.entry).some(e => {
                    const name = `${e}.min.js`;

                    if (path.indexOf(name) !== -1) {
                        // eslint-disable-next-line no-param-reassign
                        path = path.replace(name, `${e}.js`);

                        return true;
                    }
                });
            }
        }
    })) {
        return path;
    }

    if (path.startsWith('/libs/')) {
        return path;
    }
}

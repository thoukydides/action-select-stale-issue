import _commonjs, { RollupCommonJSOptions } from '@rollup/plugin-commonjs';
import _typescript, { RollupTypescriptOptions } from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { Plugin, RollupLog, RollupOptions } from 'rollup';

// https://github.com/rollup/plugins/issues/1662
const commonjs = _commonjs as unknown as (options?: RollupCommonJSOptions) => Plugin;
const typescript = _typescript as unknown as (options?: RollupTypescriptOptions) => Plugin;

// https://github.com/rollup/rollup/issues/1089
const onwarn = (warning: RollupLog, defaultHandler: (warning: string | RollupLog) => void): void => {
    const ids = [...(warning.ids ?? []), ...(warning.id ? [warning.id] : [])];
    if (ids.some(p => p.includes('/node_modules/@actions/'))
        && ['CIRCULAR_DEPENDENCY', 'THIS_IS_UNDEFINED'].includes(warning.code ?? '')) {
        // Suppress undefined this and circular dependency warnings for @actions/*
    } else {
        defaultHandler(warning);
    }
};

const config: RollupOptions = {
    input: 'src/index.ts',
    output: {
        esModule: true,
        file: 'dist/index.js',
        format: 'es',
        sourcemap: true
    },
    plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()],
    onwarn
};

export default config;
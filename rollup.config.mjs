import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/jcall.js',
    output: [
      {
        file: 'dist/jcall.umd.js',
        format: 'umd',
        name: 'jcall',
        sourcemap: true,
      },
      {
        file: 'dist/jcall.umd.min.js',
        format: 'umd',
        name: 'jcall',
        plugins: [terser()],
        sourcemap: true,
      },
      {
        file: 'dist/jcall.esm.js',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/jcall.cjs.js',
        format: 'cjs',
        sourcemap: true,
      }
    ],
    plugins: [
      resolve(),
      commonjs()
    ]
  }
];
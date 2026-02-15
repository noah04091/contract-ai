/**
 * Custom Jest transform that replaces import.meta.env with process.env
 * before ts-jest processes the TypeScript code.
 */
const { TsJestTransformer } = require('ts-jest');

class ViteMetaTransformer extends TsJestTransformer {
  process(sourceText, sourcePath, transformOptions) {
    // Replace import.meta.env with process.env before ts-jest processes it
    const modified = sourceText.replace(/import\.meta\.env/g, 'process.env');
    return super.process(modified, sourcePath, transformOptions);
  }
}

module.exports = new ViteMetaTransformer({
  tsconfig: {
    jsx: 'react-jsx',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  },
  diagnostics: false,
});

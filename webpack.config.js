const path = require('path');

module.exports = {
  entry: {
    'main': './src/main.js',
  },
  output: {
    filename: 'lib/[name].js',
    libraryTarget: 'umd',
    library: 'upsesy',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.json.js/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/schedule.json[ext][query]'
        }
      }
    ]
  }
};
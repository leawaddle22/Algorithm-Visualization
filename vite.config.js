const { resolve } = require('node:path');

module.exports = {
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        insertion: resolve(__dirname, 'pages', 'insertion-sort.html'),
        bubble: resolve(__dirname, 'pages', 'bubble-sort.html'),
        selection: resolve(__dirname, 'pages', 'selection-sort.html')
      }
    }
  }
};

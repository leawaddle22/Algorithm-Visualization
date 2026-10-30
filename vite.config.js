const { resolve } = require('node:path');

module.exports = {
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        insertion: resolve(__dirname, 'insertion-sort.html'),
        bubble: resolve(__dirname, 'bubble-sort.html'),
        selection: resolve(__dirname, 'selection-sort.html')
      }
    }
  }
};

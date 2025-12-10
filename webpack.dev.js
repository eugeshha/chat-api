const webpack = require("webpack");
const { merge } = require("webpack-merge");
const common = require("./webpack.common");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    historyApiFallback: true,
    open: true,
    compress: true,
    port: 8080,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      "process.env.API_URL": JSON.stringify(process.env.API_URL || "http://localhost:3000"),
      "process.env.WS_URL": JSON.stringify(process.env.WS_URL || "ws://localhost:3000"),
    }),
  ],
});


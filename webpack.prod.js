const webpack = require("webpack");
const { merge } = require("webpack-merge");
const common = require("./webpack.common");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.API_URL": JSON.stringify(process.env.API_URL || "https://chat-api-backend-l3sm.onrender.com"),
      "process.env.WS_URL": JSON.stringify(process.env.WS_URL || "wss://chat-api-backend-l3sm.onrender.com"),
    }),
  ],
});


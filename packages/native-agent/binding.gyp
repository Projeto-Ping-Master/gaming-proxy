{
  "targets": [
    {
      "target_name": "gaming_proxy_agent",
      "sources": [
        "src/main.cpp",
        "src/traffic_capture.cpp"
      ],
      "include_dirs": [
        "../../node_modules/node-addon-api",
        "include",
        "lib/WinDivert/include"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        [
          "OS=='win'",
          {
            "libraries": [
              "../lib/WinDivert/x64/WinDivert.lib",
              "ws2_32.lib",
              "psapi.lib",
              "iphlpapi.lib"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1
              }
            }
          }
        ]
      ]
    }
  ]
}
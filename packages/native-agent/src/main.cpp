#include <napi.h>
#include "traffic_capture.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    TrafficCaptureWrapper::Init(env, exports);
    return exports;
}

NODE_API_MODULE(gaming_proxy_agent, Init)
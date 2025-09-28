#pragma once

#include <napi.h>
#include <windows.h>
#include <string>
#include <vector>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>

struct GameProcess {
    DWORD processId;
    std::string processName;
    std::vector<std::string> keywords;
    std::vector<UINT16> defaultPorts;
};

struct PacketInfo {
    std::string sourceIp;
    UINT16 sourcePort;
    std::string destIp;
    UINT16 destPort;
    std::string protocol;
    std::vector<UINT8> data;
    UINT64 timestamp;
};

struct TunnelConfig {
    std::string nodeIp;
    UINT16 nodePort;
    std::string sessionId;
    bool enabled;
};

class TrafficCapture {
public:
    TrafficCapture();
    ~TrafficCapture();

    // Core functionality
    bool Initialize();
    bool StartCapture(const std::string& gameId, const TunnelConfig& config);
    bool StopCapture();
    bool IsCapturing() const { return m_isCapturing; }

    // Process monitoring
    bool IsGameRunning(const std::string& gameId);
    std::vector<DWORD> FindGameProcesses(const std::string& gameId);

    // Metrics
    struct NetworkMetrics {
        double avgPing;
        double jitter;
        double packetLoss;
        UINT64 totalPackets;
        UINT64 droppedPackets;
    };
    NetworkMetrics GetMetrics() const;

    // Configuration
    void SetGameDatabase(const std::vector<GameProcess>& games);
    void SetLocalProxyPort(UINT16 port) { m_localProxyPort = port; }

private:
    // Internal methods
    void CaptureThreadFunction();
    bool ProcessPacket(const UINT8* packet, UINT packetLen);
    bool ShouldRedirectPacket(const PacketInfo& info);
    bool RedirectToProxy(const PacketInfo& info);

    // WinDivert handle
    HANDLE m_winDivertHandle;

    // Threading
    std::unique_ptr<std::thread> m_captureThread;
    std::atomic<bool> m_isCapturing;
    std::atomic<bool> m_shouldStop;

    // Configuration
    std::vector<GameProcess> m_gameDatabase;
    TunnelConfig m_tunnelConfig;
    UINT16 m_localProxyPort;

    // Metrics
    mutable std::mutex m_metricsMutex;
    NetworkMetrics m_metrics;

    // Current game
    std::string m_currentGameId;
    std::vector<DWORD> m_currentProcessIds;
};

// Node.js bindings
class TrafficCaptureWrapper : public Napi::ObjectWrap<TrafficCaptureWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    TrafficCaptureWrapper(const Napi::CallbackInfo& info);

private:
    static Napi::FunctionReference constructor;

    // Methods
    Napi::Value Initialize(const Napi::CallbackInfo& info);
    Napi::Value StartCapture(const Napi::CallbackInfo& info);
    Napi::Value StopCapture(const Napi::CallbackInfo& info);
    Napi::Value IsCapturing(const Napi::CallbackInfo& info);
    Napi::Value IsGameRunning(const Napi::CallbackInfo& info);
    Napi::Value GetMetrics(const Napi::CallbackInfo& info);
    Napi::Value SetGameDatabase(const Napi::CallbackInfo& info);

    std::unique_ptr<TrafficCapture> m_capture;
};
#include "traffic_capture.h"
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windivert.h>
#include <psapi.h>
#include <tlhelp32.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iostream>
#include <sstream>
#include <algorithm>

#pragma comment(lib, "ws2_32.lib")

// TrafficCapture Implementation
TrafficCapture::TrafficCapture()
    : m_winDivertHandle(INVALID_HANDLE_VALUE)
    , m_isCapturing(false)
    , m_shouldStop(false)
    , m_localProxyPort(8888)
    , m_metrics{}
{
    WSAData wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);
}

TrafficCapture::~TrafficCapture() {
    StopCapture();
    WSACleanup();
}

bool TrafficCapture::Initialize() {
    try {
        // Test WinDivert availability
        HANDLE testHandle = WinDivertOpen("false", WINDIVERT_LAYER_NETWORK, 0, WINDIVERT_FLAG_SNIFF);
        if (testHandle == INVALID_HANDLE_VALUE) {
            std::cerr << "WinDivert initialization failed: " << GetLastError() << std::endl;
            return false;
        }
        WinDivertClose(testHandle);
        return true;
    } catch (const std::exception& e) {
        std::cerr << "TrafficCapture initialization error: " << e.what() << std::endl;
        return false;
    }
}

bool TrafficCapture::StartCapture(const std::string& gameId, const TunnelConfig& config) {
    if (m_isCapturing) {
        return false;
    }

    m_currentGameId = gameId;
    m_tunnelConfig = config;

    // Find game processes
    m_currentProcessIds = FindGameProcesses(gameId);
    if (m_currentProcessIds.empty()) {
        std::cerr << "No game processes found for: " << gameId << std::endl;
        return false;
    }

    // Create WinDivert filter for game processes
    std::ostringstream filterStream;
    filterStream << "outbound and (";

    for (size_t i = 0; i < m_currentProcessIds.size(); ++i) {
        if (i > 0) filterStream << " or ";
        filterStream << "processId == " << m_currentProcessIds[i];
    }
    filterStream << ")";

    std::string filter = filterStream.str();

    // Open WinDivert handle
    m_winDivertHandle = WinDivertOpen(filter.c_str(), WINDIVERT_LAYER_NETWORK, 0, 0);
    if (m_winDivertHandle == INVALID_HANDLE_VALUE) {
        std::cerr << "Failed to open WinDivert handle: " << GetLastError() << std::endl;
        return false;
    }

    // Start capture thread
    m_shouldStop = false;
    m_isCapturing = true;
    m_captureThread = std::make_unique<std::thread>(&TrafficCapture::CaptureThreadFunction, this);

    std::cout << "Traffic capture started for game: " << gameId << std::endl;
    return true;
}

bool TrafficCapture::StopCapture() {
    if (!m_isCapturing) {
        return true;
    }

    m_shouldStop = true;

    if (m_winDivertHandle != INVALID_HANDLE_VALUE) {
        WinDivertClose(m_winDivertHandle);
        m_winDivertHandle = INVALID_HANDLE_VALUE;
    }

    if (m_captureThread && m_captureThread->joinable()) {
        m_captureThread->join();
    }

    m_isCapturing = false;
    m_captureThread.reset();

    std::cout << "Traffic capture stopped" << std::endl;
    return true;
}

void TrafficCapture::CaptureThreadFunction() {
    UINT8 packet[2048];
    UINT packetLen;
    WINDIVERT_ADDRESS addr;

    while (!m_shouldStop) {
        if (!WinDivertRecv(m_winDivertHandle, packet, sizeof(packet), &packetLen, &addr)) {
            DWORD error = GetLastError();
            if (error == ERROR_NO_DATA || m_shouldStop) {
                break;
            }
            std::cerr << "WinDivertRecv failed: " << error << std::endl;
            continue;
        }

        // Process the packet
        if (ProcessPacket(packet, packetLen)) {
            // Packet was redirected, don't re-inject
            continue;
        }

        // Re-inject original packet
        if (!WinDivertSend(m_winDivertHandle, packet, packetLen, nullptr, &addr)) {
            std::cerr << "WinDivertSend failed: " << GetLastError() << std::endl;
        }
    }
}

bool TrafficCapture::ProcessPacket(const UINT8* packet, UINT packetLen) {
    try {
        WINDIVERT_IPHDR* ipHeader;
        WINDIVERT_TCPHDR* tcpHeader;
        WINDIVERT_UDPHDR* udpHeader;
        UINT payloadLen;
        PVOID payload;

        // Parse packet
        if (!WinDivertHelperParsePacket(
            const_cast<UINT8*>(packet), packetLen,
            &ipHeader, nullptr, nullptr, nullptr, nullptr,
            &tcpHeader, &udpHeader, &payload, &payloadLen, nullptr, nullptr)) {
            return false;
        }

        PacketInfo info;
        info.timestamp = GetTickCount64();

        // Extract IP addresses
        char srcIpStr[INET_ADDRSTRLEN];
        char dstIpStr[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &ipHeader->SrcAddr, srcIpStr, INET_ADDRSTRLEN);
        inet_ntop(AF_INET, &ipHeader->DstAddr, dstIpStr, INET_ADDRSTRLEN);

        info.sourceIp = srcIpStr;
        info.destIp = dstIpStr;

        // Extract ports and protocol
        if (tcpHeader) {
            info.sourcePort = ntohs(tcpHeader->SrcPort);
            info.destPort = ntohs(tcpHeader->DstPort);
            info.protocol = "tcp";
        } else if (udpHeader) {
            info.sourcePort = ntohs(udpHeader->SrcPort);
            info.destPort = ntohs(udpHeader->DstPort);
            info.protocol = "udp";
        } else {
            return false; // Not TCP or UDP
        }

        // Copy payload
        if (payload && payloadLen > 0) {
            info.data.resize(payloadLen);
            memcpy(info.data.data(), payload, payloadLen);
        }

        // Check if packet should be redirected
        if (ShouldRedirectPacket(info)) {
            return RedirectToProxy(info);
        }

        return false; // Don't redirect, re-inject original
    } catch (const std::exception& e) {
        std::cerr << "Packet processing error: " << e.what() << std::endl;
        return false;
    }
}

bool TrafficCapture::ShouldRedirectPacket(const PacketInfo& info) {
    // Find the game configuration
    for (const auto& game : m_gameDatabase) {
        if (game.processName == m_currentGameId) {
            // Check if destination port matches game's default ports
            for (UINT16 port : game.defaultPorts) {
                if (info.destPort == port) {
                    return true;
                }
            }
            break;
        }
    }

    // For now, redirect common gaming ports
    std::vector<UINT16> commonGamePorts = {
        27015, 27016, 27017, // Source Engine games
        7000, 7001, 7002,    // Valorant
        5000, 5001, 5002,    // League of Legends
        3074,                // Xbox Live
        80, 443              // HTTP/HTTPS
    };

    for (UINT16 port : commonGamePorts) {
        if (info.destPort == port) {
            return true;
        }
    }

    return false;
}

bool TrafficCapture::RedirectToProxy(const PacketInfo& info) {
    try {
        // For PoC, just log the redirection
        std::cout << "Redirecting packet: " << info.sourceIp << ":" << info.sourcePort
                  << " -> " << info.destIp << ":" << info.destPort
                  << " (" << info.protocol << ")" << std::endl;

        // Update metrics
        {
            std::lock_guard<std::mutex> lock(m_metricsMutex);
            m_metrics.totalPackets++;
        }

        // In a real implementation, we would:
        // 1. Create a new packet with destination = local proxy (127.0.0.1:m_localProxyPort)
        // 2. Send original destination info to proxy via IPC
        // 3. Proxy would encapsulate and forward to tunnel

        return true; // Packet was "redirected"
    } catch (const std::exception& e) {
        std::cerr << "Packet redirection error: " << e.what() << std::endl;
        return false;
    }
}

bool TrafficCapture::IsGameRunning(const std::string& gameId) {
    return !FindGameProcesses(gameId).empty();
}

std::vector<DWORD> TrafficCapture::FindGameProcesses(const std::string& gameId) {
    std::vector<DWORD> processIds;

    // Find game configuration
    const GameProcess* gameConfig = nullptr;
    for (const auto& game : m_gameDatabase) {
        if (game.processName == gameId) {
            gameConfig = &game;
            break;
        }
    }

    if (!gameConfig) {
        return processIds;
    }

    // Enumerate processes
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) {
        return processIds;
    }

    PROCESSENTRY32 pe32;
    pe32.dwSize = sizeof(PROCESSENTRY32);

    if (Process32First(snapshot, &pe32)) {
        do {
            std::string processName = pe32.szExeFile;

            // Convert to lowercase for comparison
            std::transform(processName.begin(), processName.end(), processName.begin(), ::tolower);

            // Check if process name matches any of the game's keywords
            for (const std::string& keyword : gameConfig->keywords) {
                std::string lowerKeyword = keyword;
                std::transform(lowerKeyword.begin(), lowerKeyword.end(), lowerKeyword.begin(), ::tolower);

                if (processName.find(lowerKeyword) != std::string::npos) {
                    processIds.push_back(pe32.th32ProcessID);
                    break;
                }
            }
        } while (Process32Next(snapshot, &pe32));
    }

    CloseHandle(snapshot);
    return processIds;
}

TrafficCapture::NetworkMetrics TrafficCapture::GetMetrics() const {
    std::lock_guard<std::mutex> lock(m_metricsMutex);
    return m_metrics;
}

void TrafficCapture::SetGameDatabase(const std::vector<GameProcess>& games) {
    m_gameDatabase = games;
}

// Node.js Wrapper Implementation
Napi::FunctionReference TrafficCaptureWrapper::constructor;

Napi::Object TrafficCaptureWrapper::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "TrafficCapture", {
        InstanceMethod("initialize", &TrafficCaptureWrapper::Initialize),
        InstanceMethod("startCapture", &TrafficCaptureWrapper::StartCapture),
        InstanceMethod("stopCapture", &TrafficCaptureWrapper::StopCapture),
        InstanceMethod("isCapturing", &TrafficCaptureWrapper::IsCapturing),
        InstanceMethod("isGameRunning", &TrafficCaptureWrapper::IsGameRunning),
        InstanceMethod("getMetrics", &TrafficCaptureWrapper::GetMetrics),
        InstanceMethod("setGameDatabase", &TrafficCaptureWrapper::SetGameDatabase),
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("TrafficCapture", func);
    return exports;
}

TrafficCaptureWrapper::TrafficCaptureWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<TrafficCaptureWrapper>(info) {
    m_capture = std::make_unique<TrafficCapture>();
}

Napi::Value TrafficCaptureWrapper::Initialize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    bool result = m_capture->Initialize();
    return Napi::Boolean::New(env, result);
}

Napi::Value TrafficCaptureWrapper::StartCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected gameId and tunnelConfig").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string gameId = info[0].As<Napi::String>().Utf8Value();
    Napi::Object configObj = info[1].As<Napi::Object>();

    TunnelConfig config;
    config.nodeIp = configObj.Get("nodeIp").As<Napi::String>().Utf8Value();
    config.nodePort = configObj.Get("nodePort").As<Napi::Number>().Uint32Value();
    config.sessionId = configObj.Get("sessionId").As<Napi::String>().Utf8Value();
    config.enabled = configObj.Get("enabled").As<Napi::Boolean>().Value();

    bool result = m_capture->StartCapture(gameId, config);
    return Napi::Boolean::New(env, result);
}

Napi::Value TrafficCaptureWrapper::StopCapture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    bool result = m_capture->StopCapture();
    return Napi::Boolean::New(env, result);
}

Napi::Value TrafficCaptureWrapper::IsCapturing(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    bool result = m_capture->IsCapturing();
    return Napi::Boolean::New(env, result);
}

Napi::Value TrafficCaptureWrapper::IsGameRunning(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected gameId").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string gameId = info[0].As<Napi::String>().Utf8Value();
    bool result = m_capture->IsGameRunning(gameId);
    return Napi::Boolean::New(env, result);
}

Napi::Value TrafficCaptureWrapper::GetMetrics(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto metrics = m_capture->GetMetrics();

    Napi::Object result = Napi::Object::New(env);
    result.Set("avgPing", Napi::Number::New(env, metrics.avgPing));
    result.Set("jitter", Napi::Number::New(env, metrics.jitter));
    result.Set("packetLoss", Napi::Number::New(env, metrics.packetLoss));
    result.Set("totalPackets", Napi::Number::New(env, static_cast<double>(metrics.totalPackets)));
    result.Set("droppedPackets", Napi::Number::New(env, static_cast<double>(metrics.droppedPackets)));

    return result;
}

Napi::Value TrafficCaptureWrapper::SetGameDatabase(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected games array").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array gamesArray = info[0].As<Napi::Array>();
    std::vector<GameProcess> games;

    for (uint32_t i = 0; i < gamesArray.Length(); i++) {
        Napi::Object gameObj = gamesArray.Get(i).As<Napi::Object>();

        GameProcess game;
        game.processName = gameObj.Get("gameId").As<Napi::String>().Utf8Value();

        Napi::Array keywordsArray = gameObj.Get("processKeywords").As<Napi::Array>();
        for (uint32_t j = 0; j < keywordsArray.Length(); j++) {
            game.keywords.push_back(keywordsArray.Get(j).As<Napi::String>().Utf8Value());
        }

        Napi::Array portsArray = gameObj.Get("defaultPorts").As<Napi::Array>();
        for (uint32_t j = 0; j < portsArray.Length(); j++) {
            game.defaultPorts.push_back(portsArray.Get(j).As<Napi::Number>().Uint32Value());
        }

        games.push_back(game);
    }

    m_capture->SetGameDatabase(games);
    return env.Undefined();
}
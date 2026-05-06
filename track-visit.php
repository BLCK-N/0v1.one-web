<?php

declare(strict_types=1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['test']) && $_GET['test'] === '1') {
        $configPath = __DIR__ . '/track-config.php';
        if (!file_exists($configPath)) {
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'error' => 'Missing track-config.php'
            ]);
            exit;
        }

        $config = require $configPath;
        $webhookUrl = isset($config['webhook_url']) ? trim((string) $config['webhook_url']) : '';
        if ($webhookUrl === '') {
            http_response_code(500);
            echo json_encode([
                'ok' => false,
                'error' => 'Missing webhook_url'
            ]);
            exit;
        }
    }

    echo json_encode([
        'ok' => true,
        'message' => 'track-visit.php is online'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'error' => 'Method not allowed'
    ]);
    exit;
}

$configPath = __DIR__ . '/track-config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Missing track-config.php'
    ]);
    exit;
}

$config = require $configPath;
$webhookUrl = isset($config['webhook_url']) ? trim((string) $config['webhook_url']) : '';

if ($webhookUrl === '') {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Missing webhook_url'
    ]);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function getClientIp(): string
{
    $candidates = [
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
        $_SERVER['HTTP_CLIENT_IP'] ?? '',
        $_SERVER['REMOTE_ADDR'] ?? ''
    ];

    foreach ($candidates as $value) {
        if ($value === '') {
            continue;
        }

        $ip = trim(explode(',', $value)[0]);
        if ($ip !== '') {
            return $ip;
        }
    }

    return 'Unknown';
}

function getLocationInfo(string $ip): array
{
    $fallback = [
        'ip' => $ip !== '' ? $ip : 'Unknown',
        'region' => 'Unknown',
        'country' => 'Unknown',
        'timezone' => 'Unknown',
        'cellular' => 'Unknown',
        'proxy' => 'Unknown'
    ];

    if ($ip === '' || $ip === 'Unknown') {
        return $fallback;
    }

    $response = httpRequest('GET', 'https://ipwho.is/' . rawurlencode($ip), null);
    if (!$response['ok']) {
        return $fallback;
    }

    $data = json_decode($response['body'], true);
    if (!is_array($data) || (isset($data['success']) && $data['success'] === false)) {
        return $fallback;
    }

    $isp = '';
    if (isset($data['connection']) && is_array($data['connection']) && isset($data['connection']['isp'])) {
        $isp = (string) $data['connection']['isp'];
    }

    $timezone = 'Unknown';
    if (isset($data['timezone']) && is_array($data['timezone']) && isset($data['timezone']['id'])) {
        $timezone = (string) $data['timezone']['id'];
    }

    return [
        'ip' => isset($data['ip']) ? (string) $data['ip'] : $fallback['ip'],
        'region' => isset($data['region']) ? (string) $data['region'] : 'Unknown',
        'country' => isset($data['country']) ? (string) $data['country'] : 'Unknown',
        'timezone' => $timezone,
        'cellular' => preg_match('/mobile|cellular/i', $isp) ? 'Yes' : 'No',
        'proxy' => 'Unknown'
    ];
}

function httpRequest(string $method, string $url, ?string $jsonBody): array
{
    $headers = [
        'Content-Type: application/json'
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        if ($jsonBody !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
        }

        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        return [
            'ok' => $body !== false && $status >= 200 && $status < 400,
            'status' => $status,
            'body' => $body !== false ? $body : '',
            'error' => $error !== '' ? $error : null
        ];
    }

    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers) . "\r\n",
            'content' => $jsonBody !== null ? $jsonBody : '',
            'ignore_errors' => true,
            'timeout' => 12
        ]
    ]);

    $body = @file_get_contents($url, false, $context);
    $status = 0;

    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
        $status = (int) $matches[1];
    }

    return [
        'ok' => $body !== false && $status >= 200 && $status < 400,
        'status' => $status,
        'body' => $body !== false ? $body : '',
        'error' => $body === false ? 'stream request failed' : null
    ];
}

function buildDiscordPayload(array $info, string $path, string $referrer, string $ua): array
{
    return [
        'username' => 'Visitor Tracker',
        'embeds' => [
            [
                'title' => 'IP Info',
                'color' => 3447003,
                'description' => implode("\n", [
                    '```ansi',
                    "\u{001b}[1;37mIP Info\u{001b}[0m",
                    '',
                    "\u{001b}[1;33mIP:\u{001b}[0m " . $info['ip'],
                    "\u{001b}[1;33mRegion:\u{001b}[0m " . $info['region'],
                    "\u{001b}[1;33mCountry:\u{001b}[0m " . $info['country'],
                    "\u{001b}[1;33mTimezone:\u{001b}[0m " . $info['timezone'],
                    '',
                    "\u{001b}[1;33mCellular Network:\u{001b}[0m " . $info['cellular'],
                    "\u{001b}[1;33mProxy/VPN:\u{001b}[0m " . $info['proxy'],
                    '```'
                ]),
                'fields' => [
                    [
                        'name' => 'Page',
                        'value' => '**Path:** ' . ($path !== '' ? $path : '/'),
                        'inline' => false
                    ],
                    [
                        'name' => 'Source',
                        'value' => '**Referrer:** ' . ($referrer !== '' ? $referrer : '-'),
                        'inline' => false
                    ],
                    [
                        'name' => 'User Agent',
                        'value' => $ua !== '' ? $ua : '-',
                        'inline' => false
                    ]
                ]
            ]
        ]
    ];
}

$body = readJsonBody();
$path = isset($body['path']) ? (string) $body['path'] : '/';
$referrer = isset($body['referrer']) ? (string) $body['referrer'] : '-';
$ua = isset($body['ua']) ? (string) $body['ua'] : ($_SERVER['HTTP_USER_AGENT'] ?? '-');
$ip = getClientIp();
$info = getLocationInfo($ip);
$payload = buildDiscordPayload($info, $path, $referrer, $ua);
$result = httpRequest(
    'POST',
    $webhookUrl,
    json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
);

if (!$result['ok']) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Webhook request failed',
        'status' => $result['status'],
        'details' => $result['error']
    ]);
    exit;
}

echo json_encode([
    'ok' => true
]);

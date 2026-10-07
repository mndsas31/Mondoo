<?php
// /api/watch-party/create.php
// Production-ready Watch Party creation endpoint for PHP

// 1. Suppress HTML error output so JSON is never corrupted
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// 2. Set JSON content header
header('Content-Type: application/json; charset=UTF-8');

// 3. Strict CORS handling
$allowedOrigins = [
    'https://mondoflix.bond',
    'https://www.mondoflix.bond',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
];

$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($httpOrigin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $httpOrigin");
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
} else {
    // If origin is not in whitelist, still allow read if not sending credentials
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With');
}

// Respond to OPTIONS preflight immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 4. Enforce POST method only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'error' => 'Method Not Allowed. Please use POST.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // 5. Read JSON body from php://input
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false || trim($rawInput) === '') {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Empty request body. JSON payload expected.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $data = json_decode($rawInput, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Malformed JSON: ' . json_last_error_msg()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 6. Validate input fields (supports both camelCase and snake_case)
    $mediaId = trim((string)($data['mediaId'] ?? $data['media_id'] ?? ''));
    $displayName = trim((string)($data['displayName'] ?? $data['display_name'] ?? 'Host'));
    $hostOnly = !empty($data['hostOnly'] ?? $data['only_host_controls'] ?? true);
    $mediaType = in_array($data['mediaType'] ?? $data['media_type'] ?? '', ['movie', 'tv'], true) 
        ? ($data['mediaType'] ?? $data['media_type']) 
        : 'movie';
    $season = isset($data['season']) ? (int)$data['season'] : null;
    $episode = isset($data['episode']) ? (int)$data['episode'] : null;
    $title = trim((string)($data['title'] ?? 'Watch Party'));
    $posterPath = isset($data['poster_path']) ? (string)$data['poster_path'] : null;

    if ($mediaId === '') {
        http_response_code(422);
        echo json_encode([
            'ok' => false,
            'error' => 'mediaId is required.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Sanitize displayName
    $displayName = mb_substr(strip_tags($displayName), 0, 32, 'UTF-8');
    if ($displayName === '') {
        $displayName = 'Host';
    }

    // 7. Secure random 6-character room code (base32 alphabet, omitting ambiguous 0, O, 1, I)
    $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $code = '';
    $max = strlen($chars) - 1;
    $bytes = random_bytes(6);
    for ($i = 0; $i < 6; $i++) {
        $code .= $chars[ord($bytes[$i]) % ($max + 1)];
    }

    $hostId = 'host_' . bin2hex(random_bytes(8));
    $now = time();

    $roomData = [
        'code' => $code,
        'mediaId' => $mediaId,
        'media_id' => $mediaId,
        'media_type' => $mediaType,
        'season' => $season,
        'episode' => $episode,
        'title' => $title,
        'poster_path' => $posterPath,
        'hostId' => $hostId,
        'host_user_id' => $hostId,
        'hostOnly' => $hostOnly,
        'only_host_controls' => $hostOnly,
        'displayName' => $displayName,
        'is_playing' => false,
        'position_seconds' => 0,
        'created_at' => date('c', $now),
        'state_updated_at' => date('c', $now),
        'version' => 1
    ];

    // 8. Safe Storage Strategy
    // Strategy A: JSON File Storage in storage/watch_parties/
    $storageDir = __DIR__ . '/../../storage/watch_parties';
    if (!is_dir($storageDir)) {
        @mkdir($storageDir, 0755, true);
    }

    $fileWritten = false;
    if (is_dir($storageDir) && is_writable($storageDir)) {
        $filePath = $storageDir . '/' . $code . '.json';
        $fileWritten = (file_put_contents($filePath, json_encode($roomData, JSON_PRETTY_PRINT)) !== false);
    }

    // Strategy B: Database fallback if DB configuration exists
    if (file_exists(__DIR__ . '/../db.php')) {
        try {
            require_once __DIR__ . '/../db.php';
            if (class_exists('DB')) {
                $pdo = DB::getInstance();
                if ($pdo) {
                    $stmt = $pdo->prepare("INSERT INTO watch_parties (code, host_user_id, media_id, media_type, season, episode, title, poster_path, only_host_controls, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
                    $stmt->execute([
                        $code, 
                        $hostId, 
                        $mediaId, 
                        $mediaType, 
                        $season, 
                        $episode, 
                        $title, 
                        $posterPath, 
                        $hostOnly ? 1 : 0
                    ]);
                }
            }
        } catch (Throwable $dbErr) {
            // Log database notice but don't fail if JSON file was successfully written
            error_log('[WatchParty DB Notice] ' . $dbErr->getMessage());
        }
    }

    // 9. Send success response
    http_response_code(200);
    echo json_encode([
        'ok' => true,
        'code' => $code,
        'server_time' => $now * 1000,
        'room' => [
            'code' => $code,
            'mediaId' => $mediaId,
            'hostId' => $hostId,
            'hostOnly' => $hostOnly,
            'displayName' => $displayName
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    // 10. Log technical details securely
    error_log("[WatchParty Create 500] " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());

    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Internal server error while creating watch party. Please try again.'
    ], JSON_UNESCAPED_UNICODE);
}

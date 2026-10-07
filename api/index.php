<?php
require_once __DIR__ . '/helpers.php';

cors();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize path: strip /api and /mondoflix/api
$endpoint = $uri;
$endpoint = preg_replace('#^/mondoflix/api#', '', $endpoint);
$endpoint = preg_replace('#^/api#', '', $endpoint);

// Ensure it starts with a slash
if (empty($endpoint) || $endpoint[0] !== '/') {
    $endpoint = '/' . $endpoint;
}
// Remove trailing slash if present (except for root '/')
if (strlen($endpoint) > 1 && substr($endpoint, -1) === '/') {
    $endpoint = substr($endpoint, 0, -1);
}

$method = $_SERVER['REQUEST_METHOD'];

// Includes
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/WatchlistController.php';
require_once __DIR__ . '/controllers/NotificationsController.php';
require_once __DIR__ . '/controllers/ProgressController.php';
require_once __DIR__ . '/controllers/SearchHistoryController.php';
require_once __DIR__ . '/controllers/SettingsController.php';
require_once __DIR__ . '/controllers/PartyController.php';
require_once __DIR__ . '/controllers/SourcesController.php';

if ($endpoint === '/health' && $method === 'GET') {
    json_response(['ok' => true]);
}

// Routes matching
if (strpos($endpoint, '/auth') === 0) {
    AuthController::handle($method, $endpoint);
} elseif (strpos($endpoint, '/watchlist') === 0) {
    WatchlistController::handle($method, $endpoint);
} elseif (strpos($endpoint, '/notifications') === 0) {
    NotificationsController::handle($method, $endpoint);
} elseif (strpos($endpoint, '/progress') === 0) {
    ProgressController::handle($method, $endpoint);
} elseif (strpos($endpoint, '/settings') === 0) {
    SettingsController::handle($method, $endpoint);
} elseif (strpos($endpoint, '/search-history') === 0 || strpos($endpoint, '/search/recent') === 0) {
    SearchHistoryController::handle($method, $endpoint);
} elseif (strpos($endpoint, '/party') === 0) {
    PartyController::handle($method, $endpoint);
} elseif (strpos($endpoint, '/watch-party') === 0) {
    require_once __DIR__ . '/watch-party/create.php';
    exit;
} elseif (strpos($endpoint, '/sources') === 0) {
    SourcesController::handle($method, $endpoint);
} else {
    $logFile = __DIR__ . '/request_errors.log';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
    $uri = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
    $body = file_get_contents('php://input');
    
    $logMsg = "[" . date('Y-m-d H:i:s') . "] 404 Not Found\n";
    $logMsg .= "Path: $method $uri\n";
    $logMsg .= "Endpoint Tested: $endpoint\n";
    $logMsg .= "Body/Params: $body\n";
    $logMsg .= str_repeat("-", 40) . "\n";
    
    error_log($logMsg, 3, $logFile);

    json_response(['error' => 'Not Found', 'endpoint_tested' => $endpoint], 404);
}

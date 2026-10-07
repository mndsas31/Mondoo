<?php
require_once __DIR__ . '/config.php';

function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function get_json_body() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function cors() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    } elseif (!empty($origin)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        header("Access-Control-Allow-Origin: *");
    }
    
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

// Global exception handler
set_exception_handler(function($e) {
    $logFile = __DIR__ . '/request_errors.log';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
    $uri = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
    $body = file_get_contents('php://input');
    
    $logMsg = "[" . date('Y-m-d H:i:s') . "] Exception: " . $e->getMessage() . "\n";
    $logMsg .= "Path: $method $uri\n";
    $logMsg .= "Body/Params: $body\n";
    $logMsg .= "Trace: " . $e->getTraceAsString() . "\n";
    $logMsg .= str_repeat("-", 40) . "\n";
    
    error_log($logMsg, 3, $logFile);

    if (APP_ENV === 'development') {
        json_response([
            'error' => 'Internal Server Error',
            'detail' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    } else {
        json_response(['error' => 'Internal Server Error'], 500);
    }
});

// Global error handler to prevent PHP HTML warnings breaking JSON
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) {
        return false;
    }
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

class DB {
    private static $instance = null;

    public static function getInstance() {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . (defined('DB_PORT') ? DB_PORT : '3306') . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
                $GLOBALS['pdo'] = self::$instance;
            } catch (PDOException $e) {
                if (APP_ENV === 'development') {
                    json_response([
                        'error' => 'Database connection failed',
                        'detail' => $e->getMessage()
                    ], 500);
                } else {
                    json_response(['error' => 'Database connection failed.'], 500);
                }
            }
        }
        return self::$instance;
    }
}

// Global convenience accessor
function get_pdo() {
    return DB::getInstance();
}


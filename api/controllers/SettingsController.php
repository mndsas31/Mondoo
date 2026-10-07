<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class SettingsController {
    public static function handle($method, $endpoint) {
        $user = require_auth();

        // Make sure user_settings table exists
        $pdo = get_db();
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `user_settings` (
                `user_id` INT NOT NULL,
                `key_name` VARCHAR(100) NOT NULL,
                `value` TEXT NOT NULL,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`user_id`, `key_name`),
                FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT key_name, value FROM user_settings WHERE user_id = ?");
            $stmt->execute([$user['id']]);
            $settings = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $settings[$row['key_name']] = $row['value'];
            }
            json_response(['settings' => $settings]);
        } elseif ($method === 'POST' || $method === 'PUT') {
            $data = get_json_body();
            if (!isset($data['settings']) || !is_array($data['settings'])) {
                json_response(['error' => 'Missing settings array'], 400);
            }

            $stmt = $pdo->prepare("
                INSERT INTO user_settings (user_id, key_name, value) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE value = VALUES(value)
            ");

            foreach ($data['settings'] as $key => $value) {
                // simple sanitize
                $key = preg_replace('/[^a-zA-Z0-9_]/', '', $key);
                $stmt->execute([$user['id'], $key, (string)$value]);
            }
            json_response(['success' => true]);
        } else {
            json_response(['error' => 'Method not allowed'], 405);
        }
    }
}

<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../jwt.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth_middleware.php';

class AuthController {
    public static function handle($method, $endpoint) {
        if ($method === 'POST' && $endpoint === '/auth/register') {
            self::register();
        } elseif ($method === 'POST' && $endpoint === '/auth/login') {
            self::login();
        } elseif ($method === 'GET' && $endpoint === '/auth/me') {
            self::me();
        } else {
            json_response(['error' => 'Method Not Allowed'], 405);
        }
    }

    private static function register() {
        $body = get_json_body();
        if (empty($body['username']) || empty($body['email']) || empty($body['password'])) {
            json_response(['error' => 'Missing fields'], 400);
        }

        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$body['email']]);
        if ($stmt->fetch()) {
            json_response(['error' => 'Email already exists'], 400);
        }

        $hash = password_hash($body['password'], PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->execute([$body['username'], $body['email'], $hash]);
        $userId = $db->lastInsertId();

        $user = ['id' => $userId, 'username' => $body['username'], 'email' => $body['email']];
        $token = JWT::encode(['user_id' => $userId]);

        json_response(['token' => $token, 'user' => $user], 201);
    }

    private static function login() {
        $body = get_json_body();
        if (empty($body['email']) || empty($body['password'])) {
            json_response(['error' => 'Missing fields'], 400);
        }

        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
        $stmt->execute([$body['email']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($body['password'], $user['password'])) {
            json_response(['error' => 'Invalid credentials'], 401);
        }

        unset($user['password']);
        $token = JWT::encode(['user_id' => $user['id']]);

        json_response(['token' => $token, 'user' => $user]);
    }

    private static function me() {
        $userId = require_auth();
        $db = DB::getInstance();
        $stmt = $db->prepare("SELECT id, username, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) json_response(['error' => 'User not found'], 404);
        json_response(['user' => $user]);
    }
}

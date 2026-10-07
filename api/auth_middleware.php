<?php
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

function get_bearer_token() {
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
        return $matches[1];
    }
    return null;
}

function require_auth() {
    $token = get_bearer_token();
    
    if (!$token) {
        json_response(['error' => 'Unauthorized'], 401);
    }
    
    $payload = JWT::decode($token);
    
    if (!$payload || !isset($payload['user_id'])) {
        json_response(['error' => 'Invalid or expired token'], 401);
    }
    
    return [
        'user_id' => $payload['user_id'],
        'username' => $payload['username'] ?? 'User'
    ];
}

function get_or_create_guest_user($guestIdStr = null, $displayName = 'Guest') {
    global $pdo;
    if (!$pdo) {
        $pdo = DB::getInstance();
    }
    if (!$pdo) {
        return 1;
    }

    $cleanName = mb_substr(strip_tags($displayName ?: 'Guest'), 0, 32, 'UTF-8');
    if (empty($cleanName)) {
        $cleanName = 'Guest';
    }

    $uniqueKey = $guestIdStr ? preg_replace('/[^a-zA-Z0-9_-]/', '', $guestIdStr) : '';
    if (empty($uniqueKey)) {
        $uniqueKey = 'guest_' . bin2hex(random_bytes(6));
    }

    $email = strtolower($uniqueKey) . '@mondoflix.guest';

    try {
        $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            // Update username if name was customized
            if ($cleanName !== 'Guest' && $cleanName !== $existing['username']) {
                $upd = $pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
                $upd->execute([$cleanName, $existing['id']]);
            }
            return (int)$existing['id'];
        }

        $dummyPass = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')");
        $stmt->execute([$cleanName, $email, $dummyPass]);
        return (int)$pdo->lastInsertId();
    } catch (Throwable $e) {
        error_log('[Guest Auth Error] ' . $e->getMessage());
        // Fallback to first user in db if exists
        try {
            $stmt = $pdo->query("SELECT id FROM users LIMIT 1");
            $first = $stmt->fetchColumn();
            if ($first) return (int)$first;
        } catch (Throwable $e2) {}
        return 1;
    }
}

function get_optional_auth() {
    $token = get_bearer_token();
    if ($token) {
        $payload = JWT::decode($token);
        if ($payload && isset($payload['user_id'])) {
            return [
                'user_id' => $payload['user_id'],
                'username' => $payload['username'] ?? 'User',
                'is_guest' => false
            ];
        }
    }

    // Guest fallback: read guest headers or cookie
    $guestId = $_SERVER['HTTP_X_GUEST_ID'] ?? ($_COOKIE['mondoflix_guest_id'] ?? null);
    $guestName = $_SERVER['HTTP_X_GUEST_NAME'] ?? ($_COOKIE['mondoflix_guest_name'] ?? 'Guest');
    
    // Resolve/create user ID in database so foreign keys work
    $dbUserId = get_or_create_guest_user($guestId, $guestName);

    return [
        'user_id' => $dbUserId,
        'username' => $guestName,
        'is_guest' => true
    ];
}

function require_admin() {
    $user = require_auth();
    $user_id = is_array($user) ? $user['user_id'] : $user;
    global $pdo;
    if (!$pdo) {
        $pdo = DB::getInstance();
    }
    
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $role = $stmt->fetchColumn();
    
    if ($role !== 'admin') {
        json_response(['error' => 'Forbidden: Admins only'], 403);
    }
    
    return ['user_id' => $user_id, 'role' => $role];
}


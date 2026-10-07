<?php
require_once __DIR__ . '/config.php';

class JWT {
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64url_decode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }

    public static function encode($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['exp'] = time() + (30 * 24 * 60 * 60); // 30 days
        
        $base64UrlHeader = self::base64url_encode($header);
        $base64UrlPayload = self::base64url_encode(json_encode($payload));
        
        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
        $base64UrlSignature = self::base64url_encode($signature);
        
        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function decode($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        
        list($header64, $payload64, $signature64) = $parts;
        
        $signature = self::base64url_decode($signature64);
        $expectedSignature = hash_hmac('sha256', $header64 . "." . $payload64, JWT_SECRET, true);
        
        if (!hash_equals($signature, $expectedSignature)) return null;
        
        $payload = json_decode(self::base64url_decode($payload64), true);
        if (isset($payload['exp']) && $payload['exp'] < time()) return null;
        
        return $payload;
    }
}

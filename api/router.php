<?php
// router.php for PHP built-in server (dev mode)
if (php_sapi_name() === 'cli-server') {
    $path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
    $ext = pathinfo($path, PATHINFO_EXTENSION);
    
    // Serve static files if they exist
    if (in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'css', 'js', 'html', 'json', 'ico', 'svg']) && file_exists(__DIR__ . $path)) {
        return false; // let the built-in server handle the static file
    }
}

// Otherwise, route to index.php
require __DIR__ . '/index.php';

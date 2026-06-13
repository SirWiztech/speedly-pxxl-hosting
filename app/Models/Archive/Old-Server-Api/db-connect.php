<?php
// Load environment variables
require_once __DIR__ . '/env_loader.php';

$host = getenv('DB_HOST') ?: 'localhost';
$username = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS') ?: '';
$database = getenv('DB_NAME') ?: 'speedly_new';

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]));
}

// Set charset to handle special characters
$conn->set_charset("utf8mb4");

// Set timezone
date_default_timezone_set('Africa/Lagos');

// Set session cookie parameters to work across the entire domain
if (session_status() === PHP_SESSION_NONE) {
    // Set cookie path to root to ensure session persists across all subdirectories
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',  // Empty means current domain
        'secure' => false,  // Set to true if using HTTPS (you are, so set to true)
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}
?>
<?php
session_start();
require_once 'db-connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];

$query = "DELETE FROM notifications WHERE user_id = ? AND is_read = 0";
$stmt = $conn->prepare($query);
$stmt->bind_param("s", $user_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Notifications cleared']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to clear notifications']);
}
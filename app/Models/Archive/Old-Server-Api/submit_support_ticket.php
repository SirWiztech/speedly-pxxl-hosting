<?php
header('Content-Type: application/json');

session_start();

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
    exit;
}

require_once 'db-connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user_id = $_SESSION['user_id'];
    $user_name = $_SESSION['fullname'] ?? '';
    
    $category = trim($_POST['category'] ?? '');
    $subject = trim($_POST['subject'] ?? '');
    $message = trim($_POST['message'] ?? '');
    $priority = trim($_POST['priority'] ?? 'normal');
    
    // Validation
    $errors = [];
    
    if (empty($category)) {
        $errors[] = "Category is required";
    }
    
    if (empty($subject) || strlen($subject) < 5) {
        $errors[] = "Subject must be at least 5 characters";
    }
    
    if (empty($message) || strlen($message) < 20) {
        $errors[] = "Message must be at least 20 characters";
    }
    
    if (!empty($errors)) {
        echo json_encode(['status' => 'error', 'message' => implode('. ', $errors)]);
        exit;
    }
    
    try {
        // Generate UUID for ticket
        $ticket_id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
        
        // Generate ticket number
        $ticket_number = 'TKT-' . strtoupper(substr(md5(uniqid()), 0, 8));
        
        // Map priority
        $priorityMap = [
            'High' => 'urgent',
            'Normal' => 'medium',
            'Low' => 'low'
        ];
        $priorityValue = $priorityMap[$priority] ?? 'medium';
        
        // Insert into support_tickets
        $insertQuery = "INSERT INTO support_tickets (id, ticket_number, user_id, subject, category, priority, status, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, 'open', NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param("ssssss", $ticket_id, $ticket_number, $user_id, $subject, $category, $priorityValue);
        
        if ($insertStmt->execute()) {
            // Also create a dispute entry for admin tracking
            $dispute_id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
            $dispute_number = 'DSP-' . strtoupper(substr(md5(uniqid()), 0, 8));
            
            $disputeQuery = "INSERT INTO disputes (id, dispute_number, raised_by, dispute_type, subject, description, status, priority, created_at) 
                            VALUES (?, ?, ?, ?, ?, ?, 'open', ?, NOW())";
            $disputeStmt = $conn->prepare($disputeQuery);
            $disputeStmt->bind_param("sssssss", $dispute_id, $dispute_number, $user_id, $category, $subject, $message, $priorityValue);
            $disputeStmt->execute();
            
            // Add the first message to dispute_messages
            $message_id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
            $msgQuery = "INSERT INTO dispute_messages (id, dispute_id, sender_id, message, created_at) 
                        VALUES (?, ?, ?, ?, NOW())";
            $msgStmt = $conn->prepare($msgQuery);
            $msgStmt->bind_param("ssss", $message_id, $dispute_id, $user_id, $message);
            $msgStmt->execute();
            
            // Create notification for admin
            $notifId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
            $notifMessage = "New support ticket from {$user_name}: [{$category}] {$subject}";
            
            // Get admin user_id
            $adminQuery = "SELECT id FROM users WHERE role = 'admin' LIMIT 1";
            $adminResult = $conn->query($adminQuery);
            $adminData = $adminResult->fetch_assoc();
            $admin_id = $adminData['id'] ?? 'c1d76081-1370-11f1-8601-5820b173055a';
            
            $notifQuery = "INSERT INTO notifications (id, user_id, type, title, message, created_at) 
                          VALUES (?, ?, 'support_ticket', 'New Support Ticket', ?, NOW())";
            $notifStmt = $conn->prepare($notifQuery);
            $notifStmt->bind_param("sss", $notifId, $admin_id, $notifMessage);
            $notifStmt->execute();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Your support request has been submitted successfully! Our team will respond within 24 hours.',
                'ticket_number' => $ticket_number,
                'dispute_id' => $dispute_id
            ]);
        } else {
            throw new Exception($insertStmt->error);
        }
        
    } catch (Exception $e) {
        error_log("Support ticket error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to submit support ticket. Please try again.'
        ]);
    }
    
    $conn->close();
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid request method'
    ]);
}
?>

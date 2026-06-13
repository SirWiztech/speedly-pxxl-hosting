<?php
header('Content-Type: application/json');

session_start();

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
    exit;
}

require_once 'db-connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $action = $_POST['action'] ?? '';
    $withdrawal_id = $_POST['withdrawal_id'] ?? '';
    $admin_id = $_SESSION['admin_id'] ?? '';
    $rejection_reason = trim($_POST['rejection_reason'] ?? '');
    
    if (empty($withdrawal_id) || empty($action)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
        exit;
    }
    
    try {
        // Get withdrawal details
        $getQuery = "SELECT dw.*, dp.user_id as driver_user_id, u.full_name as driver_name
                     FROM driver_withdrawals dw
                     JOIN driver_profiles dp ON dw.driver_id = dp.id
                     JOIN users u ON dp.user_id = u.id
                     WHERE dw.id = ?";
        $getStmt = $conn->prepare($getQuery);
        $getStmt->bind_param("s", $withdrawal_id);
        $getStmt->execute();
        $withdrawalResult = $getStmt->get_result();
        
        if ($withdrawalResult->num_rows === 0) {
            echo json_encode(['status' => 'error', 'message' => 'Withdrawal not found']);
            exit;
        }
        
        $withdrawal = $withdrawalResult->fetch_assoc();
        $driver_user_id = $withdrawal['driver_user_id'];
        $driver_name = $withdrawal['driver_name'];
        $amount = $withdrawal['amount'];
        
        if ($withdrawal['status'] !== 'pending') {
            echo json_encode(['status' => 'error', 'message' => 'This withdrawal has already been processed']);
            exit;
        }
        
        if ($action === 'approve') {
            // Update withdrawal status
            $updateQuery = "UPDATE driver_withdrawals 
                           SET status = 'approved', processed_by = ?, processed_at = NOW() 
                           WHERE id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param("ss", $admin_id, $withdrawal_id);
            
            if ($updateStmt->execute()) {
                // Create notification for driver
                $notifId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
                $notifMessage = "Your withdrawal request of ₦" . number_format($amount, 2) . " has been approved and will be transferred to your bank account shortly.";
                
                $notifQuery = "INSERT INTO notifications (id, user_id, type, title, message, created_at) 
                              VALUES (?, ?, 'withdrawal', 'Withdrawal Approved', ?, NOW())";
                $notifStmt = $conn->prepare($notifQuery);
                $notifStmt->bind_param("sss", $notifId, $driver_user_id, $notifMessage);
                $notifStmt->execute();
                
                // Log activity
                $logId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
                $logQuery = "INSERT INTO admin_activity_logs (id, admin_id, action, entity_type, entity_id, new_values, ip_address, created_at)
                            VALUES (?, ?, 'approve_withdrawal', 'withdrawal', ?, ?, ?, NOW())";
                $logStmt = $conn->prepare($logQuery);
                $logStmt->bind_param("sssss", $logId, $admin_id, $withdrawal_id, json_encode(['status' => 'approved', 'amount' => $amount]), $_SERVER['REMOTE_ADDR'] ?? '');
                $logStmt->execute();
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Withdrawal approved successfully!'
                ]);
            }
            
        } elseif ($action === 'reject') {
            if (empty($rejection_reason)) {
                echo json_encode(['status' => 'error', 'message' => 'Please provide a reason for rejection']);
                exit;
            }
            
            // Update withdrawal status
            $updateQuery = "UPDATE driver_withdrawals 
                           SET status = 'rejected', processed_by = ?, processed_at = NOW(), rejection_reason = ? 
                           WHERE id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param("sss", $admin_id, $rejection_reason, $withdrawal_id);
            
            if ($updateStmt->execute()) {
                // Create notification for driver
                $notifId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
                $notifMessage = "Your withdrawal request of ₦" . number_format($amount, 2) . " has been rejected. Reason: " . $rejection_reason;
                
                $notifQuery = "INSERT INTO notifications (id, user_id, type, title, message, created_at) 
                              VALUES (?, ?, 'withdrawal', 'Withdrawal Rejected', ?, NOW())";
                $notifStmt = $conn->prepare($notifQuery);
                $notifStmt->bind_param("sss", $notifId, $driver_user_id, $notifMessage);
                $notifStmt->execute();
                
                // Log activity
                $logId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
                $logQuery = "INSERT INTO admin_activity_logs (id, admin_id, action, entity_type, entity_id, new_values, ip_address, created_at)
                            VALUES (?, ?, 'reject_withdrawal', 'withdrawal', ?, ?, ?, NOW())";
                $logStmt = $conn->prepare($logQuery);
                $logStmt->bind_param("sssss", $logId, $admin_id, $withdrawal_id, json_encode(['status' => 'rejected', 'amount' => $amount, 'reason' => $rejection_reason]), $_SERVER['REMOTE_ADDR'] ?? '');
                $logStmt->execute();
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Withdrawal rejected successfully!'
                ]);
            }
            
        } elseif ($action === 'mark_paid') {
            // Update withdrawal status to paid
            $updateQuery = "UPDATE driver_withdrawals 
                           SET status = 'paid', processed_by = ?, processed_at = NOW() 
                           WHERE id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param("ss", $admin_id, $withdrawal_id);
            
            if ($updateStmt->execute()) {
                // Deduct from driver's wallet balance (record as withdrawn)
                // The wallet balance calculation is: earnings - withdrawals
                // So we just need to update the withdrawal status to 'paid'
                // which already excludes it from available balance
                
                // Log the payout transaction
                $txnId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
                $txnQuery = "INSERT INTO wallet_transactions (id, user_id, transaction_type, amount, reference, description, created_at)
                            VALUES (?, ?, 'driver_payout', ?, ?, ?, NOW())";
                $txnStmt = $conn->prepare($txnQuery);
                $reference = 'WD-' . strtoupper(substr($withdrawal_id, -8));
                $description = "Driver withdrawal to " . ($withdrawal['bank_name'] ?? 'bank');
                $txnStmt->bind_param("ssdss", $txnId, $driver_user_id, $amount, $reference, $description);
                $txnStmt->execute();
                
                // Create notification for driver
                $notifId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
                $notifMessage = "Your withdrawal of ₦" . number_format($amount, 2) . " has been processed and transferred to your bank account.";
                
                $notifQuery = "INSERT INTO notifications (id, user_id, type, title, message, created_at) 
                              VALUES (?, ?, 'withdrawal', 'Withdrawal Complete', ?, NOW())";
                $notifStmt = $conn->prepare($notifQuery);
                $notifStmt->bind_param("sss", $notifId, $driver_user_id, $notifMessage);
                $notifStmt->execute();
                
                // Log activity
                $logId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
                $logQuery = "INSERT INTO admin_activity_logs (id, admin_id, action, entity_type, entity_id, new_values, ip_address, created_at)
                            VALUES (?, ?, 'mark_paid_withdrawal', 'withdrawal', ?, ?, ?, NOW())";
                $logStmt = $conn->prepare($logQuery);
                $logStmt->bind_param("sssss", $logId, $admin_id, $withdrawal_id, json_encode(['status' => 'paid', 'amount' => $amount]), $_SERVER['REMOTE_ADDR'] ?? '');
                $logStmt->execute();
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Withdrawal marked as paid and wallet updated!'
                ]);
            }
            
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        }
        
    } catch (Exception $e) {
        error_log("Admin withdrawal error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to process withdrawal. Please try again.'
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

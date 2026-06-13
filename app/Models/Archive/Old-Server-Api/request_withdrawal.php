<?php
header('Content-Type: application/json');

session_start();

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'driver') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
    exit;
}

require_once 'db-connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user_id = $_SESSION['user_id'];
    
    $amount = floatval($_POST['amount'] ?? 0);
    $bank_name = trim($_POST['bank_name'] ?? '');
    $account_number = trim($_POST['account_number'] ?? '');
    $account_name = trim($_POST['account_name'] ?? '');
    
    // Validation
    $errors = [];
    
    if ($amount < 1000) {
        $errors[] = "Minimum withdrawal amount is ₦1,000";
    }
    
    if (empty($bank_name)) {
        $errors[] = "Bank name is required";
    }
    
    if (empty($account_number) || strlen($account_number) !== 10 || !ctype_digit($account_number)) {
        $errors[] = "Please enter a valid 10-digit account number";
    }
    
    if (empty($account_name)) {
        $errors[] = "Account name is required";
    }
    
    if (!empty($errors)) {
        echo json_encode(['status' => 'error', 'message' => implode('. ', $errors)]);
        exit;
    }
    
    try {
        // Get driver profile
        $driverQuery = "SELECT id, wallet_balance FROM driver_profiles WHERE user_id = ?";
        $driverStmt = $conn->prepare($driverQuery);
        $driverStmt->bind_param("s", $user_id);
        $driverStmt->execute();
        $driverResult = $driverStmt->get_result();
        
        if ($driverResult->num_rows === 0) {
            echo json_encode(['status' => 'error', 'message' => 'Driver profile not found']);
            exit;
        }
        
        $driverData = $driverResult->fetch_assoc();
        $driver_id = $driverData['id'];
        
        // Calculate actual available balance (earnings - withdrawals)
        $earningsQuery = "SELECT COALESCE(SUM(driver_payout), 0) as total_earnings 
                         FROM rides 
                         WHERE driver_id = ? AND status = 'completed'";
        $earningsStmt = $conn->prepare($earningsQuery);
        $earningsStmt->bind_param("s", $driver_id);
        $earningsStmt->execute();
        $totalEarnings = $earningsStmt->get_result()->fetch_assoc()['total_earnings'] ?? 0;
        
        $withdrawnQuery = "SELECT COALESCE(SUM(amount), 0) as total_withdrawn 
                          FROM driver_withdrawals 
                          WHERE driver_id = ? AND status IN ('approved', 'paid')";
        $withdrawnStmt = $conn->prepare($withdrawnQuery);
        $withdrawnStmt->bind_param("s", $driver_id);
        $withdrawnStmt->execute();
        $totalWithdrawn = $withdrawnStmt->get_result()->fetch_assoc()['total_withdrawn'] ?? 0;
        
        $availableBalance = $totalEarnings - $totalWithdrawn;
        
        // Check for pending withdrawals
        $pendingQuery = "SELECT COALESCE(SUM(amount), 0) as pending 
                        FROM driver_withdrawals 
                        WHERE driver_id = ? AND status = 'pending'";
        $pendingStmt = $conn->prepare($pendingQuery);
        $pendingStmt->bind_param("s", $driver_id);
        $pendingStmt->execute();
        $pendingAmount = $pendingStmt->get_result()->fetch_assoc()['pending'] ?? 0;
        
        $actualAvailable = $availableBalance - $pendingAmount;
        
        if ($amount > $actualAvailable) {
            echo json_encode([
                'status' => 'error', 
                'message' => 'Insufficient balance. Available: ₦' . number_format($actualAvailable, 2)
            ]);
            exit;
        }
        
        // Check for duplicate pending withdrawal
        $checkQuery = "SELECT id FROM driver_withdrawals 
                      WHERE driver_id = ? AND status = 'pending' AND amount = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param("sd", $driver_id, $amount);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            echo json_encode(['status' => 'error', 'message' => 'You already have a pending withdrawal request for this amount']);
            exit;
        }
        
        // Generate UUID for withdrawal
        $withdrawal_id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
        
        // Insert withdrawal request
        $insertQuery = "INSERT INTO driver_withdrawals (id, driver_id, amount, bank_name, account_number, account_name, status, created_at) 
                       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())";
        $insertStmt = $conn->prepare($insertQuery);
        $insertStmt->bind_param("ssdsss", $withdrawal_id, $driver_id, $amount, $bank_name, $account_number, $account_name);
        
        if ($insertStmt->execute()) {
            // Create notification for admin
            $notifId = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
            $notifMessage = "New withdrawal request from driver. Amount: ₦" . number_format($amount, 2);
            
            $notifQuery = "INSERT INTO notifications (id, user_id, type, title, message, created_at) 
                          VALUES (?, 'admin', 'withdrawal_request', 'New Withdrawal Request', ?, NOW())";
            $notifStmt = $conn->prepare($notifQuery);
            $adminId = 'c1d76081-1370-11f1-8601-5820b173055a'; // Default admin ID
            $notifStmt->bind_param("ss", $notifId, $notifMessage);
            $notifStmt->execute();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Withdrawal request submitted successfully! It will be processed within 24-48 hours.',
                'withdrawal_id' => $withdrawal_id
            ]);
        } else {
            throw new Exception($insertStmt->error);
        }
        
    } catch (Exception $e) {
        error_log("Withdrawal error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to process withdrawal request. Please try again.'
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

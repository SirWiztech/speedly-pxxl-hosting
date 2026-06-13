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
    
    $bank_name = trim($_POST['bank_name'] ?? '');
    $account_number = trim($_POST['account_number'] ?? '');
    $account_name = trim($_POST['account_name'] ?? '');
    
    // Validation
    $errors = [];
    
    if (empty($bank_name)) {
        $errors[] = "Bank name is required";
    }
    
    if (empty($account_number) || strlen($account_number) !== 10 || !ctype_digit($account_number)) {
        $errors[] = "Please enter a valid 10-digit account number";
    }
    
    if (empty($account_name) || strlen($account_name) < 3) {
        $errors[] = "Please enter a valid account name";
    }
    
    if (!empty($errors)) {
        echo json_encode(['status' => 'error', 'message' => implode('. ', $errors)]);
        exit;
    }
    
    try {
        // Get driver profile
        $driverQuery = "SELECT id FROM driver_profiles WHERE user_id = ?";
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
        
        // Check if bank details already exist
        $checkQuery = "SELECT id FROM driver_bank_details WHERE driver_id = ?";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bind_param("s", $driver_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // Update existing bank details
            $updateQuery = "UPDATE driver_bank_details 
                           SET bank_name = ?, account_number = ?, account_name = ?, is_default = 1, updated_at = NOW() 
                           WHERE driver_id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bind_param("ssss", $bank_name, $account_number, $account_name, $driver_id);
            
            if ($updateStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Bank details updated successfully!'
                ]);
            } else {
                throw new Exception($updateStmt->error);
            }
        } else {
            // Insert new bank details
            $bank_id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
            
            $insertQuery = "INSERT INTO driver_bank_details (id, driver_id, bank_name, account_number, account_name, is_default, created_at) 
                           VALUES (?, ?, ?, ?, ?, 1, NOW())";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bind_param("sssss", $bank_id, $driver_id, $bank_name, $account_number, $account_name);
            
            if ($insertStmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Bank details saved successfully!'
                ]);
            } else {
                throw new Exception($insertStmt->error);
            }
        }
        
    } catch (Exception $e) {
        error_log("Bank details error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to save bank details. Please try again.'
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

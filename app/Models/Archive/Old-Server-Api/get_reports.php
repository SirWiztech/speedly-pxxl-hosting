<?php
header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/db-connect.php';

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
    exit;
}

$period = $_GET['period'] ?? 'daily';

try {
    // Calculate date range based on period
    $dateFormat = '%Y-%m-%d';
    switch ($period) {
        case 'weekly':
            $startDate = date('Y-m-d', strtotime('-7 days'));
            break;
        case 'monthly':
            $startDate = date('Y-m-d', strtotime('-30 days'));
            $dateFormat = '%Y-%m-%d';
            break;
        case 'yearly':
            $startDate = date('Y-m-d', strtotime('-365 days'));
            $dateFormat = '%Y-%m';
            break;
        default: // daily
            $startDate = date('Y-m-d', strtotime('-7 days'));
    }
    
    // Get rides statistics
    $ridesQuery = "SELECT 
                    COUNT(*) as total_rides,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_rides,
                    SUM(CASE WHEN status = 'cancelled_by_client' OR status = 'cancelled_by_driver' OR status = 'cancelled_by_admin' THEN 1 ELSE 0 END) as cancelled_rides,
                    SUM(CASE WHEN status = 'pending' OR status = 'accepted' OR status = 'ongoing' THEN 1 ELSE 0 END) as active_rides
                   FROM rides 
                   WHERE created_at >= ?";
    $ridesStmt = $conn->prepare($ridesQuery);
    $ridesStmt->bind_param("s", $startDate);
    $ridesStmt->execute();
    $ridesResult = $ridesStmt->get_result()->fetch_assoc();
    
    // Get revenue statistics
    $revenueQuery = "SELECT 
                      SUM(total_fare) as total_revenue,
                      SUM(driver_payout) as total_driver_payout,
                      SUM(platform_commission) as platform_earnings
                     FROM rides 
                     WHERE created_at >= ? AND payment_status = 'paid'";
    $revenueStmt = $conn->prepare($revenueQuery);
    $revenueStmt->bind_param("s", $startDate);
    $revenueStmt->execute();
    $revenueResult = $revenueStmt->get_result()->fetch_assoc();
    
    // Get user statistics
    $userQuery = "SELECT 
                   COUNT(*) as total_users,
                   SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as clients,
                   SUM(CASE WHEN role = 'driver' THEN 1 ELSE 0 END) as drivers
                  FROM users 
                  WHERE created_at >= ?";
    $userStmt = $conn->prepare($userQuery);
    $userStmt->bind_param("s", $startDate);
    $userStmt->execute();
    $userResult = $userStmt->get_result()->fetch_assoc();
    
    // Get chart data
    $chartQuery = "SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as rides,
                    SUM(total_fare) as revenue
                   FROM rides 
                   WHERE created_at >= ?
                   GROUP BY DATE(created_at)
                   ORDER BY date ASC
                   LIMIT 30";
    $chartStmt = $conn->prepare($chartQuery);
    $chartStmt->bind_param("s", $startDate);
    $chartStmt->execute();
    $chartResult = $chartStmt->get_result();
    
    $chartData = [];
    $chartLabels = [];
    $chartValues = [];
    while ($row = $chartResult->fetch_assoc()) {
        $chartLabels[] = date('M d', strtotime($row['date']));
        $chartValues[] = floatval($row['revenue'] ?? 0);
    }
    
    // Get top drivers
    $topDriversQuery = "SELECT 
                        u.full_name,
                        COUNT(r.id) as ride_count,
                        SUM(r.driver_payout) as earnings
                       FROM driver_profiles dp
                       JOIN users u ON dp.user_id = u.id
                       LEFT JOIN rides r ON dp.id = r.driver_id AND r.created_at >= ? AND r.status = 'completed'
                       GROUP BY dp.id
                       ORDER BY earnings DESC
                       LIMIT 5";
    $topDriversStmt = $conn->prepare($topDriversQuery);
    $topDriversStmt->bind_param("s", $startDate);
    $topDriversStmt->execute();
    $topDriversResult = $topDriversStmt->get_result();
    
    $topDrivers = [];
    while ($row = $topDriversResult->fetch_assoc()) {
        $topDrivers[] = [
            'name' => $row['full_name'],
            'rides' => $row['ride_count'] ?? 0,
            'earnings' => floatval($row['earnings'] ?? 0)
        ];
    }
    
    // Calculate average fare
    $avgFareQuery = "SELECT AVG(total_fare) as avg_fare FROM rides WHERE created_at >= ? AND status = 'completed'";
    $avgFareStmt = $conn->prepare($avgFareQuery);
    $avgFareStmt->bind_param("s", $startDate);
    $avgFareStmt->execute();
    $avgFare = $avgFareStmt->get_result()->fetch_assoc()['avg_fare'] ?? 0;
    
    echo json_encode([
        'success' => true,
        'period' => $period,
        'statistics' => [
            'total_rides' => (int)($ridesResult['total_rides'] ?? 0),
            'completed_rides' => (int)($ridesResult['completed_rides'] ?? 0),
            'cancelled_rides' => (int)($ridesResult['cancelled_rides'] ?? 0),
            'active_rides' => (int)($ridesResult['active_rides'] ?? 0),
            'total_revenue' => floatval($revenueResult['total_revenue'] ?? 0),
            'total_driver_payout' => floatval($revenueResult['total_driver_payout'] ?? 0),
            'platform_earnings' => floatval($revenueResult['platform_earnings'] ?? 0),
            'new_users' => (int)($userResult['total_users'] ?? 0),
            'new_clients' => (int)($userResult['clients'] ?? 0),
            'new_drivers' => (int)($userResult['drivers'] ?? 0),
            'average_fare' => floatval($avgFare),
            'completion_rate' => 0,
        ],
        'chart' => [
            'labels' => $chartLabels,
            'values' => $chartValues
        ],
        'top_drivers' => $topDrivers
    ]);
    
} catch (Exception $e) {
    error_log("Reports API error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load reports: ' . $e->getMessage()
    ]);
}

$conn->close();
?>

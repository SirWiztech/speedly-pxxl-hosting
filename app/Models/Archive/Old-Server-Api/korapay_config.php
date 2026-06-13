<?php
// SERVER/API/korapay_config.php
require_once __DIR__ . '/db-connect.php';

class KoraPayConfig {
    private $conn;
    public $settings = []; // Made public for access in webhook
    
    public function __construct($conn) {
        $this->conn = $conn;
        $this->loadSettings();
    }
    
    private function loadSettings() {
        $query = "SELECT setting_key, setting_value FROM system_settings 
                  WHERE setting_key IN ('korapay_secret_key', 'korapay_public_key', 'korapay_environment', 'korapay_webhook_secret')";
        $result = $this->conn->query($query);
        while ($row = $result->fetch_assoc()) {
            $this->settings[$row['setting_key']] = $row['setting_value'];
        }
    }
    
    public function getBaseUrl() {
        // Live and Sandbox use the same API endpoint
        return 'https://api.korapay.com/merchant/api/v1';
    }
    
    public function getSecretKey() {
        return $this->settings['korapay_secret_key'] ?? '';
    }
    
    public function getPublicKey() {
        return $this->settings['korapay_public_key'] ?? '';
    }
    
    public function getWebhookSecret() {
        return $this->settings['korapay_webhook_secret'] ?? '';
    }
    
    public function getHeaders($useSecretKey = true) {
        $key = $useSecretKey ? $this->getSecretKey() : $this->getPublicKey();
        return [
            'Authorization: Bearer ' . $key,
            'Content-Type: application/json'
        ];
    }
    
    public function isLiveMode() {
        return ($this->settings['korapay_environment'] ?? 'sandbox') === 'live';
    }
}
?>